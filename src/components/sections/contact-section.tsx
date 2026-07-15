"use client";

import { site } from "@/content/site";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

const inputClassName =
  "h-12 w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";

export function ContactSection() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [emailSent, setEmailSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = new FormData(e.currentTarget);

    const payload = {
      firstName: String(form.get("firstName") ?? "").trim(),
      lastName: String(form.get("lastName") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim() || undefined,
      message: String(form.get("message") ?? "").trim(),
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
      e.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="py-10 md:py-20">
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
                  {t("formDescription")}
                </p>
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
