"use client";

import { rooms } from "@/content/site";
import type { GuestBookingView } from "@/lib/booking-engine/guest-booking";
import type { CancellationPolicy } from "@/lib/booking-engine/rate-config";
import { formatNaira } from "@/lib/utils";
import { CreditCard, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OnlineCheckinCard, type CheckinInfo } from "./online-checkin-card";

type ManageResponse = {
  checkin?: CheckinInfo;
  booking: GuestBookingView;
  policy: CancellationPolicy;
  extras: { id: string; label: string }[];
};

function formatDate(ymd?: string): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function formatInstant(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function ManageBookingClient() {
  const t = useTranslations("manageBooking");
  const tRooms = useTranslations("rooms");
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const token = searchParams.get("t") ?? "";

  const [data, setData] = useState<ManageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams({ id, t: token });
      const res = await fetch(`/api/booking/manage?${qs}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t("notFound"));
      setData(body as ManageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notFound"));
    }
  }, [id, token, t]);

  const hasLink = Boolean(id && token);

  useEffect(() => {
    if (hasLink) load();
  }, [hasLink, load]);

  async function pay() {
    setBusy("pay");
    setError(null);
    try {
      const res = await fetch("/api/booking/manage/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, t: token }),
      });
      const body = await res.json();
      if (!res.ok || !body.authorizationUrl) throw new Error(body.error ?? t("payError"));
      window.location.href = body.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("payError"));
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    setError(null);
    try {
      const res = await fetch("/api/booking/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, t: token }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t("cancelError"));
      setNotice(
        body.refundNgn > 0
          ? t("cancelledWithRefund", { amount: formatNaira(body.refundNgn) })
          : t("cancelled"),
      );
      setConfirmingCancel(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cancelError"));
    } finally {
      setBusy(null);
    }
  }

  if (!hasLink || (error && !data)) {
    return <p className="text-sm text-red-600">{hasLink ? error : t("notFound")}</p>;
  }
  if (!data) {
    return (
      <p className="text-muted" role="status" aria-live="polite">
        {t("loading")}
      </p>
    );
  }

  const { booking, policy, extras } = data;
  const nameOf = (roomId?: string) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? tRooms(`${room.nameKey.split(".")[1]}.name`) : (roomId ?? "");
  };
  const roomLabel =
    booking.lines.length > 1
      ? booking.lines.map((l) => `${l.rooms} × ${nameOf(l.roomId)}`).join(", ")
      : nameOf(booking.roomId);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-serif text-2xl font-semibold">{roomLabel}</p>
            <p className="mt-1 text-sm text-muted">
              {t("reference")}: <code>{booking.id}</code>
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wider">
            {t(`status.${booking.status}`)}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <Detail label={t("checkIn")} value={formatDate(booking.checkIn)} />
          <Detail label={t("checkOut")} value={formatDate(booking.checkOut)} />
          <Detail label={t("guests")} value={String(booking.guests)} />
          <Detail label={t("rooms")} value={String(booking.rooms)} />
          {booking.couponCode ? <Detail label={t("promoCode")} value={booking.couponCode} /> : null}
          {extras.length ? (
            <Detail label={t("extras")} value={extras.map((e) => e.label).join(", ")} />
          ) : null}
        </dl>

        <dl className="mt-6 grid gap-3 border-t border-border/60 pt-6 text-sm sm:grid-cols-3">
          <Detail label={t("total")} value={formatNaira(booking.totalNgn)} />
          <Detail label={t("paid")} value={formatNaira(booking.paidNgn)} />
          <Detail
            label={t("due")}
            value={formatNaira(Math.max(0, booking.totalNgn - booking.paidNgn))}
          />
        </dl>
      </div>

      {notice ? <p className="text-sm text-teal-dark">{notice}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {data.checkin ? (
        <OnlineCheckinCard id={id} token={token} info={data.checkin} onDone={load} />
      ) : null}

      {booking.amountDueKind ? (
        <div className="rounded-2xl border-2 border-teal/30 bg-teal/5 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {booking.amountDueKind === "deposit" ? t("depositDue") : t("balanceDue")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-teal-dark">
            {formatNaira(booking.amountDueNgn)}
          </p>
          {booking.amountDueKind === "deposit" && booking.holdExpiresAt ? (
            <p className="mt-1 text-xs text-muted">
              {t("holdUntil", { time: formatInstant(booking.holdExpiresAt) })}
            </p>
          ) : null}
          <button
            type="button"
            onClick={pay}
            disabled={busy !== null}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950 hover:bg-teal-dark disabled:opacity-60"
          >
            {busy === "pay" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CreditCard className="h-4 w-4" aria-hidden />
            )}
            {t("payNow")}
          </button>
        </div>
      ) : null}

      {booking.canCancel ? (
        <div className="rounded-2xl border border-border p-6">
          <p className="font-medium">{t("cancelTitle")}</p>
          <p className="mt-1 text-sm text-muted">
            {booking.paidNgn === 0
              ? t("cancelFreeUnpaid")
              : booking.refundIfCancelledNgn > 0
                ? t("cancelRefund", {
                    amount: formatNaira(booking.refundIfCancelledNgn),
                    until: formatInstant(booking.freeCancelUntil),
                  })
                : t("cancelNoRefund", { hours: policy.freeCancelHoursBefore })}
          </p>
          {confirmingCancel ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={cancel}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy === "cancel" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <XCircle className="h-4 w-4" aria-hidden />
                )}
                {t("confirmCancel")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingCancel(false)}
                disabled={busy !== null}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium"
              >
                {t("keepBooking")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="mt-4 rounded-full border border-red-600/40 px-5 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              {t("cancelBooking")}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{value}</dd>
    </div>
  );
}
