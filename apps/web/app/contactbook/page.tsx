import Link from "next/link";
import { ArrowLeft, BookUser, Mail, MessageSquare, Phone } from "lucide-react";

const contacts = [
  {
    name: "New guest follow-up",
    role: "First-time FC Men connection",
    status: "Today",
    note: "Capture name, phone, and preferred next step after the event.",
    actions: ["Text", "Call", "Email"]
  },
  {
    name: "Table host list",
    role: "Event leaders and hosts",
    status: "Active",
    note: "Keep table assignments, attendance notes, and prayer requests together.",
    actions: ["Text", "Call"]
  },
  {
    name: "Serve team",
    role: "Volunteers and setup crew",
    status: "Ready",
    note: "Track availability, reminders, and post-event thank-you messages.",
    actions: ["Text", "Email"]
  }
];

export default function ContactbookPage() {
  return (
    <main className="shell">
      <section className="hub" aria-labelledby="page-title">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <BookUser size={30} strokeWidth={2.2} />
          </div>
          <p className="eyebrow">FC Men</p>
          <h1 id="page-title">Contactbook</h1>
          <p className="lead">A dedicated contactbook workspace for FC Men.</p>
        </div>

        <div className="stat-grid" aria-label="Contactbook overview">
          <div className="stat">
            <span className="stat-value">3</span>
            <span className="stat-label">starter lists</span>
          </div>
          <div className="stat">
            <span className="stat-value">9</span>
            <span className="stat-label">next actions</span>
          </div>
          <div className="stat">
            <span className="stat-value">0</span>
            <span className="stat-label">overdue</span>
          </div>
        </div>

        <div className="stack-list">
          {contacts.map((contact) => (
            <article className="data-row" key={contact.name}>
              <div className="row-top">
                <div className="row-copy">
                  <div className="row-title">{contact.name}</div>
                  <div className="row-meta">{contact.role}</div>
                </div>
                <span className="pill">{contact.status}</span>
              </div>
              <div className="row-body">{contact.note}</div>
              <div className="mini-actions" aria-label={`${contact.name} actions`}>
                {contact.actions.includes("Text") ? (
                  <span className="mini-action">
                    <MessageSquare size={15} />
                    Text
                  </span>
                ) : null}
                {contact.actions.includes("Call") ? (
                  <span className="mini-action">
                    <Phone size={15} />
                    Call
                  </span>
                ) : null}
                {contact.actions.includes("Email") ? (
                  <span className="mini-action">
                    <Mail size={15} />
                    Email
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <Link className="footer-link" href="/">
          <ArrowLeft size={16} />
          Back to FC Men
        </Link>
      </section>
    </main>
  );
}
