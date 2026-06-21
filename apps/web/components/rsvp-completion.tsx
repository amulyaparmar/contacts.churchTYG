"use client";

import { Check, MapPin, Waves } from "lucide-react";
import { useState } from "react";

type RsvpCompletionProps = {
  actionLabel: string;
  attendeeName: string;
  fillId: string;
  source: string;
  ticketTitle: string;
};

export function RsvpCompletion({
  actionLabel,
  attendeeName,
  fillId,
  source,
  ticketTitle
}: RsvpCompletionProps) {
  const [isComplete, setIsComplete] = useState(false);

  if (isComplete) {
    return (
      <section className="rsvp-complete-card" aria-live="polite">
        <div className="rsvp-complete-mark" aria-hidden="true">
          <span>
            <Check size={34} />
          </span>
        </div>
        <div className="rsvp-complete-copy">
          <p className="rsvp-complete-kicker">
            <Waves size={18} />
            RSVP stop saved
          </p>
          <h2>{attendeeName ? `${attendeeName}, you're on the list.` : "You're on the list."}</h2>
          <p>
            We captured this sample RSVP for <strong>{ticketTitle}</strong>. Later, this
            can write back to contactbook, the conversation, or an invite record using
            fill ID <strong>{fillId}</strong>.
          </p>
        </div>
        <div className="rsvp-complete-address">
          <MapPin size={20} />
          <span>
            <strong>First Church Sterling Heights</strong>
            39400 Dequindre Rd, Sterling Heights, MI 48310
          </span>
        </div>
        <p className="rsvp-complete-meta">Source: {source}</p>
      </section>
    );
  }

  return (
    <button className="rsvp-pay-button" onClick={() => setIsComplete(true)} type="button">
      {actionLabel}
    </button>
  );
}
