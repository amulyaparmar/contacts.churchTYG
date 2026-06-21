import {
  type Contact,
  type RecordContactActivityEvent
} from "./contact-loop-crm";
import { pollScaleConvoContactQueue, normalizeScaleConvoQueueContact } from "./scaleconvo-contact-queue";

type JsonRecord = Record<string, unknown>;

const DETROIT_METRO_MEN_SCOPE = [
  "@detroitmetromen",
  "detroitmetromen",
  "detroit metro men",
  "men's conference",
  "mens conference",
  "subsplash.com/detroitmetrodistrict"
];
const GIVEAWAY_CAMPAIGN_MARKER = "#giveaway";
const HARD_DND_PHONE_DIGITS = "15862588588";

export type ContactbookPullResult = {
  source: {
    contacts: "contactsTYG" | "flux" | "mock";
    conversations: "supabase" | "flux" | "scaleconvo" | "mock";
  };
  contacts: Contact[];
  events: RecordContactActivityEvent[];
  fetchedAt: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(record: JsonRecord | undefined, keys: string[]) {
  if (!record) return "";

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
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

async function fetchSupabaseTable(table: string, query = "select=*") {
  const config = getSupabaseConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/rest/v1/${encodeURIComponent(table)}?${query}`, {
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} pull failed with ${response.status}`);
  }

  const payload: unknown = await response.json();
  return Array.isArray(payload) ? payload.filter(isRecord) : [];
}

async function tryFetchSupabaseTable(table: string, query = "select=*") {
  try {
    return await fetchSupabaseTable(table, query);
  } catch {
    return null;
  }
}

function inferStage(contact: JsonRecord): Contact["stage"] {
  const metadata = isRecord(contact.metadata) ? contact.metadata : {};
  const data = isRecord(contact.data) ? contact.data : {};
  const rawStage = pickString(metadata, ["stage", "crmStage", "contactStage"]);
  const category = pickString(metadata, ["category", "audienceType"]).toLowerCase();
  const notes = pickString(contact, ["notes"]).toLowerCase();
  const role = pickString(contact, ["role"]).toLowerCase();
  const status = pickString(data, ["status", "kpiStatus"]).toLowerCase();

  if (["conversation_engaged", "event_funnel", "future_events", "instagram_kpi"].includes(rawStage)) {
    return rawStage as Contact["stage"];
  }

  if ([category, notes, role, status].some((value) => value.includes("instagram"))) return "instagram_kpi";
  if ([category, notes, role, status].some((value) => value.includes("future") || value.includes("host"))) {
    return "future_events";
  }
  if ([category, notes, role, status].some((value) => value.includes("rsvp") || value.includes("register"))) {
    return "event_funnel";
  }

  return "conversation_engaged";
}

function normalizeContactTYG(contact: JsonRecord): Contact {
  const metadata = isRecord(contact.metadata) ? contact.metadata : {};
  const data = isRecord(contact.data) ? contact.data : {};
  const id = pickString(contact, ["id"]) || `contacts_tyg_${Math.random().toString(36).slice(2, 8)}`;
  const firstName = pickString(contact, ["first_name", "firstName"]);
  const lastName = pickString(contact, ["last_name", "lastName"]);
  const name = pickString(contact, ["name"]) || [firstName, lastName].filter(Boolean).join(" ") || "Unnamed contact";
  const phone = pickString(data, ["phone", "number", "mobile", "phoneNumber"]) || pickString(metadata, ["phone", "number"]);
  const stage = inferStage(contact);
  const category = pickString(metadata, ["category", "audienceType"]);
  const fillId = pickString(metadata, ["fillId", "fill_id", "visitorUuid", "conversationId"]) || `ct_${id.slice(0, 8)}`;

  return {
    id: `contacts_tyg_${id}`,
    fillId,
    name,
    phone,
    email: pickString(contact, ["email"]),
    stage,
    tags: Array.from(new Set(["contactsTYG", category, stage].filter(Boolean))),
    source: pickString(metadata, ["source"]) || "contactsTYG",
    nextAction: pickString(data, ["nextAction", "next_action"]) || "Review contact context",
    lastTouchAt: pickString(contact, ["updated_at", "created_at"]) || new Date().toISOString(),
    kpiStatus: pickString(data, ["kpiStatus", "status"]) || "Pulled from contacts",
    notes: pickString(contact, ["notes"]) || pickString(data, ["notes"]) || "",
    metadata: {
      conversationStatus: pickString(metadata, ["conversationStatus"]) || "Pulled",
      eventInterest: pickString(metadata, ["eventInterest"]) || pickString(data, ["eventInterest"]) || "Unknown",
      contactBookId: pickString(contact, ["contact_book_id"]),
      role: pickString(contact, ["role"]),
      linkedin: pickString(contact, ["linkedin"])
    }
  };
}

function getNestedRecord(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) return value;
  }

  return {};
}

function getExtractedValue(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (isRecord(value) && typeof value.value === "string" && value.value.trim()) return value.value.trim();
  }

  return "";
}

function getMessageText(message: JsonRecord) {
  return pickString(message, ["content", "message", "text", "body"]);
}

function getConversationCorpus(conversation: JsonRecord, contact?: Contact) {
  const messages = Array.isArray(conversation.messages) ? conversation.messages.filter(isRecord) : [];

  return [
    contact?.name,
    contact?.phone,
    contact?.email,
    contact?.source,
    contact?.metadata.businessName,
    contact?.notes,
    JSON.stringify(getNestedRecord(conversation, ["leads", "lead"])),
    JSON.stringify(getNestedRecord(conversation, ["business"])),
    ...messages.map(getMessageText)
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function isDetroitMetroMenConversation(conversation: JsonRecord, contact: Contact) {
  const corpus = getConversationCorpus(conversation, contact);
  return DETROIT_METRO_MEN_SCOPE.some((token) => corpus.includes(token));
}

function hasGiveawayCampaign(conversation: JsonRecord, contact: Contact) {
  const corpus = getConversationCorpus(conversation, contact);
  return corpus.includes(GIVEAWAY_CAMPAIGN_MARKER);
}

function hasAny(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isHardDndPhone(value: string) {
  const digits = phoneDigits(value);
  return digits === HARD_DND_PHONE_DIGITS || digits === HARD_DND_PHONE_DIGITS.slice(1);
}

function analyzeDetroitMetroMenConversation(transcript: string) {
  const normalized = transcript.toLowerCase();
  const optedOut = /\bstop\b|unsubscribe|do not send|don't send/.test(normalized);
  const registered =
    hasAny(normalized, ["yes, cave", "yes!", "yes i", "signed up", "did sign", "i registered", "i sign up"]) ||
    /yes[,!\s]+[a-z0-9 .'-]+[,!\s]+[a-z0-9._%+-]+@[a-z0-9.-]+/i.test(transcript);
  const hotInterest = hasAny(normalized, [
    "get me on the list",
    "want to learn more",
    "learn more about detroit metro men",
    "looking forward",
    "most excited",
    "food",
    "brotherhood",
    "conference"
  ]);
  const askedToSignUp = hasAny(normalized, ["did you sign up", "reply yes/no", "can you reply yes or no"]);

  if (optedOut) {
    return {
      sentiment: "Opted out",
      intent: "Do not message",
      stage: "conversation_engaged" as Contact["stage"],
      kpiStatus: "Opted out",
      nextAction: "Do not message unless he re-engages first",
      eventInterest: "Paused",
      tags: ["detroitmetromen", "opted_out", "do_not_message"]
    };
  }

  if (registered) {
    return {
      sentiment: "Positive",
      intent: "Likely registered",
      stage: "event_funnel" as Contact["stage"],
      kpiStatus: "Likely registered",
      nextAction: "Confirm RSVP and send arrival details",
      eventInterest: "Men's Conference registration",
      tags: ["detroitmetromen", "registered_signal", "event_funnel"]
    };
  }

  if (askedToSignUp && hotInterest) {
    return {
      sentiment: "Warm",
      intent: "Registration follow-up",
      stage: "event_funnel" as Contact["stage"],
      kpiStatus: "Needs RSVP confirmation",
      nextAction: "Ask if he completed the Subsplash registration",
      eventInterest: "Men's Conference",
      tags: ["detroitmetromen", "needs_rsvp_confirmation", "needs_follow_up"]
    };
  }

  if (hotInterest) {
    return {
      sentiment: "Interested",
      intent: "Learn more",
      stage: "conversation_engaged" as Contact["stage"],
      kpiStatus: "Interested",
      nextAction: "Send registration link and ask one simple RSVP question",
      eventInterest: "Men's Conference",
      tags: ["detroitmetromen", "interested", "needs_follow_up"]
    };
  }

  return {
    sentiment: "Neutral",
    intent: "Needs context",
    stage: "conversation_engaged" as Contact["stage"],
    kpiStatus: "Needs review",
    nextAction: "Review conversation before next touch",
    eventInterest: "Detroit Metro Men",
    tags: ["detroitmetromen", "needs_review"]
  };
}

function applyComplianceOverride(
  analysis: ReturnType<typeof analyzeDetroitMetroMenConversation>,
  contact: Contact
): ReturnType<typeof analyzeDetroitMetroMenConversation> {
  if (!isHardDndPhone(contact.phone)) return analysis;

  return {
    sentiment: "Hard opt-out",
    intent: "Highest DND - do not contact",
    stage: "conversation_engaged" as Contact["stage"],
    kpiStatus: "Highest DND / Opted out",
    nextAction: "Do not message from Meetr ScaleConvo or any FC Men workflow",
    eventInterest: "Suppressed",
    tags: [
      ...analysis.tags,
      "meetr_scaleconvo",
      "highest_dnd",
      "hard_opt_out",
      "opted_out",
      "do_not_message"
    ]
  };
}

function applyGiveawayCampaign(
  analysis: ReturnType<typeof analyzeDetroitMetroMenConversation>,
  hasGiveaway: boolean
): ReturnType<typeof analyzeDetroitMetroMenConversation> {
  if (!hasGiveaway) return analysis;

  if (analysis.tags.includes("do_not_message")) {
    return {
      ...analysis,
      tags: [...analysis.tags, "giveaway", "campaign_giveaway"]
    };
  }

  return {
    ...analysis,
    stage: "instagram_kpi" as Contact["stage"],
    kpiStatus: "Giveaway campaign lead",
    nextAction: "Confirm giveaway entry and invite the next FC Men step",
    eventInterest: "Giveaway",
    tags: [...analysis.tags, "giveaway", "campaign_giveaway", "kpi_campaign"]
  };
}

function createDetroitMetroMenNotes(
  analysis: ReturnType<typeof analyzeDetroitMetroMenConversation>,
  latestMessage: string,
  campaignTags: string[] = []
) {
  return [
    `Sentiment: ${analysis.sentiment}`,
    `Intent: ${analysis.intent}`,
    campaignTags.length > 0 ? `Campaign: ${campaignTags.join(", ")}` : "",
    latestMessage ? `Latest: ${latestMessage}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function normalizeFluxLead(lead: JsonRecord, business?: JsonRecord): Contact {
  const details = getNestedRecord(lead, ["details"]);
  const extracted = getNestedRecord(lead, ["extracted_variables"]);
  const businessDetails = getNestedRecord(business ?? {}, ["details"]);
  const id = pickString(lead, ["id"]);
  const name =
    pickString(details, ["name", "full_name"]) ||
    getExtractedValue(extracted, ["full_name", "name"]) ||
    pickString(lead, ["normalized_phone"]) ||
    "Unknown contact";
  const phone =
    pickString(lead, ["normalized_phone"]) ||
    pickString(details, ["phone", "sender_id", "number"]) ||
    getExtractedValue(extracted, ["phone", "phone_number"]);
  const email = pickString(details, ["email"]) || getExtractedValue(extracted, ["email"]);
  const source = pickString(details, ["source", "platform"]) || "Flux conversations";
  const businessName = pickString(businessDetails, ["name"]) || pickString(lead, ["business_id"]);

  return {
    id: `flux_lead_${id || phone || name}`,
    fillId: `flux_${(id || phone || name).replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`,
    name,
    phone,
    email,
    stage: "conversation_engaged",
    tags: Array.from(new Set(["flux", source, businessName].filter(Boolean))),
    source,
    nextAction: "Review latest Flux conversation",
    lastTouchAt: pickString(lead, ["updated_at", "created_at"]) || new Date().toISOString(),
    kpiStatus: pickString(details, ["status"]) || "Flux lead",
    notes: pickString(details, ["notes"]) || "",
    metadata: {
      conversationStatus: "Pulled from Flux",
      eventInterest: pickString(details, ["intent", "interest"]) || "Unknown",
      role: pickString(details, ["role"]) || "Lead",
      linkedin: pickString(details, ["linkedin"]),
      businessId: pickString(lead, ["business_id"]),
      businessName
    }
  };
}

function historyItemToEvent(conversation: JsonRecord, item: JsonRecord, index: number): RecordContactActivityEvent {
  const convoId = pickString(conversation, ["convo_id", "conversation_id", "id"]);
  const direction = pickString(item, ["direction", "role", "sender", "type"]).toLowerCase();
  const label =
    pickString(item, ["message", "content", "text", "body", "transcript"]) ||
    pickString(conversation, ["summary", "last_message"]) ||
    "Conversation activity";

  return {
    type: direction.includes("out") || direction.includes("assistant") || direction.includes("agent") ? "outbound_sms" : "inbound_sms",
    channel: "sms",
    label,
    timestamp:
      pickString(item, ["created_at", "timestamp", "time", "date"]) ||
      pickString(conversation, ["updated_at", "created_at"]) ||
      undefined,
    fillId: convoId || undefined,
    name: pickString(conversation, ["name", "contact_name", "full_name"]),
    phone: pickString(conversation, ["phone", "phoneNumber", "number", "from"]),
    email: pickString(conversation, ["email"]),
    source: "Supabase conversations",
    metadata: {
      conversationId: convoId,
      historyIndex: index,
      queueSource: "supabase_conversations"
    }
  };
}

function normalizeConversationRows(rows: JsonRecord[]): RecordContactActivityEvent[] {
  const events: RecordContactActivityEvent[] = [];

  for (const conversation of rows) {
    const history = conversation.convo_history;
    if (Array.isArray(history) && history.length > 0) {
      history.filter(isRecord).forEach((item, index) => {
        events.push(historyItemToEvent(conversation, item, index));
      });
      continue;
    }

    events.push({
      type: "inbound_sms",
      channel: "sms",
      label: pickString(conversation, ["summary", "last_message", "message"]) || "Conversation pulled from Supabase.",
      timestamp: pickString(conversation, ["updated_at", "created_at"]) || undefined,
      fillId: pickString(conversation, ["convo_id", "conversation_id", "id"]) || undefined,
      name: pickString(conversation, ["name", "contact_name", "full_name"]),
      phone: pickString(conversation, ["phone", "phoneNumber", "number", "from"]),
      email: pickString(conversation, ["email"]),
      source: "Supabase conversations",
      metadata: {
        conversationId: pickString(conversation, ["convo_id", "conversation_id", "id"]),
        queueSource: "supabase_conversations"
      }
    });
  }

  return events;
}

function normalizeFluxConvoRows(rows: JsonRecord[]): {
  contacts: Contact[];
  events: RecordContactActivityEvent[];
} {
  const contacts: Contact[] = [];
  const events: RecordContactActivityEvent[] = [];

  for (const conversation of rows) {
    const lead = getNestedRecord(conversation, ["leads", "lead"]);
    const business = getNestedRecord(conversation, ["business"]);
    const contact = normalizeFluxLead(
      {
        ...lead,
        business_id: pickString(conversation, ["business_id"]) || pickString(lead, ["business_id"]),
        updated_at: pickString(conversation, ["updated_at"]) || pickString(lead, ["updated_at"]),
        created_at: pickString(conversation, ["created_at"]) || pickString(lead, ["created_at"])
      },
      business
    );
    const messages = Array.isArray(conversation.messages) ? conversation.messages.filter(isRecord) : [];
    const giveawayCampaign = hasGiveawayCampaign(conversation, contact);
    const detroitMetroMenScope = isDetroitMetroMenConversation(conversation, contact);
    if (!detroitMetroMenScope && !giveawayCampaign) {
      continue;
    }

    const convoId = pickString(conversation, ["id", "convo_id"]);
    const transcript = messages.map(getMessageText).filter(Boolean).join("\n");
    const latestMessage = messages.map(getMessageText).filter(Boolean).at(-1) ?? "";
    const baseAnalysis = analyzeDetroitMetroMenConversation(transcript || getConversationCorpus(conversation, contact));
    const analysis = applyGiveawayCampaign(
      applyComplianceOverride(baseAnalysis, contact),
      giveawayCampaign
    );
    const hardDnd = isHardDndPhone(contact.phone);
    const campaignTags = giveawayCampaign ? [GIVEAWAY_CAMPAIGN_MARKER, "giveaway"] : [];
    const scope = detroitMetroMenScope ? "@detroitmetromen" : GIVEAWAY_CAMPAIGN_MARKER;
    const enrichedContact: Contact = {
      ...contact,
      stage: analysis.stage,
      tags: Array.from(new Set([...contact.tags, ...analysis.tags])),
      nextAction: analysis.nextAction,
      kpiStatus: analysis.kpiStatus,
      notes: createDetroitMetroMenNotes(analysis, latestMessage, campaignTags),
      metadata: {
        ...contact.metadata,
        conversationStatus: analysis.intent,
        eventInterest: analysis.eventInterest,
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        scope,
        campaignTags,
        dndLevel: hardDnd ? "highest" : undefined,
        optOut: hardDnd || analysis.tags.includes("opted_out"),
        doNotMessage: hardDnd || analysis.tags.includes("do_not_message"),
        complianceSystem: hardDnd ? "Meetr ScaleConvo" : undefined
      }
    };

    contacts.push(enrichedContact);

    if (messages.length === 0) {
      events.push({
        type: "inbound_sms",
        channel: "sms",
        label: "Flux conversation pulled with no message preview.",
        timestamp: pickString(conversation, ["updated_at", "created_at"]) || undefined,
        fillId: enrichedContact.fillId,
        name: enrichedContact.name,
        phone: enrichedContact.phone,
        email: enrichedContact.email,
        source: "Flux conversations",
        metadata: {
          conversationId: convoId,
          queueSource: "flux",
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          scope,
          campaignTags,
          dndLevel: hardDnd ? "highest" : "",
          optOut: hardDnd || analysis.tags.includes("opted_out"),
          doNotMessage: hardDnd || analysis.tags.includes("do_not_message"),
          complianceSystem: hardDnd ? "Meetr ScaleConvo" : "",
          suppressContactNotes: true
        }
      });
      continue;
    }

    messages.forEach((message, index) => {
      const role = pickString(message, ["role", "sender", "direction"]).toLowerCase();
      events.push({
        type: role.includes("agent") || role.includes("assistant") || role.includes("out") ? "outbound_sms" : "inbound_sms",
        channel: "sms",
        label: pickString(message, ["content", "message", "text", "body"]) || "Flux message",
        timestamp: pickString(message, ["timestamp", "created_at", "time"]) || pickString(conversation, ["updated_at"]) || undefined,
        fillId: enrichedContact.fillId,
        name: enrichedContact.name,
        phone: enrichedContact.phone,
        email: enrichedContact.email,
        source: "Flux conversations",
        metadata: {
          conversationId: convoId,
          historyIndex: index,
          queueSource: "flux",
          agentStatus: pickString(conversation, ["agent_status"]),
          sentiment: analysis.sentiment,
          intent: analysis.intent,
          scope,
          campaignTags,
          dndLevel: hardDnd ? "highest" : "",
          optOut: hardDnd || analysis.tags.includes("opted_out"),
          doNotMessage: hardDnd || analysis.tags.includes("do_not_message"),
          complianceSystem: hardDnd ? "Meetr ScaleConvo" : "",
          suppressContactNotes: true
        }
      });
    });
  }

  return { contacts, events };
}

async function pullScaleConvoConversations() {
  const endpoint = process.env.SCALECONVO_CONVERSATIONS_URL;
  if (!endpoint) return null;

  const headers: HeadersInit = {
    accept: "application/json"
  };

  if (process.env.SCALECONVO_API_KEY) {
    headers.authorization = `Bearer ${process.env.SCALECONVO_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`ScaleConvo conversations pull failed with ${response.status}`);
  }

  const payload: unknown = await response.json();
  const records = Array.isArray(payload)
    ? payload.filter(isRecord)
    : isRecord(payload) && Array.isArray(payload.conversations)
      ? payload.conversations.filter(isRecord)
      : [];

  return records.map(normalizeScaleConvoQueueContact);
}

export async function pullAllContactsAndConversations(): Promise<ContactbookPullResult> {
  const fetchedAt = new Date().toISOString();
  const contactRows = await tryFetchSupabaseTable("contactsTYG", "select=*&order=updated_at.desc");
  const conversationRows = await tryFetchSupabaseTable("conversations", "select=*&order=updated_at.desc");
  const fluxConvoRows = await tryFetchSupabaseTable(
    "convo",
    "select=*,leads!convo_lead_id_fkey(id,business_id,normalized_phone,extracted_variables,details,created_at,updated_at),business(id,details)&order=updated_at.desc"
  );
  const scaleConvoEvents = await pullScaleConvoConversations();
  const fluxData = fluxConvoRows ? normalizeFluxConvoRows(fluxConvoRows) : null;

  if (contactRows || conversationRows || fluxData || scaleConvoEvents) {
    return {
      fetchedAt,
      source: {
        contacts: contactRows ? "contactsTYG" : fluxData ? "flux" : "mock",
        conversations: conversationRows ? "supabase" : fluxData ? "flux" : scaleConvoEvents ? "scaleconvo" : "mock"
      },
      contacts: [...(contactRows ? contactRows.map(normalizeContactTYG) : []), ...(fluxData?.contacts ?? [])],
      events: [
        ...(conversationRows ? normalizeConversationRows(conversationRows) : []),
        ...(fluxData?.events ?? []),
        ...(scaleConvoEvents ?? [])
      ]
    };
  }

  const queue = await pollScaleConvoContactQueue();

  return {
    fetchedAt,
    source: {
      contacts: "mock",
      conversations: queue.source === "scaleconvo" ? "scaleconvo" : "mock"
    },
    contacts: [],
    events: queue.source === "scaleconvo" ? queue.events : []
  };
}
