"use client";

import { rooms } from "@/content/site";
import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import type { RateCalendar, RateCell } from "@/lib/booking-engine/rate-calendar";
import { addDaysToDateString } from "@/lib/booking-search";
import { getAccessLevel, parseStaffRole } from "@/lib/staff-roles";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";
const DAYS = 14;
const input = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";
const today = () => new Date().toISOString().slice(0, 10);
const shortNaira = (n: number) => (n >= 1000 ? `₦${Math.round(n / 1000)}k` : `₦${n}`);

type Selected = { roomId: string; date: string };

export function RateCalendarClient() {
  const t = useTranslations("staffRateCalendar");
  const tRooms = useTranslations("rooms");
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [from, setFrom] = useState(today);
  const [data, setData] = useState<(RateCalendar & { canEdit: boolean | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [nights, setNights] = useState(1);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setKey(
      searchParams.get("key") ??
        (typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_STORAGE_KEY) : null) ??
        DEFAULT_KEY,
    );
  }, [searchParams]);
  const keyQ = key ? `&key=${encodeURIComponent(key)}` : "";

  const load = useCallback(async () => {
    if (key === null) return;
    const res = await fetch(`/api/staff/rate-calendar?from=${from}&days=${DAYS}${keyQ}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(res.status === 401 ? t("badKey") : res.status === 403 ? t("noAccess") : (body?.error ?? t("error")));
      return;
    }
    setError(null);
    setData(body);
  }, [from, key, keyQ, t]);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit =
    data?.canEdit ?? getAccessLevel(parseStaffRole(searchParams.get("role")), "/staff/rates") === "full";

  const roomName = (id: string) => {
    const room = rooms.find((r) => r.id === id);
    return room ? tRooms(`${room.nameKey.split(".")[1]}.name`) : id;
  };

  function select(roomId: string, cell: RateCell) {
    setSelected({ roomId, date: cell.date });
    setNights(1);
    setPrice(String(cell.nightlyNgn));
    setNotice(null);
  }

  async function save(change: { nightlyNgn?: number; closed?: boolean }) {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    const res = await fetch(`/api/staff/rate-calendar?x=1${keyQ}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: selected.roomId,
        from: selected.date,
        to: addDaysToDateString(selected.date, nights),
        ...change,
      }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    setNotice(res.ok ? t("saved") : (body?.error ?? t("error")));
    if (res.ok) load();
  }

  const weekday = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
  const dayNum = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <Link href={{ pathname: "/staff", query: key ? { key } : undefined }} className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-teal">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToPortal")}
      </Link>
      <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
      <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 text-muted">{t("subtitle")}</p>
      {key !== null && (
        <StaffCalendarKeyForm key={key} initialKey={key} loading={!data && !error} onSubmit={(next) => { window.sessionStorage.setItem(SESSION_STORAGE_KEY, next); setKey(next); }} placeholder={t("keyPlaceholder")} submitLabel={t("unlock")} />
      )}
      {error ? <p className="mb-6 text-sm text-red-600">{error}</p> : null}

      {data ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" aria-label={t("earlier")} onClick={() => setFrom(addDaysToDateString(from, -DAYS))} className="rounded-lg border border-border p-2 hover:border-teal">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <input type="date" aria-label={t("startDate")} value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm" />
            <button type="button" aria-label={t("later")} onClick={() => setFrom(addDaysToDateString(from, DAYS))} className="rounded-lg border border-border p-2 hover:border-teal">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <span className="text-xs text-muted">{t("legend")}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-card/60">
                  <th scope="col" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">{t("roomType")}</th>
                  {data.days.map((d) => (
                    <th key={d} scope="col" className="min-w-[4.25rem] px-1 py-2 text-center font-medium">
                      <span className="block text-muted">{weekday(d)}</span>
                      {dayNum(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((room) => (
                  <tr key={room.roomId} className="border-t border-border">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">
                      {roomName(room.roomId)}
                      <span className="block font-normal text-muted">{t("rooms", { n: room.inventory })}</span>
                    </th>
                    {room.cells.map((cell) => {
                      const isSelected = selected?.roomId === room.roomId && selected.date === cell.date;
                      const soldOut = cell.free === 0;
                      return (
                        <td key={cell.date} className="p-0.5">
                          <button
                            type="button"
                            onClick={() => select(room.roomId, cell)}
                            aria-pressed={isSelected}
                            aria-label={t("cellLabel", { room: roomName(room.roomId), date: cell.date, price: cell.nightlyNgn, free: cell.free })}
                            className={cn(
                              "flex h-14 w-full flex-col items-center justify-center rounded-md border text-center",
                              cell.closed ? "border-red-400/50 bg-red-500/10" : soldOut ? "border-border bg-muted/10" : "border-transparent bg-teal/5 hover:border-teal",
                              cell.seasonLabel && !cell.closed && "bg-amber-500/10",
                              isSelected && "ring-2 ring-teal",
                            )}
                          >
                            <span className="font-medium">{shortNaira(cell.nightlyNgn)}</span>
                            <span className={cn("text-[10px]", soldOut || cell.closed ? "text-red-600" : "text-muted")}>
                              {cell.closed ? t("closed") : t("free", { n: cell.free })}
                            </span>
                            {cell.noArrival || cell.noDeparture || (cell.minNights ?? 1) > 1 ? (
                              <span className="text-[9px] text-muted">
                                {[cell.noArrival && t("noArrivalShort"), cell.noDeparture && t("noDepartureShort"), (cell.minNights ?? 1) > 1 && t("minShort", { n: cell.minNights ?? 1 })].filter(Boolean).join(" ")}
                              </span>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected ? (
            <section aria-labelledby="edit-rate" className="mt-6 space-y-3 rounded-xl border border-border bg-card/50 p-4">
              <h2 id="edit-rate" className="font-medium">
                {t("editTitle", { room: roomName(selected.roomId), date: selected.date })}
              </h2>
              {!canEdit ? <p className="text-sm text-muted">{t("viewOnly")}</p> : null}
              <div className={cn("grid gap-3 sm:grid-cols-[8rem_12rem_1fr]", !canEdit && "hidden")}>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted">{t("nights")}</span>
                  <input id="rate-nights" type="number" min={1} max={365} className={input} value={nights} onChange={(e) => setNights(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted">{t("price")}</span>
                  <input id="rate-price" type="number" min={1} className={input} value={price} onChange={(e) => setPrice(e.target.value)} />
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  <button type="button" disabled={busy || !(Number(price) >= 1)} onClick={() => save({ nightlyNgn: Math.round(Number(price)) })} className="h-9 rounded-lg bg-teal px-4 text-sm font-medium text-gray-950 disabled:opacity-60">
                    {t("setPrice")}
                  </button>
                  <button type="button" disabled={busy} onClick={() => save({ closed: true })} className="h-9 rounded-lg border border-border px-3 text-sm hover:border-red-500/50 disabled:opacity-60">
                    {t("stopSale")}
                  </button>
                  <button type="button" disabled={busy} onClick={() => save({ closed: false })} className="h-9 rounded-lg border border-border px-3 text-sm hover:border-teal disabled:opacity-60">
                    {t("reopen")}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted">{t("editHint")}</p>
              {notice ? <p className="text-sm text-muted" role="status">{notice}</p> : null}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
