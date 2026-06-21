"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  Download,
  Inbox,
  MessageSquarePlus,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Trash2,
  Upload,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  contactBookViews,
  filterContactsByView,
  getContactViewCount,
  recordContactActivity,
  type Contact,
  type ContactActivity,
  type ContactBookViewId,
  type ContactLoopState,
  type RecordContactActivityEvent
} from "@/lib/contact-loop-crm";

type PullResponse = {
  source?: {
    contacts: "contactsTYG" | "flux" | "mock";
    conversations: "supabase" | "flux" | "scaleconvo" | "mock";
  };
  contacts: Contact[];
  events: RecordContactActivityEvent[];
  fetchedAt: string;
  error?: string;
};

const stageLabels: Record<Contact["stage"], string> = {
  conversation_engaged: "Conversation",
  event_funnel: "Event funnel",
  future_events: "Future events",
  instagram_kpi: "Instagram/KPI"
};

type DetailTab = "profile" | "messages" | "reply";

const gridColumns: Array<{
  key: "name" | "phone" | "firstName" | "lastName" | "email" | "role" | "linkedin" | "notes";
  label: string;
  width: string;
}> = [
  { key: "name", label: "Name", width: "220px" },
  { key: "phone", label: "Phone", width: "180px" },
  { key: "firstName", label: "First", width: "150px" },
  { key: "lastName", label: "Last", width: "150px" },
  { key: "email", label: "Email", width: "250px" },
  { key: "role", label: "Role", width: "180px" },
  { key: "linkedin", label: "LinkedIn", width: "250px" },
  { key: "notes", label: "Notes", width: "340px" }
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getInitials(name: string) {
  const [first = "", second = ""] = name.split(" ");
  return `${first[0] ?? "F"}${second[0] ?? "C"}`.toUpperCase();
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function buildSmsHref(contact: Contact, body: string) {
  const phone = contact.phone.replace(/\s+/g, "");
  return `sms:${phone}?&body=${encodeURIComponent(body)}`;
}

function contactMatchesQuery(contact: Contact, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [
    contact.name,
    contact.phone,
    contact.email,
    contact.stage,
    contact.source,
    contact.nextAction,
    contact.kpiStatus,
    contact.fillId,
    contact.tags.join(" ")
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function viewIcon(viewId: ContactBookViewId) {
  if (viewId === "conversation") return Inbox;
  if (viewId === "event") return Check;
  if (viewId === "future") return Clock3;
  if (viewId === "instagram") return UserRoundCheck;
  if (viewId === "followup") return MessageSquarePlus;
  return BookOpen;
}

function splitContactName(name: string) {
  if (/^\+?[\d\s().-]{7,}$/.test(name.trim())) {
    return {
      firstName: "",
      lastName: ""
    };
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ")
  };
}

function getGridValue(contact: Contact, field: (typeof gridColumns)[number]["key"]) {
  const splitName = splitContactName(contact.name);

  if (field === "firstName") return String(contact.metadata.firstName ?? splitName.firstName);
  if (field === "lastName") return String(contact.metadata.lastName ?? splitName.lastName);
  if (field === "role") return String(contact.metadata.role ?? "");
  if (field === "linkedin") return String(contact.metadata.linkedin ?? "");

  return String(contact[field] ?? "");
}

function buildGridPatch(contact: Contact, field: (typeof gridColumns)[number]["key"], value: string): Partial<Contact> {
  const splitName = splitContactName(contact.name);

  if (field === "firstName") {
    const lastName = String(contact.metadata.lastName ?? splitName.lastName);
    return {
      name: [value, lastName].filter(Boolean).join(" ") || contact.name,
      metadata: { ...contact.metadata, firstName: value }
    };
  }

  if (field === "lastName") {
    const firstName = String(contact.metadata.firstName ?? splitName.firstName);
    return {
      name: [firstName, value].filter(Boolean).join(" ") || contact.name,
      metadata: { ...contact.metadata, lastName: value }
    };
  }

  if (field === "role" || field === "linkedin") {
    return {
      metadata: { ...contact.metadata, [field]: value }
    };
  }

  return { [field]: value };
}

function ContactBookRail({
  activeView,
  contacts,
  onSelectView
}: {
  activeView: ContactBookViewId;
  contacts: Contact[];
  onSelectView: (viewId: ContactBookViewId) => void;
}) {
  return (
    <aside className="email-rail">
      <div className="email-rail-head">
        <div>
          <BookOpen size={16} />
          Contact books
        </div>
        <button type="button" aria-label="Create contact book">
          <Plus size={15} />
        </button>
      </div>

      <nav className="email-book-list" aria-label="FC Men contact books">
        {contactBookViews.map((view) => {
          const Icon = viewIcon(view.id);
          return (
            <button
              className={activeView === view.id ? "email-book-active" : ""}
              key={view.id}
              onClick={() => onSelectView(view.id)}
              type="button"
            >
              <span className="email-book-icon">
                <Icon size={15} />
              </span>
              <span className="email-book-copy">
                <strong>{view.title}</strong>
                <small>{view.description}</small>
              </span>
              <span className="email-book-count">
                <UsersRound size={12} />
                {getContactViewCount(contacts, view.id)}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="email-rail-footer">
        <Link href="/">
          <ArrowLeft size={15} />
          FC Men home
        </Link>
      </div>
    </aside>
  );
}

function EditableGridCell({
  contact,
  field,
  onUpdateContact
}: {
  contact: Contact;
  field: (typeof gridColumns)[number]["key"];
  onUpdateContact: (id: string, patch: Partial<Contact>) => void;
}) {
  const value = getGridValue(contact, field);

  return (
    <input
      aria-label={`${field} for ${contact.name}`}
      defaultValue={value}
      onBlur={(event) => {
        const nextValue = event.target.value;
        if (nextValue !== value) {
          onUpdateContact(contact.id, buildGridPatch(contact, field, nextValue));
        }
      }}
    />
  );
}

function ContactsGrid({
  contacts,
  selectedContactId,
  onDeleteContact,
  onSelectContact,
  onUpdateContact
}: {
  contacts: Contact[];
  selectedContactId: string | null;
  onDeleteContact: (id: string) => void;
  onSelectContact: (id: string) => void;
  onUpdateContact: (id: string, patch: Partial<Contact>) => void;
}) {
  return (
    <div className="email-grid-wrap">
      <table className="email-grid">
        <colgroup>
          <col style={{ width: "46px" }} />
          {gridColumns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
          <col style={{ width: "64px" }} />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            {gridColumns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact, index) => (
            <tr
              className={selectedContactId === contact.id ? "email-row-selected" : ""}
              key={contact.id}
              onClick={() => onSelectContact(contact.id)}
            >
              <td>{index + 1}</td>
              {gridColumns.map((column) => (
                <td key={column.key}>
                  {column.key === "name" ? (
                    <div className="email-name-cell">
                      <span>{getInitials(contact.name)}</span>
                      <div>
                        <EditableGridCell contact={contact} field={column.key} onUpdateContact={onUpdateContact} />
                        <small>{contact.fillId}</small>
                      </div>
                    </div>
                  ) : (
                    <EditableGridCell contact={contact} field={column.key} onUpdateContact={onUpdateContact} />
                  )}
                </td>
              ))}
              <td>
                <button
                  aria-label={`Delete ${contact.name}`}
                  className="email-delete"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteContact(contact.id);
                  }}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContactDetails({
  activities,
  contact,
  onRecordActivity,
  onUpdateContact
}: {
  activities: ContactActivity[];
  contact: Contact | null;
  onRecordActivity: (event: RecordContactActivityEvent) => void;
  onUpdateContact: (id: string, patch: Partial<Contact>) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("profile");
  const [replyDraft, setReplyDraft] = useState("");

  if (!contact) {
    return (
      <aside className="email-detail">
        <div className="email-empty-detail">Select a contact to view notes, metadata, and timeline context.</div>
      </aside>
    );
  }

  const contactActivities = activities
    .filter((activity) => activity.contactId === contact.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const messageActivities = contactActivities
    .filter((activity) => activity.channel === "sms")
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const bridgeBaseUrl = process.env.NEXT_PUBLIC_IMESSAGE_BRIDGE_URL;
  const bridgeQuery = new URLSearchParams({
    fillId: contact.fillId,
    phone: contact.phone,
    name: contact.name
  }).toString();
  const bridgeSrc = bridgeBaseUrl ? `${bridgeBaseUrl}${bridgeBaseUrl.includes("?") ? "&" : "?"}${bridgeQuery}` : undefined;
  const bridgePreview = `<!doctype html>
<html>
  <body style="margin:0;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;">
    <main style="display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center;">
      <section style="max-width:280px;">
        <div style="margin:0 auto 12px;width:40px;height:40px;border-radius:999px;background:#0f766e;color:white;display:grid;place-items:center;font-weight:800;">IM</div>
        <h1 style="margin:0 0 8px;font-size:18px;">iMessage bridge slot</h1>
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.45;">Ready for ${escapeHtml(contact.name)} at ${escapeHtml(contact.phone || "no phone")}.</p>
      </section>
    </main>
  </body>
</html>`;
  const defaultReply = `Hey ${splitContactName(contact.name).firstName || "there"}, thanks for reaching out about Detroit Metro Men. Do you want the registration link again?`;
  const currentReply = replyDraft.trim() || defaultReply;
  const isDoNotMessage =
    contact.metadata.doNotMessage === true ||
    contact.metadata.optOut === true ||
    contact.tags.includes("do_not_message") ||
    contact.tags.includes("opted_out");
  const dndLabel = contact.metadata.dndLevel ? String(contact.metadata.dndLevel) : isDoNotMessage ? "active" : "none";
  const campaignTags = Array.isArray(contact.metadata.campaignTags)
    ? contact.metadata.campaignTags
    : typeof contact.metadata.campaignTags === "string"
      ? [contact.metadata.campaignTags]
      : [];

  return (
    <aside className="email-detail">
      <div className="email-detail-head">
        <div>
          <h2>{contact.name || "Unnamed contact"}</h2>
          <p>{contact.email || contact.phone || "No contact method yet"}</p>
        </div>
        <span>{stageLabels[contact.stage]}</span>
      </div>

      <div className="email-detail-tabs" role="tablist" aria-label="Contact detail views">
        <button
          aria-selected={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          role="tab"
          type="button"
        >
          Profile
        </button>
        <button
          aria-selected={activeTab === "messages"}
          onClick={() => setActiveTab("messages")}
          role="tab"
          type="button"
        >
          Messages
          <span>{messageActivities.length}</span>
        </button>
        <button
          aria-selected={activeTab === "reply"}
          onClick={() => setActiveTab("reply")}
          role="tab"
          type="button"
        >
          Reply
        </button>
      </div>

      <div className="email-detail-body">
        {activeTab === "profile" ? (
          <>
            <section>
              <h3>Notes</h3>
              <textarea
                value={contact.notes}
                onChange={(event) => onUpdateContact(contact.id, { notes: event.target.value })}
                placeholder="Relationship notes, follow-up ideas, prayer needs, or registration context..."
              />
            </section>

            <section>
              <h3>Metadata</h3>
              <div className="email-metadata">
                <span>Fill ID</span>
                <strong>{contact.fillId}</strong>
                <span>Phone</span>
                <strong>{contact.phone || "Unknown"}</strong>
                <span>Source</span>
                <strong>{contact.source}</strong>
                <span>Conversation</span>
                <strong>{contact.metadata.conversationStatus ?? "Unknown"}</strong>
                <span>Event interest</span>
                <strong>{contact.metadata.eventInterest ?? "Unknown"}</strong>
                <span>Sentiment</span>
                <strong>{contact.metadata.sentiment ?? "Unknown"}</strong>
                <span>Intent</span>
                <strong>{contact.metadata.intent ?? "Unknown"}</strong>
                <span>Campaign</span>
                <strong>{campaignTags.length > 0 ? campaignTags.join(", ") : "None"}</strong>
                <span>DND</span>
                <strong>{dndLabel}</strong>
                <span>Opt-out</span>
                <strong>{isDoNotMessage ? "Yes" : "No"}</strong>
                <span>System</span>
                <strong>{contact.metadata.complianceSystem ?? "FC Men"}</strong>
              </div>
            </section>

            <section>
              <h3>Tags</h3>
              <div className="email-tags">
                {contact.tags.map((tag) => (
                  <span key={tag}>{tag.replaceAll("_", " ")}</span>
                ))}
              </div>
            </section>

            <section>
              <h3>Timeline</h3>
              <div className="email-timeline">
                {contactActivities.map((activity) => (
                  <article key={activity.id}>
                    <strong>{activity.label}</strong>
                    <span>
                      {activity.channel.toUpperCase()} · {activity.type.replaceAll("_", " ")} ·{" "}
                      {formatDate(activity.timestamp)}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "messages" ? (
          <section className="email-message-panel">
            <h3>Message queue</h3>
            <div className="email-message-thread">
              {messageActivities.length > 0 ? (
                messageActivities.map((activity) => {
                  const outgoing = activity.type === "outbound_sms";
                  return (
                    <article className={outgoing ? "email-message-out" : "email-message-in"} key={activity.id}>
                      <strong>{outgoing ? "FC Men" : contact.name || contact.phone}</strong>
                      <p>{activity.label}</p>
                      <span>{formatDate(activity.timestamp)}</span>
                    </article>
                  );
                })
              ) : (
                <div className="email-empty-detail">No SMS messages pulled for this contact yet.</div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "reply" ? (
          <>
            <section className="email-reply-panel">
              <h3>Reply draft</h3>
              {isDoNotMessage ? (
                <div className="email-compliance-alert">
                  This contact is marked DND / opted out. Do not send SMS, iMessage, or ScaleConvo follow-up unless he
                  re-engages first.
                </div>
              ) : null}
              <textarea
                aria-label={`Reply draft for ${contact.name}`}
                disabled={isDoNotMessage}
                onChange={(event) => setReplyDraft(event.target.value)}
                placeholder={defaultReply}
                value={replyDraft}
              />
              <div className="email-reply-actions">
                <button
                  className="email-primary-button"
                  disabled={isDoNotMessage || !currentReply.trim()}
                  onClick={() => {
                    onRecordActivity({
                      type: "outbound_sms",
                      channel: "sms",
                      label: currentReply.trim(),
                      fillId: contact.fillId,
                      name: contact.name,
                      phone: contact.phone,
                      email: contact.email,
                      source: "Contactbook reply draft",
                      metadata: {
                        suppressContactNotes: true,
                        replyStatus: "draft_logged"
                      }
                    });
                    setReplyDraft("");
                    setActiveTab("messages");
                  }}
                  type="button"
                >
                  <MessageSquarePlus size={15} />
                  Log reply
                </button>
                {isDoNotMessage ? (
                  <button className="email-secondary-button" disabled type="button">
                    <Send size={15} />
                    Open SMS
                  </button>
                ) : (
                  <a className="email-secondary-button" href={buildSmsHref(contact, currentReply)}>
                    <Send size={15} />
                    Open SMS
                  </a>
                )}
              </div>
            </section>

            <section className="email-bridge-panel">
              <h3>iMessage bridge</h3>
              <iframe
                sandbox="allow-forms allow-scripts"
                src={bridgeSrc}
                srcDoc={bridgeSrc ? undefined : bridgePreview}
                title={`iMessage bridge for ${contact.name}`}
              />
            </section>
          </>
        ) : null}
      </div>
    </aside>
  );
}

export function ContactbookWorkspace() {
  const [state, setState] = useState<ContactLoopState>({ contacts: [], activities: [] });
  const [activeView, setActiveView] = useState<ContactBookViewId>("all");
  const [query, setQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState("Contacts not pulled yet");
  const [pulling, setPulling] = useState(false);
  const hasAutoPulledRef = useRef(false);

  const selectedView = contactBookViews.find((view) => view.id === activeView) ?? contactBookViews[0];

  const visibleContacts = useMemo(() => {
    return filterContactsByView(state.contacts, activeView).filter((contact) => contactMatchesQuery(contact, query));
  }, [activeView, query, state.contacts]);

  const selectedContact =
    visibleContacts.find((contact) => contact.id === selectedContactId) ??
    state.contacts.find((contact) => contact.id === selectedContactId) ??
    visibleContacts[0] ??
    null;

  function handleUpdateContact(id: string, patch: Partial<Contact>) {
    setState((current) => ({
      ...current,
      contacts: current.contacts.map((contact) =>
        contact.id === id
          ? {
              ...contact,
              ...patch,
              metadata: {
                ...contact.metadata,
                ...(patch.metadata ?? {})
              },
              lastTouchAt: new Date().toISOString()
            }
          : contact
      )
    }));
  }

  function handleDeleteContact(id: string) {
    setState((current) => {
      const nextContacts = current.contacts.filter((contact) => contact.id !== id);
      return {
        contacts: nextContacts,
        activities: current.activities.filter((activity) => activity.contactId !== id)
      };
    });
    setSelectedContactId((current) => (current === id ? null : current));
  }

  function handleAddContact() {
    const nextState = recordContactActivity(state, {
      type: "note",
      channel: "manual",
      label: "Added manually from FC Men contactbook.",
      name: "New contact",
      source: "Manual add",
      metadata: { category: "manual" }
    });

    setState(nextState);
    setSelectedContactId(nextState.contacts[0]?.id ?? null);
    setActiveView("all");
  }

  function handleRecordActivity(event: RecordContactActivityEvent) {
    setState((current) => recordContactActivity(current, event));
  }

  async function handlePullAll() {
    try {
      setPulling(true);
      setQueueStatus("Pulling contacts and conversations...");
      const response = await fetch("/api/contactbook/pull", { cache: "no-store" });
      const payload = (await response.json()) as PullResponse;

      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Pull request failed");
      }

      const seededState: ContactLoopState = {
        contacts: payload.contacts,
        activities: []
      };
      const nextState = payload.events.reduce(
        (currentState, event) => recordContactActivity(currentState, event),
        seededState
      );
      const firstPulled = payload.contacts[0]?.id ?? nextState.contacts[0]?.id ?? null;

      setState(nextState);
      setActiveView("all");
      setQuery("");
      setSelectedContactId(firstPulled);
      setQueueStatus(
        `Pulled ${payload.contacts.length} contacts and ${payload.events.length} conversation event${
          payload.events.length === 1 ? "" : "s"
        } from ${payload.source?.contacts ?? "mock"} / ${payload.source?.conversations ?? "mock"}.`
      );
    } catch (error) {
      setQueueStatus(error instanceof Error ? error.message : "Could not pull contacts and conversations");
    } finally {
      setPulling(false);
    }
  }

  useEffect(() => {
    if (hasAutoPulledRef.current) return;
    hasAutoPulledRef.current = true;
    void handlePullAll();
    // Run once on mount to mirror use.email's initial contact load.
  }, []);

  return (
    <main className="email-shell">
      <ContactBookRail
        activeView={activeView}
        contacts={state.contacts}
        onSelectView={(viewId) => {
          setActiveView(viewId);
          setSelectedContactId(filterContactsByView(state.contacts, viewId)[0]?.id ?? null);
        }}
      />

      <section className="email-main">
        <div className="email-product-bar">
          <span>use.email / FC Men contacts</span>
          <Link href="/rsvp?fillId=sample-fill&source=contactbook">Open RSVP sample</Link>
        </div>

        <header className="email-toolbar">
          <div className="email-title">
            <input aria-label="Contact book title" readOnly value={selectedView.title} />
            <textarea aria-label="Contact book description" readOnly value={selectedView.description} />
          </div>

          <div className="email-actions">
            <label className="email-search">
              <Search size={16} />
              <input
                aria-label="Search contacts"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search contacts"
                value={query}
              />
            </label>
            <button className="email-secondary-button" disabled type="button">
              <Upload size={15} />
              Import
            </button>
            <button className="email-secondary-button" disabled type="button">
              <Download size={15} />
              Export
            </button>
            <button className="email-primary-button" onClick={handlePullAll} disabled={pulling} type="button">
              <RefreshCcw size={15} />
              {pulling ? "Pulling..." : "Pull all"}
            </button>
            <button className="email-secondary-button" onClick={handleAddContact} type="button">
              <Plus size={15} />
              Add contact
            </button>
          </div>
        </header>

        <div className="email-queue-note">{queueStatus}</div>

        {visibleContacts.length > 0 ? (
          <ContactsGrid
            contacts={visibleContacts}
            onDeleteContact={handleDeleteContact}
            onSelectContact={setSelectedContactId}
            onUpdateContact={handleUpdateContact}
            selectedContactId={selectedContact?.id ?? null}
          />
        ) : (
          <div className="email-empty-grid">
            <Search size={20} />
            No matching contacts.
          </div>
        )}
      </section>

      <ContactDetails
        activities={state.activities}
        contact={selectedContact}
        key={selectedContact?.id ?? "empty-contact-detail"}
        onRecordActivity={handleRecordActivity}
        onUpdateContact={handleUpdateContact}
      />
    </main>
  );
}
