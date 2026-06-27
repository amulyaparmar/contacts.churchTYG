"use client";

import { useId, useState } from "react";
import {
  CalendarClock,
  Database,
  Filter,
  MessageSquarePlus,
  Phone,
  Plus,
  Save,
  Send,
  Trash2,
  UsersRound,
  X
} from "lucide-react";
import { queueSmsBlast, saveSmsBlastDraft, scheduleSmsBlast, sendSavedSmsBlast } from "./actions";

const defaultMessages = ["Hey! Quick Detroit Metro Men update: ", "Registration link: "];

type AudienceDialogProps = {
  id: string;
  title: string;
  confirmLabel: string;
  confirmAction: (formData: FormData) => Promise<void>;
  audienceSummary?: string;
  showAudienceFields?: boolean;
  onClose: () => void;
};

function AudienceFields({
  mode,
  audienceFilter,
  specificNumber,
  onModeChange,
  onAudienceFilterChange,
  onSpecificNumberChange
}: {
  mode: "all" | "specific";
  audienceFilter: string;
  specificNumber: string;
  onModeChange: (mode: "all" | "specific") => void;
  onAudienceFilterChange: (filter: string) => void;
  onSpecificNumberChange: (phone: string) => void;
}) {
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
            Specific number
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
        <label className="blast-modal-field">
          <span>
            <Phone size={15} />
            Phone number
          </span>
          <input
            name="specificNumber"
            inputMode="tel"
            placeholder="+13135551212"
            required
            value={specificNumber}
            onChange={(event) => onSpecificNumberChange(event.target.value)}
          />
        </label>
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
  const [specificNumber, setSpecificNumber] = useState("");

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
            specificNumber={specificNumber}
            onModeChange={setMode}
            onAudienceFilterChange={setAudienceFilter}
            onSpecificNumberChange={setSpecificNumber}
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
          <button className="blast-send-button" type="submit" formAction={confirmAction}>
            <Send size={16} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BlastComposeForm() {
  const dialogId = useId();
  const [messages, setMessages] = useState(defaultMessages);
  const [sendOpen, setSendOpen] = useState(false);
  const [audienceMode, setAudienceMode] = useState<"all" | "specific">("all");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [specificNumber, setSpecificNumber] = useState("");
  const audienceSummary =
    audienceMode === "specific"
      ? specificNumber.trim()
        ? `Specific number: ${specificNumber.trim()}`
        : "Specific number selected"
      : audienceFilter.trim()
        ? `All @detroitmetromen contacts filtered by "${audienceFilter.trim()}"`
        : "All @detroitmetromen contacts";

  function updateMessage(index: number, value: string) {
    setMessages((current) => current.map((message, messageIndex) => (messageIndex === index ? value : message)));
  }

  function removeMessage(index: number) {
    setMessages((current) => current.filter((_, messageIndex) => messageIndex !== index));
  }

  return (
    <form className="blast-compose" action={queueSmsBlast}>
      <div className="blast-compose-head">
        <div>
          <p className="eyebrow">Send blast</p>
          <h2>Message @detroitmetromen contacts</h2>
        </div>
        <Send size={22} aria-hidden="true" />
      </div>

      <label>
        <span>Blast name</span>
        <input name="title" defaultValue="Detroit Metro Men update" maxLength={80} />
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
        specificNumber={specificNumber}
        onModeChange={setAudienceMode}
        onAudienceFilterChange={setAudienceFilter}
        onSpecificNumberChange={setSpecificNumber}
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

export function SavedBlastSendButton({ blastId }: { blastId: string }) {
  const dialogId = useId();
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <form action={sendSavedSmsBlast}>
      <input type="hidden" name="blastId" value={blastId} />
      <button className="mini-action mini-action-button" type="button" onClick={() => setSendOpen(true)}>
        <Send size={15} />
        Send now
      </button>
      {sendOpen ? (
        <AudienceDialog
          id={dialogId}
          title="Send saved blast?"
          confirmLabel="Send saved blast"
          confirmAction={sendSavedSmsBlast}
          showAudienceFields
          onClose={() => setSendOpen(false)}
        />
      ) : null}
    </form>
  );
}
