"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

export function StaffLoginForm() {
  const t = useTranslations("staffLogin");
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/staff/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });

      if (res.status === 404) {
        setError(t("disabled"));
        return;
      }
      if (res.status === 401) {
        setError(t("invalidCredentials"));
        return;
      }
      if (!res.ok) {
        setError(t("serverError"));
        return;
      }

      router.push("/staff");
      router.refresh();
    } catch {
      setError(t("serverError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-muted" htmlFor="staff-login-name">
            {t("nameLabel")}
          </label>
          <input
            id="staff-login-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-foreground"
          />
        </div>

        <div>
          <label className="block text-sm text-muted" htmlFor="staff-login-pin">
            {t("pinLabel")}
          </label>
          <input
            id="staff-login-pin"
            type="password"
            inputMode="numeric"
            required
            minLength={4}
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-border bg-card px-3 text-foreground"
          />
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-lg bg-teal text-sm font-medium text-gray-950 disabled:opacity-60"
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
      </form>
    </div>
  );
}
