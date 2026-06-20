import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, MessageCircle, Send } from "lucide-react";

const conversations = [
  {
    title: "Event reminder sequence",
    person: "Registered attendees",
    status: "Draft",
    note: "Send a short reminder with time, location, and what to bring.",
    icon: Send
  },
  {
    title: "First-time guest check-in",
    person: "New FC Men contacts",
    status: "Due today",
    note: "Ask how the event landed and offer one concrete next step.",
    icon: Clock3
  },
  {
    title: "Volunteer thank-you",
    person: "Serve team",
    status: "Ready",
    note: "Send appreciation and capture feedback while details are fresh.",
    icon: CheckCircle2
  }
];

export default function ConversationsPage() {
  return (
    <main className="shell">
      <section className="hub" aria-labelledby="page-title">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <MessageCircle size={30} strokeWidth={2.2} />
          </div>
          <p className="eyebrow">FC Men</p>
          <h1 id="page-title">Conversations</h1>
          <p className="lead">A dedicated conversation workspace for FC Men.</p>
        </div>

        <div className="stat-grid" aria-label="Conversation overview">
          <div className="stat">
            <span className="stat-value">3</span>
            <span className="stat-label">flows</span>
          </div>
          <div className="stat">
            <span className="stat-value">1</span>
            <span className="stat-label">due today</span>
          </div>
          <div className="stat">
            <span className="stat-value">2</span>
            <span className="stat-label">ready</span>
          </div>
        </div>

        <div className="stack-list">
          {conversations.map((conversation) => {
            const Icon = conversation.icon;

            return (
              <article className="data-row" key={conversation.title}>
                <div className="row-top">
                  <div className="row-copy">
                    <div className="row-title">{conversation.title}</div>
                    <div className="row-meta">{conversation.person}</div>
                  </div>
                  <span className="pill">{conversation.status}</span>
                </div>
                <div className="row-body">{conversation.note}</div>
                <div className="mini-actions">
                  <span className="mini-action">
                    <Icon size={15} />
                    Open flow
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        <Link className="footer-link" href="/">
          <ArrowLeft size={16} />
          Back to FC Men
        </Link>
      </section>
    </main>
  );
}
