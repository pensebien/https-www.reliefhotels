"use client";

import { formatNaira } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Activity = {
  config: {
    demoMode: boolean;
    paystackConfigured: boolean;
    emailConfigured: boolean;
    appUrl: string;
  };
  reservations: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    stayPreference: string;
    status: string;
    source: string;
    createdAt: string;
    emailSent: boolean;
  }>;
  payments: Array<{
    id: string;
    reference: string;
    email: string;
    amountKobo: number;
    status: string;
    itemLabel: string;
    source: string;
    createdAt: string;
  }>;
};

const DEFAULT_KEY = "relief-demo-2026";

export function DemoDashboard() {
  const t = useTranslations("demo");
  const [key, setKey] = useState(DEFAULT_KEY);
  const [inputKey, setInputKey] = useState(DEFAULT_KEY);
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (dashboardKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/demo/activity?key=${encodeURIComponent(dashboardKey)}`,
      );
      if (!res.ok) throw new Error("Unauthorized");
      const json = await res.json();
      setData(json);
      sessionStorage.setItem("demo-dashboard-key", dashboardKey);
    } catch {
      setError(t("unauthorized"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const saved = sessionStorage.getItem("demo-dashboard-key") ?? DEFAULT_KEY;
    setKey(saved);
    setInputKey(saved);
    load(saved);
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-teal">Internal</p>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => load(key)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      <form
        className="mb-10 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setKey(inputKey);
          load(inputKey);
        }}
      >
        <input
          type="password"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          placeholder={t("keyPlaceholder")}
          className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm min-w-[200px]"
        />
        <button
          type="submit"
          className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-gray-950"
        >
          {t("unlock")}
        </button>
      </form>

      {error && <p className="mb-6 text-red-600">{error}</p>}

      {data && (
        <>
          <div className="mb-10 grid gap-4 sm:grid-cols-3">
            <StatusCard
              label={t("status.paystack")}
              ok={data.config.paystackConfigured}
              hint={data.config.demoMode ? t("status.demoPayments") : t("status.live")}
            />
            <StatusCard
              label={t("status.email")}
              ok={data.config.emailConfigured}
              hint={data.config.emailConfigured ? t("status.resend") : t("status.console")}
            />
            <StatusCard
              label={t("status.app")}
              ok
              hint={data.config.appUrl}
            />
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            <section>
              <h2 className="mb-4 text-lg font-semibold">{t("reservations")}</h2>
              <div className="space-y-3">
                {data.reservations.slice(0, 8).map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border bg-card p-4 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        {r.firstName} {r.lastName}
                      </p>
                      <span className="shrink-0 rounded-full bg-border px-2 py-0.5 text-xs">
                        {r.source}
                      </span>
                    </div>
                    <p className="text-muted">{r.email}</p>
                    <p className="mt-1 text-xs text-muted">
                      {r.stayPreference} · {r.status}
                      {r.emailSent ? " · ✉ sent" : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold">{t("payments")}</h2>
              <div className="space-y-3">
                {data.payments.slice(0, 8).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border bg-card p-4 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{formatNaira(p.amountKobo / 100)}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          p.status === "success"
                            ? "bg-teal/20 text-teal-dark"
                            : "bg-border text-muted"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-muted">{p.itemLabel}</p>
                    <p className="mt-1 font-mono text-xs text-muted">{p.reference}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({
  label,
  ok,
  hint,
}: {
  label: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 font-semibold ${ok ? "text-teal-dark" : "text-amber-600"}`}>
        {ok ? "✓ Ready" : "○ Demo / not configured"}
      </p>
      <p className="mt-1 truncate text-xs text-muted">{hint}</p>
    </div>
  );
}
