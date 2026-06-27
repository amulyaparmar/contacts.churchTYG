"use client";

import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Database,
  Filter,
  LoaderCircle,
  MessageSquarePlus,
  Phone,
  Plus,
  Save,
  Send,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import { useFormStatus } from "react-dom";
import { queueSmsBlast, saveSmsBlastDraft, scheduleSmsBlast, sendSavedSmsBlast } from "./actions";

const defaultMessages = ["Hey! Quick Detroit Metro Men update: ", "Registration link: "];

type AudienceContact = {
  id: string;
  name: string;
  phone: string;
  provider: string;
  suppressed: boolean;
  suppressionReason: string | null;
  filterText: string;
};

type ImportBlastDetail = {
  title: string;
  messages: string[];
};

type AudienceDialogProps = {
  id: string;
  title: string;
  confirmLabel: string;
  confirmAction: (formData: FormData) => Promise<void>;
  audienceSummary?: string;
  showAudienceFields?: boolean;
  onClose: () => void;
};

function SendSubmitButton({
  children,
  className = "blast-send-button",
  formAction
}: {
  children: ReactNode;
  className?: string;
  formAction?: (formData: FormData) => Promise<void>;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" formAction={formAction} disabled={pending} aria-disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle className="blast-loading-icon" size={16} />
          Sending...
        </>
      ) : (
        children
      )}
    </button>
  );
}

function AudienceFields({
  mode,
  audienceFilter,
  manualNumbers,
  selectedContactIds,
  onModeChange,
  onAudienceFilterChange,
  onManualNumbersChange,
  onSelectedContactIdsChange
}: {
  mode: "all" | "specific";
  audienceFilter: string;
  manualNumbers: string;
  selectedContactIds: string[];
  onModeChange: (mode: "all" | "specific") => void;
  onAudienceFilterChange: (filter: string) => void;
  onManualNumbersChange: (numbers: string) => void;
  onSelectedContactIdsChange: (contactIds: string[]) => void;
}) {
  const [contacts, setContacts] = useState<AudienceContact[]>([]);
  const [contactsError, setContactsError] = useState("");
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const selectedContactSet = useMemo(() => new Set(selectedContactIds), [selectedContactIds]);
  const selectedContacts = contacts.filter((contact) => selectedContactSet.has(contact.id));
  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts.slice(0, 8);
    return contacts
      .filter((contact) => `${contact.name} ${contact.phone} ${contact.provider} ${contact.filterText}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [contactSearch, contacts]);

  useEffect(() => {
    if (mode !== "specific" || contactsLoaded || contactsError) return;

    let active = true;

    fetch("/api/sms-blasts", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ dryRun: true })
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          preview?: { recipients?: AudienceContact[] };
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Could not load contacts.");
        return payload.preview?.recipients ?? [];
      })
      .then((recipients) => {
        if (!active) return;
        setContacts(recipients);
        setContactsLoaded(true);
      })
      .catch((error) => {
        if (!active) return;
        setContactsError(error instanceof Error ? error.message : "Could not load contacts.");
        setContactsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [contactsError, contactsLoaded, mode]);

  function toggleContact(contactId: string) {
    onSelectedContactIdsChange(
      selectedContactSet.has(contactId)
        ? selectedContactIds.filter((selectedId) => selectedId !== contactId)
        : [...selectedContactIds, contactId]
    );
  }

  return (
    <div className="blast-audience-panel">
      <fieldset className="blast-audience-options">
        <legend>Send to</legend>
        <label className={mode === "all" ? "blast-audience-option blast-audience-option-active" : "blast-audience-option"}>
          <input
            type="radio"
            name="audienceMode"
            value="all"
            checked={mode === "all"}
            onChange={() => onModeChange("all")}
          />
          <span>
            <UsersRound size={18} />
            All @detroitmetromen contacts
          </span>
        </label>
        <label className={mode === "specific" ? "blast-audience-option blast-audience-option-active" : "blast-audience-option"}>
          <input
            type="radio"
            name="audienceMode"
            value="specific"
            checked={mode === "specific"}
            onChange={() => onModeChange("specific")}
          />
          <span>
            <Phone size={18} />
            Specific contacts
          </span>
        </label>
      </fieldset>

      {mode === "all" ? (
        <label className="blast-modal-field">
          <span>
            <Filter size={15} />
            Filter
          </span>
          <input
            name="audienceFilter"
            placeholder="name, phone, status, or tag"
            value={audienceFilter}
            onChange={(event) => onAudienceFilterChange(event.target.value)}
          />
        </label>
      ) : (
        <div className="blast-specific-targets">
          {selectedContactIds.map((contactId) => (
            <input key={contactId} type="hidden" name="contactIds" value={contactId} />
          ))}
          <label className="blast-modal-field">
            <span>
              <Filter size={15} />
              Search contacts
            </span>
            <input
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder="name, phone, status, or tag"
            />
          </label>

          {selectedContacts.length > 0 ? (
            <div className="blast-selected-contacts" aria-label="Selected contacts">
              {selectedContacts.map((contact) => (
                <button type="button" key={contact.id} onClick={() => toggleContact(contact.id)}>
                  <X size={13} />
                  {contact.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="blast-contact-results">
            {!contactsLoaded && !contactsError ? <div className="blast-contact-empty">Loading contacts...</div> : null}
            {contactsError ? <div className="blast-contact-empty">{contactsError}</div> : null}
            {contactsLoaded && !contactsError && filteredContacts.length === 0 ? (
              <div className="blast-contact-empty">No contacts match that search.</div>
            ) : null}
            {filteredContacts.map((contact) => (
              <label
                className={selectedContactSet.has(contact.id) ? "blast-contact-result blast-contact-result-selected" : "blast-contact-result"}
                key={contact.id}
              >
                <input
                  type="checkbox"
                  checked={selectedContactSet.has(contact.id)}
                  onChange={() => toggleContact(contact.id)}
                />
                <span>
                  <strong>{contact.name}</strong>
                  <small>{contact.phone || contact.provider}</small>
                </span>
                {contact.suppressed ? <em>suppressed</em> : null}
              </label>
            ))}
          </div>

          <label className="blast-modal-field">
            <span>
              <Phone size={15} />
              Add phone numbers
            </span>
            <textarea
              name="specificNumbers"
              rows={3}
              placeholder="+13135551212, +12485551212"
              value={manualNumbers}
              onChange={(event) => onManualNumbersChange(event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function AudienceDialog({
  id,
  title,
  confirmLabel,
  confirmAction,
  audienceSummary,
  showAudienceFields = false,
  onClose
}: AudienceDialogProps) {
  const [mode, setMode] = useState<"all" | "specific">("all");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  return (
    <div className="blast-modal" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <button className="blast-modal-backdrop" type="button" aria-label="Close send options" onClick={onClose} />
      <div className="blast-modal-panel">
        <div className="blast-modal-head">
          <div>
            <p className="eyebrow">Send options</p>
            <h3 id={`${id}-title`}>{title}</h3>
          </div>
          <button className="blast-icon-button" type="button" aria-label="Close send options" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {showAudienceFields ? (
          <AudienceFields
            mode={mode}
            audienceFilter={audienceFilter}
            manualNumbers={manualNumbers}
            selectedContactIds={selectedContactIds}
            onModeChange={setMode}
            onAudienceFilterChange={setAudienceFilter}
            onManualNumbersChange={setManualNumbers}
            onSelectedContactIdsChange={setSelectedContactIds}
          />
        ) : (
          <div className="blast-confirm-summary">
            <UsersRound size={17} />
            <span>{audienceSummary}</span>
          </div>
        )}

        <div className="blast-modal-actions">
          <button className="blast-secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <SendSubmitButton formAction={confirmAction}>
            <Send size={16} />
            {confirmLabel}
          </SendSubmitButton>
        </div>
      </div>
    </div>
  );
}

export function BlastComposeForm() {
  const dialogId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("Detroit Metro Men update");
  const [messages, setMessages] = useState(defaultMessages);
  const [sendOpen, setSendOpen] = useState(false);
  const [audienceMode, setAudienceMode] = useState<"all" | "specific">("all");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const manualNumberCount = manualNumbers
    .split(/[\n,;]+/)
    .map((number) => number.trim())
    .filter(Boolean).length;
  const specificTargetCount = selectedContactIds.length + manualNumberCount;
  const audienceSummary =
    audienceMode === "specific"
      ? specificTargetCount > 0
        ? `Specific contacts: ${specificTargetCount} selected`
        : "Specific contacts selected"
      : audienceFilter.trim()
        ? `All @detroitmetromen contacts filtered by "${audienceFilter.trim()}"`
        : "All @detroitmetromen contacts";

  function updateMessage(index: number, value: string) {
    setMessages((current) => current.map((message, messageIndex) => (messageIndex === index ? value : message)));
  }

  function removeMessage(index: number) {
    setMessages((current) => current.filter((_, messageIndex) => messageIndex !== index));
  }

  useEffect(() => {
    function importBlast(event: Event) {
      const detail = (event as CustomEvent<ImportBlastDetail>).detail;
      const importedMessages = detail.messages.map((message) => message.trim()).filter(Boolean);

      setTitle(detail.title.trim() || "Imported SMS blast");
      setMessages(importedMessages.length > 0 ? importedMessages : [""]);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    window.addEventListener("contacts:import-blast", importBlast);
    return () => window.removeEventListener("contacts:import-blast", importBlast);
  }, []);

  return (
    <form className="blast-compose" action={queueSmsBlast} ref={formRef}>
      <div className="blast-compose-head">
        <div>
          <p className="eyebrow">Send blast</p>
          <h2>Message @detroitmetromen contacts</h2>
        </div>
        <Send size={22} aria-hidden="true" />
      </div>

      <label>
        <span>Blast name</span>
        <input name="title" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} />
      </label>

      <div className="blast-message-editor">
        {messages.map((message, index) => (
          <label className="blast-message-field" key={index}>
            <span>Message {index + 1}</span>
            <textarea
              name="messages"
              rows={index === 0 ? 5 : 4}
              maxLength={480}
              required={index === 0}
              value={message}
              onChange={(event) => updateMessage(index, event.target.value)}
            />
            {messages.length > 1 ? (
              <button className="blast-remove-message" type="button" onClick={() => removeMessage(index)}>
                <Trash2 size={14} />
                Remove
              </button>
            ) : null}
          </label>
        ))}
        <button className="blast-add-message" type="button" onClick={() => setMessages((current) => [...current, ""])}>
          <Plus size={16} />
          Add message
        </button>
      </div>

      <div className="blast-compose-meta">
        <span>
          <MessageSquarePlus size={15} />
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </span>
        <span>
          <Database size={15} />
          Saves to sms_blasts
        </span>
      </div>

      <AudienceFields
        mode={audienceMode}
        audienceFilter={audienceFilter}
        manualNumbers={manualNumbers}
        selectedContactIds={selectedContactIds}
        onModeChange={setAudienceMode}
        onAudienceFilterChange={setAudienceFilter}
        onManualNumbersChange={setManualNumbers}
        onSelectedContactIdsChange={setSelectedContactIds}
      />

      <label>
        <span>Schedule time</span>
        <input name="scheduledAt" type="datetime-local" />
      </label>

      <div className="blast-button-row">
        <button className="blast-secondary-button" type="submit" formAction={saveSmsBlastDraft}>
          <Save size={16} />
          Save draft
        </button>
        <button className="blast-secondary-button" type="submit" formAction={scheduleSmsBlast}>
          <CalendarClock size={16} />
          Schedule
        </button>
        <button className="blast-send-button" type="button" onClick={() => setSendOpen(true)}>
          <Send size={16} />
          Send blast
        </button>
      </div>

      {sendOpen ? (
        <AudienceDialog
          id={dialogId}
          title="Send this blast?"
          confirmLabel="Send blast"
          confirmAction={queueSmsBlast}
          audienceSummary={audienceSummary}
          onClose={() => setSendOpen(false)}
        />
      ) : null}
    </form>
  );
}

export function ImportBlastToEditorButton({ title, messages }: { title: string; messages: string[] }) {
  return (
    <button
      className="mini-action mini-action-button"
      type="button"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent<ImportBlastDetail>("contacts:import-blast", {
            detail: {
              title,
              messages
            }
          })
        );
      }}
    >
      <MessageSquarePlus size={15} />
      Import to editor
    </button>
  );
}

export function SavedBlastSendActions({ blastId, isSent }: { blastId: string; isSent: boolean }) {
  const dialogId = useId();
  const [sendOpen, setSendOpen] = useState(false);
  const allContactsLabel = isSent ? "Resend to all" : "Send to all";

  return (
    <>
      <form action={sendSavedSmsBlast}>
        <input type="hidden" name="blastId" value={blastId} />
        <input type="hidden" name="audienceMode" value="all" />
        <SendSubmitButton className="mini-action mini-action-button">
          <Send size={15} />
          {allContactsLabel}
        </SendSubmitButton>
      </form>
      <form action={sendSavedSmsBlast}>
        <input type="hidden" name="blastId" value={blastId} />
        <button className="mini-action mini-action-button" type="button" onClick={() => setSendOpen(true)}>
          <Filter size={15} />
          Send options
        </button>
        {sendOpen ? (
          <AudienceDialog
            id={dialogId}
            title={isSent ? "Resend saved blast?" : "Send saved blast?"}
            confirmLabel={isSent ? "Resend saved blast" : "Send saved blast"}
            confirmAction={sendSavedSmsBlast}
            showAudienceFields
            onClose={() => setSendOpen(false)}
          />
        ) : null}
      </form>
    </>
  );
}
