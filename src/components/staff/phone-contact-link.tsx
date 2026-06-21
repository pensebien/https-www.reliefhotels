"use client";

import {
  isMobileContactDevice,
  toTelHref,
  toWhatsAppHref,
} from "@/lib/contact-links";
import { cn } from "@/lib/utils";

export function PhoneContactLink({
  phone,
  className,
  ariaLabel,
}: {
  phone: string;
  className?: string;
  ariaLabel?: string;
}) {
  const waHref = toWhatsAppHref(phone);
  const telHref = toTelHref(phone);

  return (
    <a
      href={waHref}
      className={cn(
        "font-medium text-teal underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        className,
      )}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!isMobileContactDevice()) {
          e.preventDefault();
          const opened = window.open(waHref, "_blank", "noopener,noreferrer");
          if (!opened) window.location.assign(waHref);
          return;
        }

        e.preventDefault();
        window.location.assign(waHref);
        window.setTimeout(() => {
          if (!document.hidden) window.location.assign(telHref);
        }, 2000);
      }}
    >
      {phone}
    </a>
  );
}
