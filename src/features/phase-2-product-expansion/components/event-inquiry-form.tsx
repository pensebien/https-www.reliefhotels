"use client";

import { eventTypes } from "@/features/phase-2-product-expansion/content/event-spaces";
import { useTranslations } from "next-intl";
import { FormEvent, useId, useState } from "react";

export function EventInquiryForm() {
  const t = useTranslations("phase2.events.form");
  const id = useId();
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
        <div>
          <label htmlFor={`${id}-firstName`} className="sr-only">
            {t("firstName")}
          </label>
          <input
            id={`${id}-firstName`}
            name="firstName"
            required
            placeholder={t("firstName")}
            className="field"
          />
        </div>
        <div>
          <label htmlFor={`${id}-lastName`} className="sr-only">
            {t("lastName")}
          </label>
          <input
            id={`${id}-lastName`}
            name="lastName"
            required
            placeholder={t("lastName")}
            className="field"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="sr-only">
          {t("email")}
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          placeholder={t("email")}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className="sr-only">
          {t("phone")}
        </label>
        <input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          required
          placeholder={t("phone")}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${id}-eventType`} className="sr-only">
          {t("eventType")}
        </label>
        <select id={`${id}-eventType`} name="eventType" required defaultValue="" className="field">
          <option value="" disabled>
            {t("eventType")}
          </option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-eventDate`} className="sr-only">
          {t("eventDate")}
        </label>
        <input id={`${id}-eventDate`} name="eventDate" type="date" required className="field" />
      </div>
      <div>
        <label htmlFor={`${id}-guestCount`} className="sr-only">
          {t("guestCount")}
        </label>
        <input
          id={`${id}-guestCount`}
          name="guestCount"
          type="number"
          min={10}
          max={2000}
          required
          placeholder={t("guestCount")}
          className="field"
        />
      </div>
      <div>
        <label htmlFor={`${id}-message`} className="sr-only">
          {t("message")}
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          required
          placeholder={t("message")}
          className="field min-h-28"
        />
      </div>
      <button type="submit" disabled={status === "loading"} className="btn-primary w-full sm:w-auto">
        {status === "loading" ? "…" : t("submit")}
      </button>
    </form>
  );
}
