import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Database,
  MessageSquareText,
  Save,
  Send,
  UsersRound
} from "lucide-react";
import { queueSmsBlast, saveSmsBlastDraft } from "./actions";
import { listSmsBlasts, type SmsBlast } from "@/lib/sms-blasts";

const suggestedBlasts: SmsBlast[] = [
  {
    id: "conference-reminder",
    title: "Conference reminder",
    audience: "@detroitmetromen contacts",
    channel: "sms",
    status: "draft",
    message: "Reminder: FC Men is coming up. Reply YES if you want the registration link again.",
    estimatedRecipients: null,
    createdAt: "2026-06-24T16:00:00.000Z",
    sentAt: null
  },
  {
    id: "rsvp-nudge",
    title: "RSVP nudge",
    audience: "@detroitmetromen contacts",
    channel: "sms",
    status: "draft",
    message: "Hey! Want to join the next Detroit Metro Men gathering? Reply YES and we will send the details.",
    estimatedRecipients: null,
    createdAt: "2026-06-24T16:00:00.000Z",
    sentAt: null
  },
  {
    id: "follow-up",
    title: "Post-event follow-up",
    audience: "@detroitmetromen contacts",
    channel: "sms",
    status: "draft",
    message: "Thanks for connecting with Detroit Metro Men. What is the best next step for you right now?",
    estimatedRecipients: null,
    createdAt: "2026-06-24T16:00:00.000Z",
    sentAt: null
  }
];

const statusCopy: Record<string, { tone: "success" | "warning"; text: string }> = {
  queued: {
    tone: "success",
    text: "Blast queued in sms_blasts."
  },
  draft: {
    tone: "success",
    text: "Draft saved in sms_blasts."
  },
  "message-too-short": {
    tone: "warning",
    text: "Write a little more before sending the blast."
  },
  "save-failed": {
    tone: "warning",
    text: "Could not save the blast. Check the sms_blasts table and Supabase credentials."
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
  const blasts = result.blasts.length > 0 ? result.blasts : suggestedBlasts;

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

            <label>
              <span>Text message</span>
              <textarea
                name="message"
                rows={7}
                maxLength={480}
                required
                defaultValue="Hey! Quick Detroit Metro Men update: "
              />
            </label>

            <div className="blast-compose-meta">
              <span>
                <UsersRound size={15} />
                Audience: @detroitmetromen contacts
              </span>
              <span>
                <Database size={15} />
                Saves to sms_blasts
              </span>
            </div>

            <div className="blast-button-row">
              <button className="blast-secondary-button" type="submit" formAction={saveSmsBlastDraft}>
                <Save size={16} />
                Save draft
              </button>
              <button className="blast-send-button" type="submit" formAction={queueSmsBlast}>
                <Send size={16} />
                Send blast
              </button>
            </div>
          </form>

          <div className="stack-list blast-list" aria-label="SMS blasts">
            {blasts.map((blast) => {
              const isSent = blast.status === "sent";
              const Icon = isSent ? CheckCircle2 : blast.status === "queued" ? Send : CalendarClock;

              return (
                <article className="data-row" key={blast.id}>
                  <div className="row-top">
                    <div className="row-copy">
                      <div className="row-title">{blast.title}</div>
                      <div className="row-meta">{blast.audience}</div>
                    </div>
                    <span className="pill">{blast.status}</span>
                  </div>
                  <div className="row-body">{blast.message}</div>
                  <div className="mini-actions">
                    <span className="mini-action">
                      <Icon size={15} />
                      {isSent ? "Sent" : blast.status === "queued" ? "Queued" : "Draft"}
                    </span>
                    <span className="mini-action">
                      <UsersRound size={15} />
                      {blast.estimatedRecipients === null ? "Audience pending" : `${blast.estimatedRecipients} contacts`}
                    </span>
                    <span className="mini-action">
                      <CalendarClock size={15} />
                      {formatBlastDate(blast.sentAt ?? blast.createdAt)}
                    </span>
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
