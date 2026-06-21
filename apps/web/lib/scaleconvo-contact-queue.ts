import type { RecordContactActivityEvent } from "./contact-loop-crm";

type QueueRecord = Record<string, unknown>;

export type ScaleConvoQueueResult = {
  source: "scaleconvo" | "mock";
  events: RecordContactActivityEvent[];
  fetchedAt: string;
};

const mockScaleConvoQueue: QueueRecord[] = [
  {
    id: "mock-scaleconvo-001",
    full_name: "Eli Patterson",
    phone: "+1 313 555 0188",
    email: "eli@example.com",
    body: "Hey, I saw the men's conference link. Can someone send me details?",
    visitor_uuid: "scv_eli_0188",
    source: "ScaleConvo queue",
    created_at: "2026-06-20T23:41:00.000Z"
  },
  {
    id: "mock-scaleconvo-002",
    full_name: "Terrell Adams",
    phone: "+1 586 555 0161",
    body: "I want to register. Is breakfast included Saturday?",
    visitor_uuid: "scv_terrell_0161",
    source: "ScaleConvo queue",
    created_at: "2026-06-21T00:04:00.000Z"
  }
];
const HARD_DND_PHONE_DIGITS = "15862588588";

function isQueueRecord(value: unknown): value is QueueRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(record: QueueRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function isHardDndPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits === HARD_DND_PHONE_DIGITS || digits === HARD_DND_PHONE_DIGITS.slice(1);
}

function toQueueRecords(payload: unknown): QueueRecord[] {
  if (Array.isArray(payload)) return payload.filter(isQueueRecord);
  if (!isQueueRecord(payload)) return [];

  for (const key of ["contacts", "queue", "items", "data", "results", "conversations"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isQueueRecord);
  }

  return [];
}

export function normalizeScaleConvoQueueContact(record: QueueRecord): RecordContactActivityEvent {
  const phone = pickString(record, ["phone", "number", "from", "mobile", "contact_phone"]);
  const email = pickString(record, ["email", "contact_email"]);
  const name = pickString(record, ["name", "full_name", "contact_name", "first_name"]);
  const message =
    pickString(record, ["message", "body", "last_message", "text", "preview"]) ||
    "New inbound conversation from ScaleConvo.";
  const fillId =
    pickString(record, ["fillId", "fill_id", "visitor_uuid", "conversation_id", "contact_id", "id"]) ||
    undefined;
  const hardDnd = isHardDndPhone(phone);

  return {
    type: "inbound_sms",
    channel: "sms",
    label: message,
    timestamp: pickString(record, ["created_at", "timestamp", "last_touch_at", "updated_at"]) || undefined,
    fillId,
    name,
    phone,
    email,
    source: pickString(record, ["source", "campaign", "origin"]) || "ScaleConvo queue",
    metadata: {
      queueSource: "scaleconvo",
      queueId: pickString(record, ["id", "conversation_id", "contact_id"]),
      visitorUuid: pickString(record, ["visitor_uuid", "visitorUuid"]),
      magnetUuid: pickString(record, ["magnet_uuid", "magnetUuid"]),
      complianceSystem: hardDnd ? "Meetr ScaleConvo" : "",
      dndLevel: hardDnd ? "highest" : "",
      optOut: hardDnd,
      doNotMessage: hardDnd,
      firstEngagement: true
    }
  };
}

export async function pollScaleConvoContactQueue(): Promise<ScaleConvoQueueResult> {
  const endpoint = process.env.SCALECONVO_CONTACT_QUEUE_URL;
  const fetchedAt = new Date().toISOString();

  if (!endpoint) {
    return {
      source: "mock",
      fetchedAt,
      events: mockScaleConvoQueue.map(normalizeScaleConvoQueueContact)
    };
  }

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
    throw new Error(`ScaleConvo queue request failed with ${response.status}`);
  }

  const payload: unknown = await response.json();
  const records = toQueueRecords(payload);

  return {
    source: "scaleconvo",
    fetchedAt,
    events: records.map(normalizeScaleConvoQueueContact)
  };
}
