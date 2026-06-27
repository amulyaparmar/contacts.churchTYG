import { randomUUID } from "node:crypto";

import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

type JsonRecord = Record<string, unknown>;

export type SmsBlastStatus = "draft" | "queued" | "sent" | "failed";
export type SmsBlastAudienceMode = "all" | "specific";

export type SmsBlastAudienceInput = {
  mode?: SmsBlastAudienceMode;
  specificNumber?: string | null;
  specificNumbers?: string[] | null;
  contactIds?: string[] | null;
  filter?: string | null;
};

export type SmsBlast = {
  id: string;
  title: string;
  audience: string;
  channel: "sms";
  status: SmsBlastStatus;
  message: string;
  messages: string[];
  estimatedRecipients: number | null;
  createdAt: string;
  sentAt: string | null;
  scheduledAt: string | null;
  errorMessage: string | null;
  deliveryLog: string | null;
};

export type CreateSmsBlastInput = {
  title: string;
  message?: string;
  messages?: string[];
  audience?: string;
  status?: SmsBlastStatus;
  scheduledAt?: string | null;
  audienceMode?: SmsBlastAudienceMode;
  specificNumber?: string | null;
  specificNumbers?: string[] | null;
  contactIds?: string[] | null;
  audienceFilter?: string | null;
};

const SMS_BLASTS_TABLE = "sms_blasts";
const LEADS_TABLE = "leads";
const DEFAULT_AUDIENCE = "@detroitmetromen contacts";
const DETROIT_METRO_MEN_BUSINESS_ID = "detroitmetromen";

type BlastProvider = "photon-v2" | "photon" | "twilio";

type BlastRecipient = {
  id: string;
  name: string;
  phone: string;
  provider: BlastProvider;
  suppressed: boolean;
  suppressionReason: string | null;
  filterText: string;
};

type NormalizedSmsBlastAudienceInput = {
  mode: SmsBlastAudienceMode;
  specificNumber: string | null;
  specificNumbers: string[];
  contactIds: string[];
  filter: string | null;
};

type BlastDeliveryResult = {
  leadId: string;
  phone: string;
  provider: BlastProvider;
  status: "sent" | "failed" | "skipped";
  messagePartIndex: number | null;
  messageId?: string;
  error?: string;
};

type BlastDeliverySummary = {
  audienceHandle: "@detroitmetromen";
  businessId: typeof DETROIT_METRO_MEN_BUSINESS_ID;
  audienceMode: SmsBlastAudienceMode;
  specificNumber: string | null;
  specificNumbers: string[];
  contactIds: string[];
  filter: string | null;
  messageParts: number;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  providers: BlastProvider[];
  results: BlastDeliveryResult[];
};

type SpectrumApp = Awaited<ReturnType<typeof Spectrum>>;

let spectrumAppPromise: Promise<SpectrumApp> | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function pickNumber(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function pickBoolean(record: JsonRecord | undefined, keys: string[]) {
  if (!record) return false;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "1"].includes(normalized)) return true;
    }
  }

  return false;
}

function pickStringArray(record: JsonRecord | undefined, keys: string[]) {
  if (!record) return [];

  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" || typeof item === "number" ? String(item).trim() : ""))
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeMessageParts(messages: unknown, fallback = "") {
  const parts = Array.isArray(messages)
    ? messages
    : typeof messages === "string"
      ? [messages]
      : [];
  const normalized = parts
    .map((message) => (typeof message === "string" || typeof message === "number" ? String(message).trim() : ""))
    .filter(Boolean);

  if (normalized.length > 0) return normalized;
  return fallback.trim() ? [fallback.trim()] : [];
}

function getBlastMessageParts(row: JsonRecord) {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const message = pickString(row, ["message", "body", "text", "content"]);
  return normalizeMessageParts(metadata.messageParts, message);
}

function normalizePhoneList(values?: string[] | null) {
  return Array.from(new Set((values ?? []).map((value) => normalizePhone(value)).filter(Boolean)));
}

function normalizeIdList(values?: string[] | null) {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

function normalizeAudienceInput(input?: SmsBlastAudienceInput): NormalizedSmsBlastAudienceInput {
  const mode = input?.mode === "specific" ? "specific" : "all";
  const specificNumbers = normalizePhoneList([...(input?.specificNumbers ?? []), input?.specificNumber ?? ""]);
  const contactIds = normalizeIdList(input?.contactIds);

  return {
    mode,
    specificNumber: specificNumbers[0] ?? null,
    specificNumbers,
    contactIds,
    filter: input?.filter?.trim() || null
  };
}

function getAudienceInputFromMetadata(metadata: JsonRecord): NormalizedSmsBlastAudienceInput {
  const requestedAudience = isRecord(metadata.requestedAudience) ? metadata.requestedAudience : {};
  const mode = pickString(requestedAudience, ["mode"]) === "specific" ? "specific" : "all";

  return normalizeAudienceInput({
    mode,
    specificNumber: pickString(requestedAudience, ["specificNumber", "phone"]),
    specificNumbers: pickStringArray(requestedAudience, ["specificNumbers", "phones"]),
    contactIds: pickStringArray(requestedAudience, ["contactIds", "leadIds"]),
    filter: pickString(requestedAudience, ["filter"])
  });
}

function describeAudience(input?: SmsBlastAudienceInput) {
  const audience = normalizeAudienceInput(input);
  if (audience.mode === "specific") {
    const total = audience.contactIds.length + audience.specificNumbers.length;
    return total > 0 ? `Specific contacts (${total})` : "Specific contacts";
  }
  if (audience.filter) return `${DEFAULT_AUDIENCE} filtered by "${audience.filter}"`;
  return DEFAULT_AUDIENCE;
}

function normalizePhone(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.startsWith("+") ? `+${trimmed.slice(1).replace(/\D/g, "")}` : trimmed.replace(/\D/g, "");
}

function getNestedRecord(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }

  return {};
}

function getSupabaseConfig() {
  const url =
    process.env.CONTACTS_TYG_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_CONTACTS_TYG_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.CONTACTS_TYG_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.CONTACTS_TYG_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_CONTACTS_TYG_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return {
    url: url.replace(/\/+$/, ""),
    key
  };
}

function supabaseHeaders(config: { key: string }, extra?: HeadersInit) {
  return {
    apikey: config.key,
    authorization: `Bearer ${config.key}`,
    accept: "application/json",
    ...extra
  };
}

async function parseSupabaseResponse(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  if (Array.isArray(payload)) return payload.filter(isRecord);
  return isRecord(payload) ? [payload] : [];
}

function getPhotonV2Config() {
  const projectId = process.env.PHOTON_V2_PROJECT_ID ?? process.env.SPECTRUM_PROJECT_ID ?? process.env.PROJECT_ID;
  const projectSecret =
    process.env.PHOTON_V2_SECRET_KEY ??
    process.env.PHOTON_V2_PROJECT_SECRET ??
    process.env.SPECTRUM_PROJECT_SECRET ??
    process.env.PROJECT_SECRET;
  const phoneNumber =
    process.env.PHOTON_V2_IMESSAGE_NUMBER ??
    process.env.PHOTON_V2_DISPLAY_NUMBER ??
    process.env.SPECTRUM_IMESSAGE_NUMBER ??
    process.env.NEXT_PUBLIC_PHOTON_V2_DISPLAY_NUMBER;

  if (!projectId?.trim()) throw new Error("Photon V2 project id is not configured.");
  if (!projectSecret?.trim()) throw new Error("Photon V2 secret key is not configured.");

  return {
    projectId: projectId.trim(),
    projectSecret: projectSecret.trim(),
    phoneNumber: phoneNumber?.trim() || null
  };
}

async function getSpectrumApp() {
  if (!spectrumAppPromise) {
    const config = getPhotonV2Config();
    spectrumAppPromise = Spectrum({
      projectId: config.projectId,
      projectSecret: config.projectSecret,
      providers: [imessage.config()]
    }).catch((error) => {
      spectrumAppPromise = null;
      throw error;
    });
  }

  return spectrumAppPromise;
}

async function sendPhotonV2BlastMessage(to: string, message: string) {
  const config = getPhotonV2Config();
  const phone = normalizePhone(to);
  if (!phone) throw new Error("Photon V2 recipient phone number is required.");

  const app = await getSpectrumApp();
  const platform = imessage(app);
  const user = await platform.user(phone);
  const openSpace = platform.space as unknown as (user: unknown, options?: { phone: string }) => Promise<{ send: (message: string) => Promise<unknown> }>;
  const space = config.phoneNumber ? await openSpace(user, { phone: config.phoneNumber }) : await openSpace(user);
  const sent = await space.send(message);

  return {
    id: (sent as { id?: string } | undefined)?.id,
    provider: "photon-v2" as const
  };
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiKey = process.env.TWILIO_API_KEY?.trim();
  const apiSecret = process.env.TWILIO_API_SECRET?.trim();
  const from = process.env.TWILIO_CALLER_ID?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  if (!accountSid) throw new Error("Twilio account SID is not configured.");
  if (!(apiKey && apiSecret) && !authToken) throw new Error("Twilio auth token or API key credentials are not configured.");
  if (!messagingServiceSid && !from) throw new Error("Twilio caller ID or messaging service SID is not configured.");

  return {
    accountSid,
    username: apiKey || accountSid,
    password: apiSecret || authToken || "",
    from,
    messagingServiceSid
  };
}

async function sendTwilioBlastMessage(to: string, message: string) {
  const config = getTwilioConfig();
  const body = new URLSearchParams({
    To: to,
    Body: message
  });

  if (config.messagingServiceSid) {
    body.set("MessagingServiceSid", config.messagingServiceSid);
  } else if (config.from) {
    body.set("From", config.from);
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = isRecord(payload) ? pickString(payload, ["message", "error"]) : "";
    throw new Error(detail || `Twilio send failed with ${response.status}.`);
  }

  return {
    id: isRecord(payload) ? pickString(payload, ["sid"]) : "",
    provider: "twilio" as const
  };
}

function getPhotonConfig() {
  const rawApiKey = process.env.PHOTON_API_KEY?.trim();
  const serverUrl =
    process.env.PHOTON_SERVER_URL?.trim() ||
    process.env.IMESSAGE_SERVER_URL?.trim() ||
    (rawApiKey && /^https?:\/\//i.test(rawApiKey) ? rawApiKey : "");
  const apiKey = (rawApiKey && /^https?:\/\//i.test(rawApiKey) ? process.env.IMESSAGE_API_KEY : rawApiKey || process.env.IMESSAGE_API_KEY)?.trim();

  if (!serverUrl) throw new Error("Photon server URL is not configured.");

  return {
    serverUrl: serverUrl.replace(/\/+$/, ""),
    apiKey
  };
}

async function sendPhotonBlastMessage(to: string, message: string) {
  const config = getPhotonConfig();
  const response = await fetch(`${config.serverUrl}/api/v1/message/text`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(config.apiKey
        ? {
            "x-api-key": config.apiKey,
            authorization: `Bearer ${config.apiKey}`
          }
        : {})
    },
    body: JSON.stringify({
      chatGuid: `any;-;${normalizePhone(to)}`,
      message,
      tempGuid: randomUUID()
    }),
    cache: "no-store"
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = isRecord(payload) ? pickString(payload, ["message", "error"]) : "";
    throw new Error(detail || `Photon send failed with ${response.status}.`);
  }

  return {
    id: isRecord(payload) ? pickString(payload, ["guid", "id", "message_guid"]) : "",
    provider: "photon" as const
  };
}

function normalizeSmsBlast(row: JsonRecord): SmsBlast {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const requestedAudience = getAudienceInputFromMetadata(metadata);
  const delivery = isRecord(metadata.delivery) ? metadata.delivery : {};
  const rawStatus = pickString(row, ["status"]).toLowerCase();
  const status: SmsBlastStatus = ["draft", "queued", "sent", "failed"].includes(rawStatus)
    ? (rawStatus as SmsBlastStatus)
    : "draft";
  const messages = getBlastMessageParts(row);
  const message = messages.join("\n\n");
  const fallbackTitle = message ? `${message.slice(0, 42)}${message.length > 42 ? "..." : ""}` : "SMS blast";
  const attempted = pickNumber(delivery, ["attempted"]);
  const sent = pickNumber(delivery, ["sent"]);
  const failed = pickNumber(delivery, ["failed"]);
  const skipped = pickNumber(delivery, ["skipped"]);
  const specificCount = requestedAudience.contactIds.length + requestedAudience.specificNumbers.length;
  const deliveryLog =
    attempted === null && sent === null && failed === null && skipped === null
      ? null
      : `${requestedAudience.mode === "specific" ? `Specific contacts${specificCount > 0 ? ` (${specificCount})` : ""}` : "@detroitmetromen"}${
          requestedAudience.filter ? ` filtered by "${requestedAudience.filter}"` : ""
        }: ${sent ?? 0} sent, ${failed ?? 0} failed, ${skipped ?? 0} skipped`;

  return {
    id: pickString(row, ["id", "blast_id"]) || crypto.randomUUID(),
    title: pickString(row, ["title", "name", "campaign"]) || fallbackTitle,
    audience: pickString(row, ["audience", "segment", "scope"]) || pickString(metadata, ["audience"]) || describeAudience(requestedAudience),
    channel: "sms",
    status,
    message,
    messages,
    estimatedRecipients:
      pickNumber(row, ["estimated_recipients", "recipient_count", "recipients"]) ??
      pickNumber(metadata, ["estimatedRecipients", "recipientCount"]),
    createdAt: pickString(row, ["created_at", "createdAt"]) || new Date().toISOString(),
    sentAt: pickString(row, ["sent_at", "sentAt", "queued_at", "queuedAt"]) || null,
    scheduledAt: pickString(row, ["scheduled_at", "scheduledAt"]) || null,
    errorMessage: pickString(row, ["error_message", "errorMessage"]) || null,
    deliveryLog
  };
}

function inferBlastProvider(lead: JsonRecord): BlastProvider {
  const details = getNestedRecord(lead, ["details"]);
  const platform = pickString(details, ["platform", "source", "channel"]).toLowerCase();

  if (platform.includes("twilio") || platform === "sms") return "twilio";
  if (platform.includes("photon-v2") || platform.includes("photonv2") || platform.includes("spectrum")) return "photon-v2";
  return "photon";
}

function getSuppressionReason(lead: JsonRecord) {
  const details = getNestedRecord(lead, ["details"]);
  const tags = pickStringArray(details, ["tags", "labels"]).map((tag) => tag.toLowerCase());
  const status = pickString(details, ["status", "kpiStatus"]).toLowerCase();
  const dndLevel = pickString(details, ["dndLevel", "dnd_level"]).toLowerCase();

  if (pickBoolean(details, ["optOut", "opt_out", "unsubscribed"])) return "Contact has opted out.";
  if (pickBoolean(details, ["doNotMessage", "do_not_message", "dnc"])) return "Contact is marked do-not-message.";
  if (dndLevel === "highest" || dndLevel === "hard") return "Contact is marked highest DND.";
  if (tags.some((tag) => ["opted_out", "do_not_message", "hard_opt_out", "dnc"].includes(tag))) return "Contact is tagged as suppressed.";
  if (/\b(opted out|unsubscribe|do not message|do not contact|dnd)\b/.test(status)) return "Contact status is suppressed.";

  return null;
}

async function listBlastRecipients(config: { url: string; key: string }) {
  const query = new URLSearchParams({
    select: "id,business_id,normalized_phone,details",
    business_id: `eq.${DETROIT_METRO_MEN_BUSINESS_ID}`,
    order: "created_at.desc",
    limit: "500"
  });
  const response = await fetch(`${config.url}/rest/v1/${encodeURIComponent(LEADS_TABLE)}?${query.toString()}`, {
    headers: supabaseHeaders(config),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Could not read ${LEADS_TABLE} for @detroitmetromen (${response.status}).`);
  }

  const rows = await parseSupabaseResponse(response);
  return rows
    .map((lead): BlastRecipient => {
      const details = getNestedRecord(lead, ["details"]);
      const phone = normalizePhone(pickString(lead, ["normalized_phone"]) || pickString(details, ["phone", "sender_id", "number"]));
      const suppressionReason = getSuppressionReason(lead);
      const name = pickString(details, ["name", "full_name"]) || phone || "Unknown contact";
      const tags = pickStringArray(details, ["tags", "labels"]).join(" ");
      const status = pickString(details, ["status", "kpiStatus"]);

      return {
        id: pickString(lead, ["id"]) || phone,
        name,
        phone,
        provider: inferBlastProvider(lead),
        suppressed: Boolean(suppressionReason),
        suppressionReason,
        filterText: [name, phone, status, tags].join(" ").toLowerCase()
      };
    })
    .filter((recipient) => recipient.id && recipient.phone);
}

export async function previewSmsBlastAudience() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for sms_blasts.");
  }

  const recipients = await listBlastRecipients(config);
  return {
    audience: DEFAULT_AUDIENCE,
    total: recipients.length,
    eligible: recipients.filter((recipient) => !recipient.suppressed).length,
    suppressed: recipients.filter((recipient) => recipient.suppressed).length,
    providers: Array.from(new Set(recipients.map((recipient) => recipient.provider))),
    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      name: recipient.name,
      phone: recipient.phone,
      provider: recipient.provider,
      suppressed: recipient.suppressed,
      suppressionReason: recipient.suppressionReason,
      filterText: recipient.filterText
    }))
  };
}

async function sendRecipient(recipient: BlastRecipient, message: string) {
  if (recipient.provider === "twilio") return sendTwilioBlastMessage(recipient.phone, message);
  if (recipient.provider === "photon-v2") return sendPhotonV2BlastMessage(recipient.phone, message);
  return sendPhotonBlastMessage(recipient.phone, message);
}

function filterBlastRecipients(recipients: BlastRecipient[], audience: NormalizedSmsBlastAudienceInput) {
  if (audience.mode === "specific") {
    if (audience.contactIds.length === 0 && audience.specificNumbers.length === 0) {
      throw new Error("Choose at least one contact or phone number.");
    }

    const contactIds = new Set(audience.contactIds);
    const specificNumbers = new Set(audience.specificNumbers);
    const selected = recipients.filter(
      (recipient) => contactIds.has(recipient.id) || specificNumbers.has(normalizePhone(recipient.phone))
    );
    const selectedPhones = new Set(selected.map((recipient) => normalizePhone(recipient.phone)));
    const manualRecipients = audience.specificNumbers
      .filter((phone) => !selectedPhones.has(phone))
      .map((phone): BlastRecipient => ({
        id: `specific:${phone}`,
        name: phone,
        phone,
        provider: "photon",
        suppressed: false,
        suppressionReason: null,
        filterText: phone
      }));

    return [...selected, ...manualRecipients];
  }

  if (!audience.filter) return recipients;
  const normalizedFilter = audience.filter.toLowerCase();
  return recipients.filter((recipient) => recipient.filterText.includes(normalizedFilter));
}

async function deliverBlast(config: { url: string; key: string }, messages: string[], input?: SmsBlastAudienceInput): Promise<BlastDeliverySummary> {
  const audience = normalizeAudienceInput(input);
  const messageParts = normalizeMessageParts(messages);
  if (messageParts.length === 0) throw new Error("Message must be at least 8 characters before sending.");

  const recipients = filterBlastRecipients(await listBlastRecipients(config), audience);
  const results: BlastDeliveryResult[] = [];

  for (const recipient of recipients) {
    if (recipient.suppressed) {
      results.push({
        leadId: recipient.id,
        phone: recipient.phone,
        provider: recipient.provider,
        status: "skipped",
        messagePartIndex: null,
        error: recipient.suppressionReason ?? "Contact is suppressed."
      });
      continue;
    }

    for (const [index, message] of messageParts.entries()) {
      try {
        const response = await sendRecipient(recipient, message);
        results.push({
          leadId: recipient.id,
          phone: recipient.phone,
          provider: recipient.provider,
          status: "sent",
          messagePartIndex: index,
          messageId: response.id
        });
      } catch (error) {
        results.push({
          leadId: recipient.id,
          phone: recipient.phone,
          provider: recipient.provider,
          status: "failed",
          messagePartIndex: index,
          error: error instanceof Error ? error.message : "Unknown delivery error."
        });
      }
    }
  }

  const attemptedRecipients = recipients.filter((recipient) => !recipient.suppressed).length;
  const failedRecipientIds = new Set(results.filter((result) => result.status === "failed").map((result) => result.leadId));
  const sentRecipientIds = new Set(results.filter((result) => result.status === "sent").map((result) => result.leadId));

  return {
    audienceHandle: "@detroitmetromen",
    businessId: DETROIT_METRO_MEN_BUSINESS_ID,
    audienceMode: audience.mode,
    specificNumber: audience.specificNumber,
    specificNumbers: audience.specificNumbers,
    contactIds: audience.contactIds,
    filter: audience.filter,
    messageParts: messageParts.length,
    attempted: attemptedRecipients,
    sent: Array.from(sentRecipientIds).filter((id) => !failedRecipientIds.has(id)).length,
    failed: failedRecipientIds.size,
    skipped: results.filter((result) => result.status === "skipped").length,
    providers: Array.from(new Set(results.map((result) => result.provider))),
    results
  };
}

async function updateSmsBlast(config: { url: string; key: string }, id: string, patch: JsonRecord) {
  const response = await fetch(`${config.url}/rest/v1/${encodeURIComponent(SMS_BLASTS_TABLE)}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "return=representation"
    }),
    body: JSON.stringify(patch),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not update sms_blasts row (${response.status}): ${detail.slice(0, 180)}`);
  }

  const rows = await parseSupabaseResponse(response);
  return rows[0] ?? patch;
}

async function getSmsBlastRow(config: { url: string; key: string }, id: string) {
  const response = await fetch(
    `${config.url}/rest/v1/${encodeURIComponent(SMS_BLASTS_TABLE)}?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    {
      headers: supabaseHeaders(config),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Could not read sms_blasts row (${response.status}).`);
  }

  const rows = await parseSupabaseResponse(response);
  const row = rows[0];
  if (!row) {
    throw new Error("SMS blast was not found.");
  }

  return row;
}

export async function deleteSmsBlast(id: string) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for sms_blasts.");
  }

  const response = await fetch(`${config.url}/rest/v1/${encodeURIComponent(SMS_BLASTS_TABLE)}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: supabaseHeaders(config),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not delete sms_blasts row (${response.status}): ${detail.slice(0, 180)}`);
  }
}

async function deliverAndUpdateSmsBlast(
  config: { url: string; key: string },
  row: JsonRecord,
  messages: string[],
  audienceInput?: SmsBlastAudienceInput
) {
  const id = pickString(row, ["id"]);
  if (!id) return row;

  const now = new Date().toISOString();
  const existingMetadata = getNestedRecord(row, ["metadata"]);
  const audience = audienceInput ?? getAudienceInputFromMetadata(existingMetadata);

  try {
    const delivery = await deliverBlast(config, messages, audience);
    const status: SmsBlastStatus = delivery.sent > 0 && delivery.failed === 0 ? "sent" : "failed";
    const provider = delivery.providers.length === 1 ? delivery.providers[0] : delivery.providers.join(",");
    const errorMessage =
      status === "failed"
        ? delivery.sent === 0
          ? delivery.results.find((result) => result.error)?.error || "No messages were sent."
          : `${delivery.failed} messages failed.`
        : null;

    return updateSmsBlast(config, id, {
      status,
      provider,
      estimated_recipients: delivery.attempted,
      sent_at: status === "sent" ? now : null,
      failed_at: status === "failed" ? now : null,
      scheduled_at: null,
      error_message: errorMessage,
      metadata: {
        ...existingMetadata,
        requestedAudience: {
          mode: delivery.audienceMode,
          specificNumber: delivery.specificNumber,
          specificNumbers: delivery.specificNumbers,
          contactIds: delivery.contactIds,
          filter: delivery.filter
        },
        delivery
      }
    });
  } catch (error) {
    return updateSmsBlast(config, id, {
      status: "failed",
      failed_at: now,
      scheduled_at: null,
      error_message: error instanceof Error ? error.message : "Could not send SMS blast.",
      metadata: {
        ...existingMetadata,
        delivery: {
          audienceHandle: "@detroitmetromen",
          businessId: DETROIT_METRO_MEN_BUSINESS_ID,
          audienceMode: normalizeAudienceInput(audience).mode,
          specificNumber: normalizeAudienceInput(audience).specificNumber,
          specificNumbers: normalizeAudienceInput(audience).specificNumbers,
          contactIds: normalizeAudienceInput(audience).contactIds,
          filter: normalizeAudienceInput(audience).filter,
          messageParts: messages.length,
          attempted: 0,
          sent: 0,
          failed: 1,
          skipped: 0,
          providers: [],
          results: []
        }
      }
    });
  }
}

export async function sendExistingSmsBlast(id: string, audienceInput?: SmsBlastAudienceInput) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for sms_blasts.");
  }

  const row = await getSmsBlastRow(config, id);
  const messages = getBlastMessageParts(row);
  if (messages.join("").length < 8) {
    throw new Error("Message must be at least 8 characters before sending.");
  }

  const queuedAt = new Date().toISOString();
  const audience = audienceInput ?? getAudienceInputFromMetadata(getNestedRecord(row, ["metadata"]));
  const queuedRow = await updateSmsBlast(config, id, {
    status: "queued",
    queued_at: queuedAt,
    failed_at: null,
    error_message: null,
    audience: describeAudience(audience),
    metadata: {
      ...getNestedRecord(row, ["metadata"]),
      requestedAudience: audience
    }
  });

  return normalizeSmsBlast(await deliverAndUpdateSmsBlast(config, queuedRow, messages, audience));
}

export async function processDueSmsBlasts(limit = 20) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for sms_blasts.");
  }

  const now = new Date().toISOString();
  const query = new URLSearchParams({
    select: "*",
    status: "eq.queued",
    scheduled_at: `lte.${now}`,
    sent_at: "is.null",
    order: "scheduled_at.asc",
    limit: String(limit)
  });

  const response = await fetch(`${config.url}/rest/v1/${encodeURIComponent(SMS_BLASTS_TABLE)}?${query.toString()}`, {
    headers: supabaseHeaders(config),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Could not read due sms_blasts rows (${response.status}).`);
  }

  const rows = await parseSupabaseResponse(response);
  const results = [];

  for (const row of rows) {
    const messages = getBlastMessageParts(row);
    const id = pickString(row, ["id"]);

    if (!id || messages.join("").length < 8) {
      results.push({
        id,
        status: "failed",
        error: "Message must be at least 8 characters before sending."
      });
      continue;
    }

    const blast = normalizeSmsBlast(await deliverAndUpdateSmsBlast(config, row, messages));
    results.push({
      id: blast.id,
      status: blast.status,
      sentAt: blast.sentAt,
      errorMessage: blast.errorMessage
    });
  }

  return {
    checkedAt: now,
    due: rows.length,
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
    results
  };
}

export async function listSmsBlasts() {
  const config = getSupabaseConfig();
  if (!config) {
    return {
      blasts: [] as SmsBlast[],
      source: "fallback" as const,
      error: "Supabase is not configured."
    };
  }

  const response = await fetch(
    `${config.url}/rest/v1/${encodeURIComponent(SMS_BLASTS_TABLE)}?select=*&order=created_at.desc&limit=12`,
    {
      headers: supabaseHeaders(config),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return {
      blasts: [] as SmsBlast[],
      source: "fallback" as const,
      error:
        response.status === 404
          ? "sms_blasts is not available yet, so starter drafts are showing."
          : `Could not read ${SMS_BLASTS_TABLE} (${response.status}).`
    };
  }

  const payload: unknown = await response.json();
  const rows = Array.isArray(payload) ? payload.filter(isRecord) : [];

  return {
    blasts: rows.map(normalizeSmsBlast),
    source: "sms_blasts" as const,
    error: null
  };
}

export async function createSmsBlast(input: CreateSmsBlastInput) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured for sms_blasts.");
  }

  const now = new Date().toISOString();
  const scheduledAt = input.scheduledAt?.trim() || null;
  const messages = normalizeMessageParts(input.messages, input.message);
  const message = messages.join("\n\n");
  const audience = normalizeAudienceInput({
    mode: input.audienceMode,
    specificNumber: input.specificNumber,
    specificNumbers: input.specificNumbers,
    contactIds: input.contactIds,
    filter: input.audienceFilter
  });
  const row: JsonRecord = {
    title: input.title,
    audience: input.audience ?? describeAudience(audience),
    channel: "sms",
    status: input.status ?? "queued",
    message,
    created_at: now,
    metadata: {
      audienceHandle: "@detroitmetromen",
      contactSource: "contactsTYG",
      source: "contacts.church/conversations",
      savedAs: input.status ?? "queued",
      messageParts: messages,
      requestedAudience: audience,
      ...(scheduledAt ? { scheduledAt } : {})
    }
  };

  if ((input.status ?? "queued") === "queued") {
    row.queued_at = now;
  }

  if (scheduledAt) {
    row.scheduled_at = scheduledAt;
  }

  const response = await fetch(`${config.url}/rest/v1/${encodeURIComponent(SMS_BLASTS_TABLE)}`, {
    method: "POST",
    headers: supabaseHeaders(config, {
      "content-type": "application/json",
      prefer: "return=representation"
    }),
    body: JSON.stringify(row),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Could not save sms_blasts row (${response.status}): ${detail.slice(0, 180)}`);
  }

  const payload: unknown = await response.json();
  const created: JsonRecord = Array.isArray(payload)
    ? (payload.find(isRecord) ?? row)
    : isRecord(payload)
      ? payload
      : row;
  const shouldDeliverNow = (input.status ?? "queued") === "queued" && !scheduledAt;
  const finalRow = shouldDeliverNow ? await deliverAndUpdateSmsBlast(config, created, messages, audience) : created;
  return normalizeSmsBlast(finalRow);
}
