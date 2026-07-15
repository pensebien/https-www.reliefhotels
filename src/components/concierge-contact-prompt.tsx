"use client";

import { site } from "@/content/site";
import { toMailtoHref } from "@/lib/contact-links";
import {
  buildTelHrefFromDigits,
  buildWhatsAppHrefFromDigits,
  formatMaskedPhoneDisplay,
  formatObfuscatedPhoneDisplay,
  revealPhoneDigits,
} from "@/lib/obfuscated-phone";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export function ConciergeContactPrompt() {
  const t = useTranslations("booking");
  const [revealed, setRevealed] = useState(false);

  const digits = useMemo(() => revealPhoneDigits(), []);
  const display = revealed
    ? formatObfuscatedPhoneDisplay(digits)
    : formatMaskedPhoneDisplay(digits);

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent("Reservation callback request");
    const body = encodeURIComponent(
      "Hello Relief Hotels,\n\nI would like help with a reservation. Please call or WhatsApp me back.\n\nThank you.",
    );
    return `${toMailtoHref(site.email)}?subject=${subject}&body=${body}`;
  }, []);

  function openCall() {
    window.location.assign(buildTelHrefFromDigits(digits));
  }

  function openWhatsApp() {
    const href = buildWhatsAppHrefFromDigits(digits);
    const opened = window.open(href, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(href);
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card/60 px-5 py-5 text-center">
      <p className="text-sm text-muted">{t("preferConcierge")}</p>

      <div className="mt-4 flex flex-col items-stretch gap-2 sm:mx-auto sm:max-w-md">
        <a
          href={mailtoHref}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark"
        >
          <Mail className="h-4 w-4" aria-hidden />
          {t("conciergeEmail")}
        </a>

        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-teal"
          aria-expanded={revealed}
        >
          <Phone className="h-4 w-4" aria-hidden />
          {revealed ? t("conciergePhoneRevealed") : t("conciergeShowPhone")}
        </button>
      </div>

      {revealed ? (
        <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
          <p className="font-mono text-sm tracking-wide text-foreground" aria-live="polite">
            {display}
          </p>
          <p className="text-xs text-muted">{t("conciergePhoneHint")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={openCall}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {t("conciergeCall")}
            </button>
            <button
              type="button"
              onClick={openWhatsApp}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {t("conciergeWhatsApp")}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">
          {t("conciergeMaskedHint", { phone: display })}
        </p>
      )}
    </div>
  );
}
