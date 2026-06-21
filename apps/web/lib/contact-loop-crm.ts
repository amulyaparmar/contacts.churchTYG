export type ContactStage =
  | "conversation_engaged"
  | "event_funnel"
  | "future_events"
  | "instagram_kpi";

export type ContactActivityType =
  | "inbound_sms"
  | "outbound_sms"
  | "rsvp_started"
  | "rsvp_complete"
  | "instagram_follow"
  | "note"
  | "event_interest";

export type ContactActivity = {
  id: string;
  contactId: string;
  type: ContactActivityType;
  channel: "sms" | "web" | "instagram" | "manual";
  label: string;
  timestamp: string;
  metadata: Record<string, string | number | boolean | string[]>;
};

export type Contact = {
  id: string;
  fillId: string;
  name: string;
  phone: string;
  email: string;
  stage: ContactStage;
  tags: string[];
  source: string;
  nextAction: string;
  lastTouchAt: string;
  kpiStatus: string;
  notes: string;
  metadata: Record<string, string | number | boolean | string[] | undefined> & {
    church?: string;
    inviteOwner?: string;
    eventInterest?: string;
    conversationStatus?: string;
    instagramHandle?: string;
    rsvpTicket?: string;
    campaignTags?: string[];
  };
};

export type ContactBookViewId =
  | "all"
  | "conversation"
  | "event"
  | "future"
  | "instagram"
  | "followup";

export type ContactLoopState = {
  contacts: Contact[];
  activities: ContactActivity[];
};

export type RecordContactActivityEvent = {
  type: ContactActivityType;
  channel: ContactActivity["channel"];
  label: string;
  timestamp?: string;
  fillId?: string;
  name?: string;
  phone?: string;
  email?: string;
  source?: string;
  metadata?: Record<string, string | number | boolean | string[]>;
};

export const contactBookViews: Array<{
  id: ContactBookViewId;
  title: string;
  description: string;
}> = [
  {
    id: "all",
    title: "All Contacts",
    description: "Everyone in the FC Men loop"
  },
  {
    id: "conversation",
    title: "Conversation Engaged",
    description: "First inbound and active threads"
  },
  {
    id: "event",
    title: "Event Funnel",
    description: "RSVP, registered, or deciding"
  },
  {
    id: "future",
    title: "Future Events",
    description: "Interested beyond this weekend"
  },
  {
    id: "instagram",
    title: "Instagram/KPI",
    description: "Social and campaign actions"
  },
  {
    id: "followup",
    title: "Needs Follow-up",
    description: "Contacts with a clear next touch"
  }
];

export const mockContacts: Contact[] = [
  {
    id: "fc_001",
    fillId: "cnv_9xK2pQ",
    name: "Marcus Jones",
    phone: "+1 313 555 0199",
    email: "marcus@example.com",
    stage: "conversation_engaged",
    tags: ["needs_follow_up", "first_inbound", "sms"],
    source: "SMS keyword",
    nextAction: "Ask if he wants a Friday reminder",
    lastTouchAt: "2026-06-20T22:42:00.000Z",
    kpiStatus: "Conversation opened",
    notes: "Asked about Detroit Metro Men after receiving the link-in-bio SMS.",
    metadata: {
      church: "First Church Sterling Heights",
      inviteOwner: "FC Men team",
      eventInterest: "Friday night",
      conversationStatus: "New inbound"
    }
  },
  {
    id: "fc_002",
    fillId: "rsvp_H7m2La",
    name: "Andre Williams",
    phone: "+1 586 555 0124",
    email: "andre@example.com",
    stage: "event_funnel",
    tags: ["rsvp_complete", "breakfast", "registered"],
    source: "RSVP form",
    nextAction: "Send Saturday morning arrival details",
    lastTouchAt: "2026-06-20T19:24:00.000Z",
    kpiStatus: "Registered",
    notes: "Selected Full Conference with Breakfast and asked about bringing another man.",
    metadata: {
      church: "Detroit Metro District",
      inviteOwner: "Marcus Jones",
      eventInterest: "Full conference",
      conversationStatus: "Registered",
      rsvpTicket: "Full Conference with Breakfast"
    }
  },
  {
    id: "fc_003",
    fillId: "ig_p2W8sd",
    name: "Caleb Thompson",
    phone: "+1 248 555 0176",
    email: "",
    stage: "instagram_kpi",
    tags: ["instagram", "needs_email", "future_event"],
    source: "Instagram follow",
    nextAction: "Invite to next Men's Roundtable",
    lastTouchAt: "2026-06-19T18:10:00.000Z",
    kpiStatus: "Followed @detroitmetromen",
    notes: "Followed after the shared album CTA. Good candidate for future monthly events.",
    metadata: {
      inviteOwner: "Detroit Metro Men",
      eventInterest: "Men's Roundtable",
      conversationStatus: "Social touch",
      instagramHandle: "@calebthompson"
    }
  },
  {
    id: "fc_004",
    fillId: "evt_Y4qLm3",
    name: "Darius Reed",
    phone: "+1 734 555 0150",
    email: "darius@example.com",
    stage: "future_events",
    tags: ["future_event", "roundtable", "leader"],
    source: "Table host referral",
    nextAction: "Ask him to host a post-conference follow-up table",
    lastTouchAt: "2026-06-18T14:05:00.000Z",
    kpiStatus: "Future host",
    notes: "Strong relational connector. Interested in the next roundtable and future serve team.",
    metadata: {
      church: "Metro West",
      inviteOwner: "Table host list",
      eventInterest: "Future hosting",
      conversationStatus: "Warm"
    }
  },
  {
    id: "fc_005",
    fillId: "sms_Q2s9Nn",
    name: "Noah Bennett",
    phone: "+1 810 555 0142",
    email: "noah@example.com",
    stage: "conversation_engaged",
    tags: ["needs_follow_up", "question", "boy_service"],
    source: "Inbound SMS",
    nextAction: "Answer boy ages 5-12 service question",
    lastTouchAt: "2026-06-20T23:04:00.000Z",
    kpiStatus: "Question pending",
    notes: "Asked if his 11-year-old can attend the boys service while he attends Friday.",
    metadata: {
      church: "First Church Sterling Heights",
      eventInterest: "Friday night + boys service",
      conversationStatus: "Needs reply"
    }
  }
];

export const mockActivities: ContactActivity[] = [
  {
    id: "act_001",
    contactId: "fc_001",
    type: "inbound_sms",
    channel: "sms",
    label: "Hey! I want to learn more about Detroit Metro Men.",
    timestamp: "2026-06-20T22:42:00.000Z",
    metadata: { fillId: "cnv_9xK2pQ", source: "SMS keyword" }
  },
  {
    id: "act_002",
    contactId: "fc_002",
    type: "rsvp_complete",
    channel: "web",
    label: "Completed RSVP for Full Conference with Breakfast",
    timestamp: "2026-06-20T19:24:00.000Z",
    metadata: { fillId: "rsvp_H7m2La", ticket: "full", amount: 10 }
  },
  {
    id: "act_003",
    contactId: "fc_003",
    type: "instagram_follow",
    channel: "instagram",
    label: "Followed @detroitmetromen from the link-in-bio grid",
    timestamp: "2026-06-19T18:10:00.000Z",
    metadata: { source: "instagram_grid" }
  },
  {
    id: "act_004",
    contactId: "fc_004",
    type: "event_interest",
    channel: "manual",
    label: "Marked interested in future Men's Roundtable hosting",
    timestamp: "2026-06-18T14:05:00.000Z",
    metadata: { futureEvent: "roundtable" }
  },
  {
    id: "act_005",
    contactId: "fc_005",
    type: "inbound_sms",
    channel: "sms",
    label: "Can my son come to the boys service Friday?",
    timestamp: "2026-06-20T23:04:00.000Z",
    metadata: { topic: "boys_service" }
  },
  {
    id: "act_006",
    contactId: "fc_001",
    type: "rsvp_started",
    channel: "web",
    label: "Opened RSVP form from link-in-bio",
    timestamp: "2026-06-20T22:45:00.000Z",
    metadata: { fillId: "cnv_9xK2pQ", source: "link-in-bio" }
  }
];

export function createInitialContactLoopState(): ContactLoopState {
  return {
    contacts: mockContacts,
    activities: mockActivities
  };
}

export function getContactViewCount(contacts: Contact[], viewId: ContactBookViewId) {
  return filterContactsByView(contacts, viewId).length;
}

export function filterContactsByView(contacts: Contact[], viewId: ContactBookViewId) {
  if (viewId === "all") {
    return contacts;
  }

  if (viewId === "conversation") {
    return contacts.filter((contact) => contact.stage === "conversation_engaged");
  }

  if (viewId === "event") {
    return contacts.filter((contact) => contact.stage === "event_funnel");
  }

  if (viewId === "future") {
    return contacts.filter((contact) => contact.stage === "future_events");
  }

  if (viewId === "instagram") {
    return contacts.filter((contact) => contact.stage === "instagram_kpi");
  }

  return contacts.filter(
    (contact) =>
      contact.tags.includes("needs_follow_up") ||
      contact.nextAction.toLowerCase().includes("ask") ||
      contact.nextAction.toLowerCase().includes("answer")
  );
}

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function buildContactName(event: RecordContactActivityEvent) {
  const explicitName = event.name?.trim();
  if (explicitName) {
    return explicitName;
  }

  return event.phone || event.email || "New conversation contact";
}

function createShortFillId(seed: string) {
  const compact = seed.replace(/[^a-zA-Z0-9]/g, "").slice(-6) || Math.random().toString(36).slice(2, 8);
  return `cnv_${compact}`;
}

function createLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function recordContactActivity(
  state: ContactLoopState,
  event: RecordContactActivityEvent
): ContactLoopState {
  const timestamp = event.timestamp ?? new Date().toISOString();
  const incomingPhone = normalize(event.phone);
  const incomingEmail = normalize(event.email);
  const matchedContact = state.contacts.find((contact) => {
    const phoneMatches = incomingPhone && normalize(contact.phone) === incomingPhone;
    const emailMatches = incomingEmail && normalize(contact.email) === incomingEmail;
    return phoneMatches || emailMatches || (event.fillId && contact.fillId === event.fillId);
  });

  if (matchedContact) {
    const shouldUpdateNotes = event.metadata?.suppressContactNotes !== true;
    const nextContact: Contact = {
      ...matchedContact,
      name: matchedContact.name || buildContactName(event),
      phone: matchedContact.phone || event.phone || "",
      email: matchedContact.email || event.email || "",
      lastTouchAt: timestamp,
      source: matchedContact.source || event.source || "Inbound conversation",
      stage: event.type === "rsvp_complete" ? "event_funnel" : matchedContact.stage,
      notes: shouldUpdateNotes && event.label ? `${event.label}\n\n${matchedContact.notes}` : matchedContact.notes,
      metadata: {
        ...matchedContact.metadata,
        ...(event.metadata ?? {})
      },
      tags: Array.from(
        new Set([
          ...matchedContact.tags,
          ...(event.type === "inbound_sms" ? ["needs_follow_up", "sms"] : []),
          ...(event.type === "rsvp_complete" ? ["rsvp_complete"] : [])
        ])
      )
    };

    return {
      contacts: state.contacts.map((contact) => (contact.id === matchedContact.id ? nextContact : contact)),
      activities: [
        {
          id: createLocalId("act"),
          contactId: matchedContact.id,
          type: event.type,
          channel: event.channel,
          label: event.label,
          timestamp,
          metadata: event.metadata ?? {}
        },
        ...state.activities
      ]
    };
  }

  const contactId = createLocalId("fc");
  const fillId = event.fillId ?? createShortFillId(event.phone ?? event.email ?? contactId);
  const contact: Contact = {
    id: contactId,
    fillId,
    name: buildContactName(event),
    phone: event.phone ?? "",
    email: event.email ?? "",
    stage: event.type === "rsvp_complete" ? "event_funnel" : "conversation_engaged",
    tags: event.type === "inbound_sms" ? ["needs_follow_up", "first_inbound", "sms"] : ["needs_follow_up"],
    source: event.source ?? "Inbound conversation",
    nextAction: event.type === "inbound_sms" ? "Reply and invite to the right next step" : "Review new contact",
    lastTouchAt: timestamp,
    kpiStatus: event.type === "inbound_sms" ? "Conversation opened" : "New activity",
    notes: event.label,
    metadata: {
      conversationStatus: event.type === "inbound_sms" ? "New inbound" : "New",
      eventInterest: "Unknown",
      ...(event.metadata ?? {})
    }
  };

  return {
    contacts: [contact, ...state.contacts],
    activities: [
      {
        id: createLocalId("act"),
        contactId,
        type: event.type,
        channel: event.channel,
        label: event.label,
        timestamp,
        metadata: { fillId, ...(event.metadata ?? {}) }
      },
      ...state.activities
    ]
  };
}
