import Link from "next/link";
import { ArrowUpRight, BookUser, Link2, MessageCircle } from "lucide-react";

const homeLinks = [
  {
    href: "/link-in-bio",
    title: "FC Men Link in Bio",
    meta: "Event, Facebook, and Instagram links",
    icon: Link2
  },
  {
    href: "/contactbook",
    title: "Contactbook FC Men",
    meta: "A home for FC Men contacts",
    icon: BookUser
  },
  {
    href: "/conversations",
    title: "Conversations FC Men",
    meta: "Conversation tools and follow-up space",
    icon: MessageCircle
  }
];

export default function Home() {
  return (
    <main className="shell">
      <section className="hub" aria-labelledby="page-title">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Link2 size={30} strokeWidth={2.2} />
          </div>
          <p className="eyebrow">contacts.church</p>
          <h1 id="page-title">FC Men</h1>
          <p className="lead">
            Quick access for the FC Men link hub, contactbook, and conversations.
          </p>
        </div>

        <nav className="link-list" aria-label="FC Men apps">
          {homeLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link className="link-button" href={item.href} key={item.href}>
                <span className="icon-box" aria-hidden="true">
                  <Icon size={21} />
                </span>
                <span className="link-copy">
                  <span className="link-title">{item.title}</span>
                  <span className="link-meta">{item.meta}</span>
                </span>
                <ArrowUpRight size={20} aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
      </section>
    </main>
  );
}
