type JsonRecord = Record<string, unknown>;

export type SmsBlastStatus = "draft" | "queued" | "sent" | "failed";

export type SmsBlast = {
  id: string;
  title: string;
  audience: string;
  channel: "sms";
  status: SmsBlastStatus;
  message: string;
  estimatedRecipients: number | null;
  createdAt: string;
  sentAt: string | null;
};

export type CreateSmsBlastInput = {
  title: string;
  message: string;
  audience?: string;
  status?: SmsBlastStatus;
};

const SMS_BLASTS_TABLE = "sms_blasts";
const DEFAULT_AUDIENCE = "@detroitmetromen contacts";

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

function normalizeSmsBlast(row: JsonRecord): SmsBlast {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const rawStatus = pickString(row, ["status"]).toLowerCase();
  const status: SmsBlastStatus = ["draft", "queued", "sent", "failed"].includes(rawStatus)
    ? (rawStatus as SmsBlastStatus)
    : "draft";
  const message = pickString(row, ["message", "body", "text", "content"]);
  const fallbackTitle = message ? `${message.slice(0, 42)}${message.length > 42 ? "..." : ""}` : "SMS blast";

  return {
    id: pickString(row, ["id", "blast_id"]) || crypto.randomUUID(),
    title: pickString(row, ["title", "name", "campaign"]) || fallbackTitle,
    audience: pickString(row, ["audience", "segment", "scope"]) || pickString(metadata, ["audience"]) || DEFAULT_AUDIENCE,
    channel: "sms",
    status,
    message,
    estimatedRecipients:
      pickNumber(row, ["estimated_recipients", "recipient_count", "recipients"]) ??
      pickNumber(metadata, ["estimatedRecipients", "recipientCount"]),
    createdAt: pickString(row, ["created_at", "createdAt"]) || new Date().toISOString(),
    sentAt: pickString(row, ["sent_at", "sentAt", "queued_at", "queuedAt"]) || null
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
      error: `Could not read ${SMS_BLASTS_TABLE} (${response.status}).`
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
  const row: JsonRecord = {
    title: input.title,
    audience: input.audience ?? DEFAULT_AUDIENCE,
    channel: "sms",
    status: input.status ?? "queued",
    message: input.message,
    created_at: now,
    queued_at: now,
    metadata: {
      audienceHandle: "@detroitmetromen",
      contactSource: "contactsTYG",
      source: "contacts.church/conversations"
    }
  };

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
    throw new Error(`Could not queue sms_blasts row (${response.status}): ${detail.slice(0, 180)}`);
  }

  const payload: unknown = await response.json();
  const created: JsonRecord = Array.isArray(payload)
    ? (payload.find(isRecord) ?? row)
    : isRecord(payload)
      ? payload
      : row;
  return normalizeSmsBlast(created);
}
