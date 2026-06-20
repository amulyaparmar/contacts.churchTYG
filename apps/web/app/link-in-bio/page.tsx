import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Camera,
  Clock,
  MapPin,
  Share2,
  Sparkles,
  UsersRound
} from "lucide-react";

const registrationUrl = "https://subsplash.com/detroitmetrodistrict/lb/ev/+n7t52y4";

const socialLinks = [
  {
    href: "https://www.facebook.com/events/1343711197620110/?post_id=1343720624285834&acontext=%7B%22event_action_history%22%3A%5B%7B%22mechanism%22%3A%22footer_attachment%22%2C%22surface%22%3A%22newsfeed%22%7D%5D%2C%22ref_notif_type%22%3Anull%7D",
    title: "Facebook Event",
    meta: "facebook.com/events",
    icon: Share2
  },
  {
    href: "https://www.facebook.com/share/1FKVYQz38t/?mibextid=wwXIfr",
    title: "Share on Facebook",
    meta: "facebook.com/share",
    icon: Share2
  },
  {
    href: "https://www.instagram.com/detroitmetromen",
    title: "Detroit Metro Men on Instagram",
    meta: "@detroitmetromen",
    icon: Camera
  }
];

const reasons = [
  {
    title: "Gather men around a clear call",
    body: "The event gives men a focused place to step out of routine, hear the Word, and respond with intention.",
    icon: UsersRound
  },
  {
    title: "Build durable brotherhood",
    body: "A conference creates shared moments that become easier follow-up conversations, prayer, and accountability.",
    icon: Sparkles
  },
  {
    title: "Move from attendance to next steps",
    body: "Registration is not just a headcount; it helps leaders know who to welcome, host, and care for after the weekend.",
    icon: ArrowRight
  }
];

export default function LinkInBioPage() {
  return (
    <main className="event-shell">
      <section className="event-page" aria-labelledby="page-title">
        <div className="event-hero">
          <div className="event-art">
            <Image
              src="/fc-men-conference.png"
              alt="Detroit Metro District Men's Conference featuring special guest Aaron Soto, Friday June 26 and Saturday June 27."
              width={960}
              height={540}
              priority
            />
          </div>

          <div className="event-copy">
            <p className="event-kicker">Detroit Metro District</p>
            <h1 id="page-title">Men&apos;s Conference</h1>
            <p className="event-lead">
              Two days for men to gather, reset, worship, and leave with real next steps
              for faith, family, and brotherhood.
            </p>

            <div className="event-facts" aria-label="Event details">
              <span>
                <CalendarDays size={17} />
                Jun 26-27, 2026
              </span>
              <span>
                <Clock size={17} />
                Friday and Saturday
              </span>
              <span>
                <MapPin size={17} />
                Detroit Metro District
              </span>
            </div>

            <a className="register-button" href={registrationUrl} rel="noreferrer" target="_blank">
              Register for the conference
              <ArrowUpRight size={20} />
            </a>
          </div>
        </div>

        <section className="event-section" aria-labelledby="why-title">
          <div className="section-heading">
            <p className="eyebrow">Why this gathering matters</p>
            <h2 id="why-title">More than a date on the calendar.</h2>
          </div>

          <div className="reason-grid">
            {reasons.map((reason) => {
              const Icon = reason.icon;

              return (
                <article className="reason-card" key={reason.title}>
                  <span className="icon-box" aria-hidden="true">
                    <Icon size={21} />
                  </span>
                  <h3>{reason.title}</h3>
                  <p>{reason.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="event-section" aria-labelledby="links-title">
          <div className="section-heading">
            <p className="eyebrow">Share and follow</p>
            <h2 id="links-title">Bring someone with you.</h2>
          </div>

          <nav className="link-list compact-links" aria-label="FC Men external links">
            <a className="link-button" href={registrationUrl} rel="noreferrer" target="_blank">
              <span className="icon-box" aria-hidden="true">
                <CalendarDays size={21} />
              </span>
              <span className="link-copy">
                <span className="link-title">Event Registration</span>
                <span className="link-meta">Reserve your spot for June 26-27</span>
              </span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </a>

            {socialLinks.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  className="link-button"
                  href={item.href}
                  key={item.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="icon-box" aria-hidden="true">
                    <Icon size={21} />
                  </span>
                  <span className="link-copy">
                    <span className="link-title">{item.title}</span>
                    <span className="link-meta">{item.meta}</span>
                  </span>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </a>
              );
            })}
          </nav>
        </section>

        <Link className="footer-link" href="/">
          <ArrowLeft size={16} />
          Back to FC Men
        </Link>
      </section>
    </main>
  );
}
