import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Camera,
  MapPin,
  Share2,
  UsersRound
} from "lucide-react";
import { InstagramMediaGrid } from "@/components/instagram-media-grid";
import { RegistrationLink } from "@/components/registration-link";
import instagramFeed from "@/data/detroitmetromen-instagram-posts.json";

const registrationUrl = "https://subsplash.com/detroitmetrodistrict/lb/ev/+n7t52y4/register";
const instagramUrl = "https://www.instagram.com/detroitmetromen/";
const rsvpSampleUrl =
  "/rsvp?fillId=sample-fill&first=Marcus&last=Jones&email=marcus@example.com&phone=3135550199&ticket=full&type=man&source=link-in-bio";
const instagramPosts = instagramFeed.posts.slice(0, 6);

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
    href: instagramUrl,
    title: "Detroit Metro Men on Instagram",
    meta: "@detroitmetromen",
    icon: Camera
  }
];

export default function LinkInBioPage() {
  return (
    <main className="event-shell premium-event-shell">
      <Link className="event-back" href="/" aria-label="Back to FC Men">
        <ArrowLeft size={21} />
      </Link>

      <section className="event-launcher" aria-labelledby="page-title">
        <div className="event-lockup" aria-hidden="true">
          <span>FC</span>
        </div>
        <p className="event-microcopy">Detroit Metro District men gathering June 26-27</p>

        <div className="event-poster">
          <div className="event-art">
            <Image
              src="/fc-men-conference.png"
              alt="Detroit Metro District Men's Conference featuring special guest Aaron Soto, Friday June 26 and Saturday June 27."
              width={960}
              height={540}
              priority
            />
          </div>

          <div className="event-copy event-card-copy">
            <p className="event-kicker">Detroit Metro District</p>
            <h1 id="page-title">Men&apos;s Conference</h1>
            <p className="event-lead">
              Two days for men to gather, reset, worship, and leave with real next steps for
              faith, family, and brotherhood.
            </p>

            <div className="event-facts" aria-label="Event details">
              <span>
                <CalendarDays size={17} />
                Jun 26-27, 2026
              </span>
              <span>
                <MapPin size={17} />
                Detroit Metro District
              </span>
            </div>

            <RegistrationLink className="event-card-register" desktopHref={registrationUrl}>
              <span>Register for the conference</span>
            </RegistrationLink>
          </div>
        </div>

        <nav className="event-actions" aria-label="FC Men conference links">
          {socialLinks.map((item) => {
            const Icon = item.icon;

            return (
              <a className="event-action" href={item.href} key={item.href} rel="noreferrer" target="_blank">
                <span className="event-action-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span>{item.title}</span>
                <ArrowUpRight size={19} aria-hidden="true" />
              </a>
            );
          })}
        </nav>

        <section className="event-intent" aria-label="Why registration matters">
          <UsersRound size={20} aria-hidden="true" />
          <p>
            Registration helps leaders prepare to welcome each man well, build room for
            connection, and follow up after the weekend with care instead of guesswork.
          </p>
        </section>

        <section className="event-register-call" aria-labelledby="register-call-title">
          <p className="event-register-date">Friday Jun 26 & Saturday Jun 27</p>
          <h2 id="register-call-title">Ready to be in the room?</h2>
          <p>
            Save your spot now so the team can prepare well and help you take the
            right next step when you arrive.
          </p>
          <div className="event-rsvp-actions">
            <RegistrationLink className="event-rsvp-pill event-rsvp-primary" desktopHref={registrationUrl}>
              Register
            </RegistrationLink>
            <Link className="event-rsvp-pill" href={rsvpSampleUrl}>
              RSVP form
            </Link>
            <a className="event-rsvp-pill" href={socialLinks[0].href} rel="noreferrer" target="_blank">
              Facebook
            </a>
            <a className="event-rsvp-pill" href={socialLinks[2].href} rel="noreferrer" target="_blank">
              Instagram
            </a>
          </div>
        </section>

        <InstagramMediaGrid
          instagramUrl={instagramUrl}
          posts={instagramPosts}
          username={instagramFeed.user.username}
        />
      </section>

      <p className="event-secure">Secure registration through Subsplash</p>
    </main>
  );
}
