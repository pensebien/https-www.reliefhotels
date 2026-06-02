"use client";

import { eventTypes } from "@/features/phase-2-product-expansion/content/event-spaces";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

export function EventInquiryForm() {
  const t = useTranslations("phase2.events.form");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());

    try {
      const res = await fetch("/api/event-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      e.currentTarget.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="rounded-2xl border border-teal/30 bg-teal/10 px-4 py-6 text-center">
        {t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      {status === "error" && <p className="text-sm text-red-600">{t("error")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="firstName" required placeholder={t("firstName")} className="field" />
        <input name="lastName" required placeholder={t("lastName")} className="field" />
      </div>
      <input name="email" type="email" required placeholder={t("email")} className="field" />
      <input name="phone" required placeholder={t("phone")} className="field" />
      <select name="eventType" required defaultValue="" className="field">
        <option value="" disabled>
          {t("eventType")}
        </option>
        {eventTypes.map((type) => (
          <option key={type} value={type}>
            {t(`types.${type}`)}
          </option>
        ))}
      </select>
      <input name="eventDate" type="date" required className="field" />
      <input name="guestCount" type="number" min={10} max={2000} required placeholder={t("guestCount")} className="field" />
      <textarea name="message" required placeholder={t("message")} className="field min-h-28" />
      <button type="submit" disabled={status === "loading"} className="btn-primary w-full sm:w-auto">
        {status === "loading" ? "…" : t("submit")}
      </button>
    </form>
  );
}
