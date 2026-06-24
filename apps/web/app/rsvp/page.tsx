import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CirclePlus,
  CreditCard,
  Mail,
  Phone,
  Ticket,
  UserRound
} from "lucide-react";
import { RsvpCompletion } from "@/components/rsvp-completion";

type RawSearchParams = Record<string, string | string[] | undefined>;

type RsvpPageProps = {
  searchParams?: Promise<RawSearchParams>;
};

const tickets = [
  {
    id: "full",
    title: "Full Conference with Breakfast",
    meta: "Friday service, Saturday sessions, and men's breakfast",
    price: 10
  },
  {
    id: "friday",
    title: "Free Friday Night Service",
    meta: "Friday worship and word service",
    price: 0
  },
  {
    id: "saturday-breakfast",
    title: "Saturday Sessions & Breakfast",
    meta: "Saturday teaching, roundtable, and breakfast",
    price: 10
  },
  {
    id: "saturday",
    title: "Free Saturday Sessions only",
    meta: "Saturday sessions without breakfast",
    price: 0
  }
];

function getParam(params: RawSearchParams, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = params[key];

    if (Array.isArray(value) && value[0]) {
      return value[0];
    }

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function getSelectedTicket(params: RawSearchParams) {
  const requestedTicket = getParam(params, ["ticket", "ticketType", "registration"], "full")
    .toLowerCase()
    .replaceAll("_", "-");

  return (
    tickets.find((ticket) => ticket.id === requestedTicket) ??
    tickets.find((ticket) => ticket.title.toLowerCase().includes(requestedTicket)) ??
    tickets[0]
  );
}

function formatPrice(value: number) {
  return value === 0 ? "Free" : `$${value.toFixed(2)}`;
}

export default async function RsvpPage({ searchParams }: RsvpPageProps) {
  const params = (await searchParams) ?? {};
  const selectedTicket = getSelectedTicket(params);
  const firstName = getParam(params, ["first", "firstName", "fname"]);
  const lastName = getParam(params, ["last", "lastName", "lname"]);
  const email = getParam(params, ["email", "mail"]);
  const phone = getParam(params, ["phone", "mobile", "sms"]);
  const source = getParam(params, ["source", "ref", "campaign"], "personal invite");
  const fillId = getParam(
    params,
    ["fillId", "fid", "inviteId", "conversationId", "contactId", "cid"],
    "sample-fill"
  );
  const attendeeType = getParam(params, ["type", "attendee", "registering"], "man");
  const primaryName = getParam(
    params,
    ["primary", "primaryName", "contactName"],
    [firstName, lastName].filter(Boolean).join(" ") || "No name yet"
  );
  const primaryEmail = getParam(params, ["primaryEmail", "contactEmail"], email || "No email yet");
  const totalLabel = formatPrice(selectedTicket.price);
  const attendeeName = [firstName, lastName].filter(Boolean).join(" ");
  const completionLabel =
    selectedTicket.price === 0
      ? "Complete free registration"
      : `Pay ${totalLabel} and complete registration`;

  return (
    <main className="rsvp-shell">
      <Link className="rsvp-back" href="/link-in-bio" aria-label="Back to FC Men link in bio">
        <ArrowLeft size={20} />
      </Link>

      <section className="rsvp-flow" aria-labelledby="rsvp-title">
        <header className="rsvp-event-header">
          <Image
            alt="Detroit Metro District Men's Conference"
            className="rsvp-event-image"
            height={180}
            priority
            src="/fc-men-conference.png"
            width={320}
          />
          <div>
            <p className="rsvp-kicker">Detroit Metro District</p>
            <h1 id="rsvp-title">Men&apos;s Conference</h1>
            <p className="rsvp-date">
              <CalendarDays size={22} />
              June 26 - 27, 2026
            </p>
          </div>
        </header>

        <section className="rsvp-section" aria-labelledby="ticket-title">
          <div className="rsvp-section-heading">
            <p className="rsvp-step">Register</p>
            <h2 id="ticket-title">Choose Ticket</h2>
          </div>

          <div className="rsvp-ticket-list">
            {tickets.map((ticket) => (
              <label
                className={`rsvp-ticket${ticket.id === selectedTicket.id ? " rsvp-ticket-selected" : ""}`}
                key={ticket.id}
              >
                <input
                  defaultChecked={ticket.id === selectedTicket.id}
                  name="ticket"
                  type="radio"
                  value={ticket.id}
                />
                <span>
                  <strong>{ticket.title}</strong>
                  <span>Unlimited spots • {formatPrice(ticket.price)}{ticket.price > 0 ? "/each" : ""}</span>
                </span>
                {ticket.id === selectedTicket.id ? <Check size={21} aria-hidden="true" /> : null}
              </label>
            ))}
          </div>
        </section>

        <section className="rsvp-section" aria-labelledby="primary-title">
          <div className="rsvp-section-heading">
            <h2 id="primary-title">Who&apos;s your primary contact? *</h2>
            <p>
              This is the main point of contact for your group. URL details can prefill
              this so leaders know who invited or followed up.
            </p>
          </div>

          <div className="rsvp-primary-contact">
            <UserRound size={22} />
            <span>
              <strong>{primaryName}</strong>
              <span>{primaryEmail}</span>
            </span>
          </div>

          <div className="rsvp-primary-contact rsvp-muted-contact">
            <CirclePlus size={22} />
            <span>
              <strong>Somebody else</strong>
              <span>Add a different primary contact</span>
            </span>
          </div>
        </section>

        <form className="rsvp-form" aria-labelledby="details-title">
          <div className="rsvp-section-heading">
            <h2 id="details-title">Your details</h2>
            <p>Confirm the attendee information before review and payment.</p>
          </div>

          <input name="fillId" type="hidden" value={fillId} />
          <input name="source" type="hidden" value={source} />

          <div className="rsvp-fields-two">
            <label>
              First name *
              <input autoComplete="given-name" defaultValue={firstName} name="firstName" />
            </label>
            <label>
              Last name *
              <input autoComplete="family-name" defaultValue={lastName} name="lastName" />
            </label>
          </div>

          <label>
            Email *
            <span className="rsvp-input-icon">
              <Mail size={19} />
              <input autoComplete="email" defaultValue={email} name="email" type="email" />
            </span>
          </label>

          <label>
            Phone number
            <span className="rsvp-input-icon">
              <Phone size={19} />
              <input autoComplete="tel" defaultValue={phone} name="phone" type="tel" />
            </span>
          </label>

          <fieldset className="rsvp-choice-group">
            <legend>I am registering a:</legend>
            <label>
              <input defaultChecked={attendeeType.toLowerCase().includes("boy")} name="attendeeType" type="radio" />
              <span>Boy ages 5-12</span>
            </label>
            <label>
              <input defaultChecked={!attendeeType.toLowerCase().includes("boy")} name="attendeeType" type="radio" />
              <span>Man 13 & up</span>
            </label>
          </fieldset>

          <button className="rsvp-add-person" type="button">
            <CirclePlus size={21} />
            Add another person
          </button>
        </form>

        <section className="rsvp-review" aria-labelledby="review-title">
          <h2 id="review-title">Review & pay</h2>
          <div className="rsvp-review-line">
            <span className="rsvp-review-icon">
              <Ticket size={24} />
            </span>
            <span>
              <strong>{selectedTicket.title}</strong>
              <span>1 total • {formatPrice(selectedTicket.price)}{selectedTicket.price > 0 ? "/each" : ""}</span>
            </span>
            <strong>{totalLabel}</strong>
          </div>

          <div className="rsvp-total">
            <strong>Total</strong>
            <strong>{totalLabel}</strong>
          </div>

          <label>
            Card number *
            <span className="rsvp-card-field">
              <CreditCard size={24} />
              <span>Card number</span>
              <span>MM / YY</span>
              <span>CVC</span>
            </span>
          </label>

          <RsvpCompletion
            actionLabel={completionLabel}
            attendeeName={attendeeName}
            fillId={fillId}
            source={source}
            ticketTitle={selectedTicket.title}
          />

          <p className="rsvp-footnote">
            Fill ID: {fillId} • Source: {source}. Use fillId as a short opaque token
            for the invite or fill record; map it to the contact or conversation on
            the backend instead of exposing raw internal IDs.
          </p>
        </section>
      </section>
    </main>
  );
}
