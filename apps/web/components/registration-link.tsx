"use client";

import { ArrowUpRight } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

const mobileQuery = "(hover: none), (pointer: coarse), (max-width: 860px)";

type RegistrationLinkProps = {
  children: ReactNode;
  className: string;
  desktopHref: string;
};

function isMobileRegistrationDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(mobileQuery).matches;
}

export function RegistrationLink({
  children,
  className,
  desktopHref
}: RegistrationLinkProps) {
  const [usesSms, setUsesSms] = useState(false);
  const smsHref =
    "sms:+14157187621?&body=Hey!%20I%20want%20to%20learn%20more%20about%20Detroit%20Metro%20Men.%0A%0A%40detroitmetromen";

  useEffect(() => {
    const media = window.matchMedia(mobileQuery);

    function handleChange() {
      setUsesSms(isMobileRegistrationDevice());
    }

    handleChange();
    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <a
      className={className}
      href={usesSms ? smsHref : desktopHref}
      rel={usesSms ? undefined : "noreferrer"}
      target={usesSms ? undefined : "_blank"}
    >
      {children}
      <ArrowUpRight size={className.includes("pill") ? 20 : 22} aria-hidden="true" />
    </a>
  );
}
