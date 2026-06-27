import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  MessageSquareText,
  Send,
  Trash2,
  UsersRound
} from "lucide-react";
import { deleteSavedSmsBlast } from "./actions";
import { BlastComposeForm, ImportBlastToEditorButton, SavedBlastSendActions } from "./blast-send-controls";
import { listSmsBlasts } from "@/lib/sms-blasts";

const statusCopy: Record<string, { tone: "success" | "warning"; text: string }> = {
  queued: {
    tone: "success",
    text: "Blast is being processed from sms_blasts."
  },
  sent: {
    tone: "success",
    text: "Blast sent to eligible @detroitmetromen contacts."
  },
  "sent-existing": {
    tone: "success",
    text: "Saved blast sent to eligible @detroitmetromen contacts."
  },
  draft: {
    tone: "success",
    text: "Draft saved in sms_blasts."
  },
  scheduled: {
    tone: "success",
    text: "Blast scheduled. The cron checks due queued blasts every 30 minutes."
  },
  deleted: {
    tone: "success",
    text: "Blast deleted from sms_blasts."
  },
  "message-too-short": {
    tone: "warning",
    text: "Write a little more before sending the blast."
  },
  "save-failed": {
    tone: "warning",
    text: "Could not save the blast. Check the sms_blasts table and Supabase credentials."
  },
  "send-failed": {
    tone: "warning",
    text: "The blast was saved, but no messages were delivered."
  },
  "delete-failed": {
    tone: "warning",
    text: "Could not delete the blast."
  },
  "schedule-failed": {
    tone: "warning",
    text: "Could not schedule the blast."
  }
};

type ConversationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatBlastDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getStatus(searchParams: Record<string, string | string[] | undefined>) {
  const status = searchParams.status;
  return typeof status === "string" ? statusCopy[status] : null;
}

export default async function ConversationsPage({ searchParams }: ConversationsPageProps) {
  const params = searchParams ? await searchParams : {};
  const status = getStatus(params);
  const result = await listSmsBlasts();
  const blasts = result.blasts;
  const hasDatabaseBlasts = result.source === "sms_blasts";

  return (
    <main className="shell blast-shell">
      <section className="hub blast-hub" aria-labelledby="page-title">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <MessageSquareText size={30} strokeWidth={2.2} />
          </div>
          <p className="eyebrow">FC Men</p>
          <h1 id="page-title">SMS blasts</h1>
          <p className="lead">
            Send one clean text blast to the Detroit Metro Men contact audience.
          </p>
        </div>

        <div className="stat-grid" aria-label="Blast overview">
          <div className="stat">
            <span className="stat-value">{blasts.length}</span>
            <span className="stat-label">blasts</span>
          </div>
          <div className="stat">
            <span className="stat-value">@</span>
            <span className="stat-label">detroitmetromen</span>
          </div>
          <div className="stat">
            <span className="stat-value">SMS</span>
            <span className="stat-label">{result.source === "sms_blasts" ? "sms_blasts" : "draft mode"}</span>
          </div>
        </div>

        {status ? <div className={`blast-alert blast-alert-${status.tone}`}>{status.text}</div> : null}
        {result.error ? <div className="blast-alert blast-alert-warning">{result.error}</div> : null}

        <div className="blast-layout">
          <BlastComposeForm />

          <div className="stack-list blast-list" aria-label="SMS blasts">
            {blasts.map((blast) => {
              const isSent = blast.status === "sent";
              const isScheduled = blast.status === "queued" && Boolean(blast.scheduledAt);
              const Icon = isSent ? CheckCircle2 : blast.status === "queued" ? Send : CalendarClock;
              const statusLabel = isSent ? "Sent" : isScheduled ? "Scheduled" : blast.status === "queued" ? "Queued" : "Draft";

              return (
                <article className="data-row" key={blast.id}>
                  <div className="row-top">
                    <div className="row-copy">
                      <div className="row-title">{blast.title}</div>
                      <div className="row-meta">{blast.audience}</div>
                    </div>
                    <span className="pill">{statusLabel.toLowerCase()}</span>
                  </div>
                  {blast.messages.length > 1 ? (
                    <div className="blast-message-list">
                      {blast.messages.map((message, index) => (
                        <div className="blast-message-part" key={`${blast.id}-${index}`}>
                          <span>{index + 1}</span>
                          <p>{message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="row-body">{blast.message}</div>
                  )}
                  {blast.errorMessage ? <div className="row-error">{blast.errorMessage}</div> : null}
                  {blast.deliveryLog ? <div className="row-log">{blast.deliveryLog}</div> : null}
                  <div className="mini-actions">
                    <span className="mini-action">
                      <Icon size={15} />
                      {statusLabel}
                    </span>
                    <span className="mini-action">
                      <UsersRound size={15} />
                      {blast.estimatedRecipients === null ? "Audience pending" : `${blast.estimatedRecipients} contacts`}
                    </span>
                    <span className="mini-action">
                      <CalendarClock size={15} />
                      {formatBlastDate(blast.sentAt ?? blast.scheduledAt ?? blast.createdAt)}
                    </span>
                    {hasDatabaseBlasts ? (
                      <ImportBlastToEditorButton title={blast.title} messages={blast.messages.length > 0 ? blast.messages : [blast.message]} />
                    ) : null}
                    {hasDatabaseBlasts ? (
                      <SavedBlastSendActions blastId={blast.id} isSent={isSent} />
                    ) : null}
                    {hasDatabaseBlasts ? (
                      <form action={deleteSavedSmsBlast}>
                        <input type="hidden" name="blastId" value={blast.id} />
                        <button className="mini-action mini-action-button mini-action-danger" type="submit">
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <Link className="footer-link" href="/">
          <ArrowLeft size={16} />
          Back to FC Men
        </Link>
      </section>
    </main>
  );
}
