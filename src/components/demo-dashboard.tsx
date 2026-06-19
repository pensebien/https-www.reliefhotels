"use client";

import {
  resolveBookingCategoryKey,
  type BookingCategoryKey,
} from "@/lib/booking-category";
import { cn, formatNaira } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type StorageHealth = {
  mode: "supabase" | "file";
  supabaseConfigured: boolean;
  connected: boolean | null;
  message: string;
};

type ReservationRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  guests: number;
  itemType?: "room" | "tour" | "inquiry";
  roomId?: string;
  stayPreference: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentReference?: string;
  source: string;
  createdAt: string;
  emailSent: boolean;
};

type PaymentRow = {
  id: string;
  reference: string;
  reservationId?: string;
  email: string;
  amountKobo: number;
  status: string;
  itemType?: "room" | "tour";
  itemId?: string;
  itemLabel: string;
  source: string;
  createdAt: string;
};

type Activity = {
  config: {
    demoMode: boolean;
    paystackConfigured: boolean;
    emailConfigured: boolean;
    appUrl: string;
    storageMode: "supabase" | "file";
    supabaseConfigured: boolean;
    storageHealth: StorageHealth;
    notifyChannel: string;
  };
  reservations: ReservationRow[];
  payments: PaymentRow[];
};

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled";

const DEFAULT_KEY = "relief-demo-2026";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: ReservationRow["status"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        status === "confirmed" && "bg-teal/20 text-teal-dark",
        status === "pending" && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
        status === "cancelled" && "bg-border text-muted",
      )}
    >
      {status}
    </span>
  );
}

function CategoryBadge({
  categoryKey,
  label,
}: {
  categoryKey: BookingCategoryKey;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
        categoryKey === "penthouse" && "bg-violet-500/15 text-violet-200",
        categoryKey === "suite" && "bg-teal/15 text-teal-dark",
        categoryKey === "executive" && "bg-sky-500/15 text-sky-200",
        categoryKey === "room" && "bg-border text-muted",
        categoryKey === "eventsMeetings" && "bg-amber-500/15 text-amber-200",
        categoryKey === "tour" && "bg-emerald-500/15 text-emerald-200",
        categoryKey === "inquiry" && "bg-border text-muted",
      )}
    >
      {label}
    </span>
  );
}

export function DemoDashboard() {
  const t = useTranslations("demo");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");

  const [key, setKey] = useState(DEFAULT_KEY);
  const [inputKey, setInputKey] = useState(DEFAULT_KEY);
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = useCallback(async (dashboardKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/demo/activity?key=${encodeURIComponent(dashboardKey)}`,
      );
      if (res.status === 401) {
        setError(t("unauthorized"));
        setData(null);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("serverError"));
        setData(null);
        return;
      }
      const json = (await res.json()) as Activity;
      setData(json);
      sessionStorage.setItem("demo-dashboard-key", dashboardKey);
    } catch {
      setError(t("serverError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const saved =
      keyFromUrl ??
      sessionStorage.getItem("demo-dashboard-key") ??
      DEFAULT_KEY;
    setKey(saved);
    setInputKey(saved);
    load(saved);
  }, [keyFromUrl, load]);

  const paymentsByReservation = useMemo(() => {
    const map = new Map<string, PaymentRow[]>();
    if (!data) return map;
    for (const payment of data.payments) {
      if (!payment.reservationId) continue;
      const list = map.get(payment.reservationId) ?? [];
      list.push(payment);
      map.set(payment.reservationId, list);
    }
    return map;
  }, [data]);

  const reservationsById = useMemo(() => {
    const map = new Map<string, ReservationRow>();
    if (!data) return map;
    for (const reservation of data.reservations) {
      map.set(reservation.id, reservation);
    }
    return map;
  }, [data]);

  const filteredReservations = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.reservations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (statusFilter === "all") return sorted;
    return sorted.filter((r) => r.status === statusFilter);
  }, [data, statusFilter]);

  const storageWarning =
    data?.config.storageHealth.mode === "file" ||
    data?.config.storageHealth.connected === false;

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
        className="mb-6 flex flex-wrap gap-2"
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
          className="h-10 min-w-[200px] flex-1 rounded-lg border border-border bg-card px-3 text-sm"
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
          {storageWarning && (
            <div
              className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
              role="alert"
            >
              <p className="font-medium">{t("storageWarningTitle")}</p>
              <p className="mt-1 text-xs opacity-90">
                {data.config.storageHealth.message}
              </p>
            </div>
          )}

          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              label={t("status.storage")}
              ok={data.config.storageHealth.connected === true}
              hint={data.config.storageHealth.message}
            />
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
              label={t("status.notify")}
              ok={data.config.notifyChannel !== "console"}
              hint={data.config.notifyChannel}
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {(["all", "pending", "confirmed", "cancelled"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  statusFilter === filter
                    ? "bg-teal text-gray-950"
                    : "border border-border bg-card text-muted hover:border-teal",
                )}
              >
                {t(`filters.${filter}`)}
              </button>
            ))}
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            <section>
              <h2 className="mb-4 text-lg font-semibold">
                {t("reservations")}{" "}
                <span className="text-sm font-normal text-muted">
                  ({filteredReservations.length})
                </span>
              </h2>
              <div className="space-y-3">
                {filteredReservations.length === 0 ? (
                  <p className="text-sm text-muted">{t("emptyReservations")}</p>
                ) : (
                  filteredReservations.map((r) => {
                    const linked = paymentsByReservation.get(r.id) ?? [];
                    const successPayment = linked.find((p) => p.status === "success");
                    const categoryKey = resolveBookingCategoryKey({
                      itemType: r.itemType,
                      roomId: r.roomId,
                      stayPreference: r.stayPreference,
                    });

                    return (
                      <div
                        key={r.id}
                        className="rounded-xl border border-border bg-card p-4 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">
                            {r.firstName} {r.lastName}
                          </p>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <CategoryBadge
                              categoryKey={categoryKey}
                              label={t(`categories.${categoryKey}`)}
                            />
                            <StatusBadge status={r.status} />
                          </div>
                        </div>
                        <p className="text-muted">{r.email}</p>
                        {r.phone ? (
                          <p className="text-xs text-muted">{r.phone}</p>
                        ) : null}
                        {(r.checkIn || r.checkOut) && (
                          <p className="mt-1 text-xs text-muted">
                            {r.checkIn ?? "—"} → {r.checkOut ?? "—"}
                            {r.nights ? ` · ${r.nights} night(s)` : ""}
                            {r.guests ? ` · ${r.guests} guest(s)` : ""}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted">{r.stayPreference}</p>
                        <p className="mt-2 font-mono text-[10px] text-muted">
                          {t("reservationId")}: {r.id}
                        </p>
                        {r.paymentReference && (
                          <p className="font-mono text-[10px] text-muted">
                            {t("paymentRef")}: {r.paymentReference}
                          </p>
                        )}
                        {successPayment && (
                          <p className="mt-2 text-xs font-medium text-teal-dark">
                            {t("linkedPayment")}:{" "}
                            {formatNaira(successPayment.amountKobo / 100)} ·{" "}
                            {successPayment.reference}
                          </p>
                        )}
                        <p className="mt-2 text-[10px] text-muted">
                          {formatDate(r.createdAt)}
                          {r.emailSent ? " · ✉ sent" : ""}
                          {" · "}
                          {r.source}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold">
                {t("payments")}{" "}
                <span className="text-sm font-normal text-muted">
                  ({data.payments.length})
                </span>
              </h2>
              <div className="space-y-3">
                {data.payments.length === 0 ? (
                  <p className="text-sm text-muted">{t("emptyPayments")}</p>
                ) : (
                  [...data.payments]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )
                    .slice(0, 20)
                    .map((p) => {
                      const linkedReservation = p.reservationId
                        ? reservationsById.get(p.reservationId)
                        : undefined;
                      const categoryKey = resolveBookingCategoryKey({
                        itemType: p.itemType ?? linkedReservation?.itemType,
                        itemId: p.itemId,
                        roomId: linkedReservation?.roomId,
                        stayPreference: linkedReservation?.stayPreference,
                      });

                      return (
                      <div
                        key={p.id}
                        className="rounded-xl border border-border bg-card p-4 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">
                            {formatNaira(p.amountKobo / 100)}
                          </p>
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <CategoryBadge
                              categoryKey={categoryKey}
                              label={t(`categories.${categoryKey}`)}
                            />
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-xs capitalize",
                                p.status === "success"
                                  ? "bg-teal/20 text-teal-dark"
                                  : "bg-border text-muted",
                              )}
                            >
                              {p.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-muted">{p.itemLabel}</p>
                        <p className="mt-1 font-mono text-xs text-muted">
                          {p.reference}
                        </p>
                        {p.reservationId && (
                          <p className="mt-1 font-mono text-[10px] text-muted">
                            {t("reservationId")}: {p.reservationId}
                          </p>
                        )}
                        <p className="mt-2 text-[10px] text-muted">
                          {formatDate(p.createdAt)} · {p.source}
                        </p>
                      </div>
                    );
                    })
                )}
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
        {ok ? "✓ Ready" : "○ Action needed"}
      </p>
      <p className="mt-1 line-clamp-2 text-xs text-muted">{hint}</p>
    </div>
  );
}
