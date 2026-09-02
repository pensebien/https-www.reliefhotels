"use client";

import { BookStayButton } from "@/components/book-stay-button";
import { rooms, site, tours } from "@/content/site";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const inputClassName =
  "h-12 w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

function ContactSectionInner() {
  const t = useTranslations("contact");
  const searchParams = useSearchParams();
  const roomSlug = searchParams.get("room");
  const tourSlug = searchParams.get("tour");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [emailSent, setEmailSent] = useState(false);
  const [message, setMessage] = useState("");

  const interestLabel = useMemo(() => {
    if (roomSlug) {
      const room = rooms.find((r) => r.slug === roomSlug || r.id === roomSlug);
      return room?.slug ?? roomSlug;
    }
    if (tourSlug) {
      const tour = tours.find((x) => x.slug === tourSlug || x.id === tourSlug);
      return tour?.slug ?? tourSlug;
    }
    return null;
  }, [roomSlug, tourSlug]);

  useEffect(() => {
    if (roomSlug) {
      setMessage(t("prefillRoom", { room: roomSlug.replace(/-/g, " ") }));
    } else if (tourSlug) {
      setMessage(t("prefillTour", { tour: tourSlug.replace(/-/g, " ") }));
    }
  }, [roomSlug, tourSlug, t]);

  useEffect(() => {
    const scrollToContact = () => {
      if (typeof window === "undefined") return;
      if (window.location.hash !== "#contact" && !roomSlug && !tourSlug) return;
      document.getElementById("contact")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };
    scrollToContact();
    const id = window.setTimeout(scrollToContact, 120);
    return () => window.clearTimeout(id);
  }, [roomSlug, tourSlug]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = new FormData(e.currentTarget);

    const payload = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim() || undefined,
      message: message.trim(),
    };

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setEmailSent(Boolean(data.emailSent));
      setStatus("success");
      setMessage("");
      e.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="scroll-mt-28 py-10 md:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 xl:px-16">
        <div className="grid grid-cols-12 gap-6 sm:gap-8 md:gap-0">
          <div className="col-span-12 w-full md:col-span-6">
            <div className="flex flex-col gap-8 md:gap-12">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-teal" />
                  <p className="text-base text-muted">{t("eyebrow")}</p>
                </div>
                <p className="font-serif text-3xl font-medium text-foreground md:text-4xl">
                  {t("title")}
                </p>
              </div>

              <div className="flex flex-col justify-between gap-6 sm:flex-row">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted">{t("phone")}</p>
                  <a
                    href={site.phoneHref}
                    className="text-base font-medium text-teal-dark hover:underline"
                  >
                    {site.phone}
                  </a>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted">{t("email")}</p>
                  <a
                    href={`mailto:${site.email}`}
                    className="text-base font-medium text-teal-dark hover:underline"
                  >
                    {site.email}
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted">{t("whatsapp")}</p>
                <a
                  href={site.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 text-base font-medium text-teal-dark hover:underline"
                >
                  <WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />
                  {site.phone}
                </a>
                <p className="text-sm text-muted">{t("whatsappHint")}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted">{t("location")}</p>
                <p className="text-base font-medium text-foreground">
                  {site.address.line1} {site.address.line2}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-1 hidden md:block" />

          <div className="col-span-12 w-full md:col-span-5">
            <div className="relative overflow-hidden rounded-4xl border border-border/70 bg-card/95 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:p-8">
              <div
                className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-teal/10 blur-3xl"
                aria-hidden
              />
              <div className="relative z-10 mb-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-teal" />
                  <p className="text-sm text-muted">{t("formBadge")}</p>
                </div>
                <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  {t("formTitle")}
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted sm:text-base">
                  {interestLabel
                    ? t("formDescriptionInterest", { interest: interestLabel })
                    : t("formDescription")}
                </p>
                <BookStayButton className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-teal px-5 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark">
                  {t("bookStay")}
                </BookStayButton>
              </div>

              {status === "success" ? (
                <div className="rounded-2xl border border-teal/30 bg-teal/10 px-4 py-6 text-center text-foreground">
                  <p>{t("success")}</p>
                  <p className="mt-2 text-sm text-muted">
                    {emailSent ? t("successEmail") : t("successDemo")}
                  </p>
                </div>
              ) : (
                <form className="relative z-10 space-y-5" onSubmit={onSubmit}>
                  {status === "error" && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {t("error")}
                    </p>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="firstName"
                        className="text-xs font-medium uppercase tracking-[0.18em] text-muted"
                      >
                        {t("firstName")}
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        autoComplete="given-name"
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="lastName"
                        className="text-xs font-medium uppercase tracking-[0.18em] text-muted"
                      >
                        {t("lastName")}
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        autoComplete="family-name"
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="contactEmail"
                      className="text-xs font-medium uppercase tracking-[0.18em] text-muted"
                    >
                      {t("email")}
                    </label>
                    <input
                      id="contactEmail"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="contactPhone"
                      className="text-xs font-medium uppercase tracking-[0.18em] text-muted"
                    >
                      {t("phoneOptional")}
                    </label>
                    <input
                      id="contactPhone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label
                      htmlFor="message"
                      className="text-xs font-medium uppercase tracking-[0.18em] text-muted"
                    >
                      {t("details")}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t("detailsPlaceholder")}
                      className="min-h-32 w-full resize-none rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                    />
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/50 px-4 py-3">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      required
                      className="mt-1 h-4 w-4 rounded border-border accent-teal"
                    />
                    <div className="space-y-1">
                      <label htmlFor="terms" className="text-sm font-medium text-foreground">
                        {t("terms")}
                      </label>
                      <p className="text-xs leading-5 text-muted">{t("termsNote")}</p>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-teal px-6 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark disabled:opacity-60"
                  >
                    {status === "loading" ? "…" : t("submit")}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <Suspense
      fallback={<section id="contact" className="scroll-mt-28 py-10 md:py-20" aria-hidden />}
    >
      <ContactSectionInner />
    </Suspense>
  );
}
