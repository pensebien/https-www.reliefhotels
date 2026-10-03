"use client";

import { rooms } from "@/content/site";
import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import type { DailyPoint, HotelReport } from "@/lib/reports/build";
import { formatNaira } from "@/lib/utils";
import { ArrowLeft, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";
/** Single-series bar colour; passes the chart palette checks on light and dark surfaces. */
const BAR_FILL = "#0d9488";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presets(): Record<string, [string, string]> {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const plus = (n: number) => new Date(Date.now() + n * 86_400_000);
  return {
    thisMonth: [ymd(start), ymd(today)],
    last30: [ymd(plus(-29)), ymd(today)],
    next30: [ymd(today), ymd(plus(29))],
  };
}

export function StaffReportsClient() {
  const t = useTranslations("staffReports");
  const tRooms = useTranslations("rooms");
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [range, setRange] = useState<[string, string]>(() => presets().thisMonth);
  const [report, setReport] = useState<HotelReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setKey(
      searchParams.get("key") ??
        (typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_STORAGE_KEY) : null) ??
        DEFAULT_KEY,
    );
  }, [searchParams]);

  const query = useMemo(() => {
    const qs = new URLSearchParams({ from: range[0], to: range[1] });
    if (key) qs.set("key", key);
    return qs.toString();
  }, [key, range]);

  const load = useCallback(async () => {
    if (key === null) return;
    setLoading(true);
    const res = await fetch(`/api/staff/reports?${query}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(res.status === 401 ? "Invalid dashboard key." : res.status === 403 ? "Your role cannot do this." : body?.error ?? t("error"));
      return;
    }
    setError(null);
    setReport(body.report);
  }, [key, query, t]);

  useEffect(() => {
    load();
  }, [load]);

  const roomName = (id: string) => {
    const room = rooms.find((r) => r.id === id);
    return room ? tRooms(`${room.nameKey.split(".")[1]}.name`) : id;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <Link
        href={{ pathname: "/staff", query: key ? { key } : undefined }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-teal"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToPortal")}
      </Link>
      <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
      <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 max-w-2xl text-muted">{t("subtitle")}</p>

      {key !== null && (
        <StaffCalendarKeyForm
          key={key}
          initialKey={key}
          loading={loading}
          onSubmit={(next) => {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
            setKey(next);
          }}
          placeholder={t("keyPlaceholder")}
          submitLabel={t("unlock")}
        />
      )}

      <div className="mb-8 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted">{t("from")}</span>
          <input
            id="report-from"
            type="date"
            value={range[0]}
            onChange={(e) => e.target.value && setRange(([, to]) => [e.target.value, to])}
            className="h-10 rounded-lg border border-border bg-background px-3"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted">{t("to")}</span>
          <input
            id="report-to"
            type="date"
            value={range[1]}
            onChange={(e) => e.target.value && setRange(([from]) => [from, e.target.value])}
            className="h-10 rounded-lg border border-border bg-background px-3"
          />
        </label>
        {Object.entries(presets()).map(([id, value]) => (
          <button
            key={id}
            type="button"
            onClick={() => setRange(value)}
            className="h-10 rounded-lg border border-border px-3 text-sm hover:border-teal"
          >
            {t(`preset.${id}`)}
          </button>
        ))}
        <a
          href={`/api/staff/reports?${query}&format=csv`}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:border-teal"
        >
          <Download className="h-4 w-4" aria-hidden />
          {t("csv")}
        </a>
      </div>

      {error ? <p className="mb-6 text-sm text-red-600">{error}</p> : null}
      {loading && !report ? <p className="text-sm text-muted">{t("loading")}</p> : null}

      {report ? (
        <div className="space-y-10">
          <section aria-labelledby="key-metrics">
            <h2 id="key-metrics" className="mb-4 font-serif text-xl font-medium">{t("keyMetrics")}</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Stat label={t("revenue")} value={formatNaira(report.keyMetrics.totalRevenueNgn)} hint={t("revenueSplit", { rooms: formatNaira(report.keyMetrics.roomRevenueNgn), extras: formatNaira(report.keyMetrics.extrasRevenueNgn) })} />
              <Stat label={t("adr")} value={formatNaira(report.keyMetrics.adrNgn)} hint={t("adrHint")} />
              <Stat label={t("revpar")} value={formatNaira(report.keyMetrics.revparNgn)} hint={t("revparHint")} />
              <Stat label={t("occupancy")} value={`${report.occupancy.occupancyPct}%`} hint={t("roomNightsOf", { sold: report.occupancy.roomNightsSold, available: report.occupancy.roomNightsAvailable })} />
              <Stat label={t("guestNights")} value={String(report.occupancy.guestNights)} hint={t("guestsCount", { count: report.occupancy.guests })} />
              <Stat label={t("bookings")} value={String(report.bookingsCreated.count)} hint={t("cancelledPct", { pct: report.bookingsCreated.cancellationPct })} />
            </div>
          </section>

          <OccupancyChart daily={report.daily} />

          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="by-room" className="min-w-0">
              <h2 id="by-room" className="mb-3 font-serif text-xl font-medium">{t("byRoomType")}</h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm tabular-nums">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 font-medium">{t("roomType")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("roomNights")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("occupancy")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byRoomType.map((row) => (
                      <tr key={row.roomId} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2">{roomName(row.roomId)}</td>
                        <td className="px-3 py-2 text-right">{row.roomNights}</td>
                        <td className="px-3 py-2 text-right">{row.occupancyPct}%</td>
                        <td className="px-3 py-2 text-right">{formatNaira(row.revenueNgn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="bookings-made" className="min-w-0 space-y-6">
              <div>
                <h2 id="bookings-made" className="mb-3 font-serif text-xl font-medium">{t("bookingsMade")}</h2>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <MiniStat label={t("online")} value={report.bookingsCreated.online} />
                  <MiniStat label={t("desk")} value={report.bookingsCreated.desk} />
                  <MiniStat label={t("cancelled")} value={report.bookingsCreated.cancelled} />
                  <MiniStat label={t("leadTime")} value={t("days", { n: report.bookingsCreated.medianLeadDays })} />
                </dl>
              </div>
              <div>
                <h2 className="mb-3 font-serif text-xl font-medium">{t("payments")}</h2>
                {report.paymentsByMethod.length === 0 ? (
                  <p className="text-sm text-muted">{t("noPayments")}</p>
                ) : (
                  <ul className="divide-y divide-border/60 rounded-xl border border-border text-sm tabular-nums">
                    {report.paymentsByMethod.map((p) => (
                      <li key={p.method} className="flex justify-between gap-3 px-3 py-2">
                        <span>
                          {t(`method.${p.method}`)} <span className="text-muted">· {p.count}</span>
                        </span>
                        <span>{formatNaira(p.amountNgn)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
          <p className="text-xs text-muted">{t("definitions")}</p>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

const CHART_H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

/** Rooms occupied per day (bars) against rooms available (reference line). */
function OccupancyChart({ daily }: { daily: DailyPoint[] }) {
  const t = useTranslations("staffReports");
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  // Fill the panel: measure it, and give each day an equal share (at least 8px, scrolls beyond that).
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [asTable]);

  const slot = Math.max(8, ((frameWidth || 640) - PAD.left - PAD.right) / Math.max(1, daily.length));
  const width = Math.max(320, daily.length * slot + PAD.left + PAD.right);
  const maxY = Math.max(1, ...daily.map((d) => Math.max(d.availableRooms, d.occupiedRooms)));
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + plotH - (v / maxY) * plotH;
  const barW = Math.max(2, Math.min(24, slot - 2));
  const ticks = [0, Math.round(maxY / 2), maxY];
  const labelEvery = Math.max(1, Math.ceil(daily.length / 8));
  const capacity = daily.length ? daily[0].availableRooms : 0;
  const steadyCapacity = daily.every((d) => d.availableRooms === capacity);

  return (
    <section aria-labelledby="occupancy-chart">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="occupancy-chart" className="font-serif text-xl font-medium">{t("chartTitle")}</h2>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-teal"
        >
          {asTable ? t("showChart") : t("showTable")}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-80 overflow-auto rounded-xl border border-border">
          <table className="w-full text-sm tabular-nums">
            <thead className="sticky top-0 bg-background text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{t("date")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("occupiedRooms")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("availableRooms")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("guests")}</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date} className="border-t border-border/60">
                  <td className="px-3 py-1.5">{d.date}</td>
                  <td className="px-3 py-1.5 text-right">{d.occupiedRooms}</td>
                  <td className="px-3 py-1.5 text-right">{d.availableRooms}</td>
                  <td className="px-3 py-1.5 text-right">{d.guests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={frameRef} className="relative overflow-x-auto rounded-xl border border-border bg-card/50 p-2">
          <svg
            viewBox={`0 0 ${width} ${CHART_H}`}
            width={width}
            height={CHART_H}
            role="img"
            aria-label={t("chartAria", { days: daily.length })}
            className="block max-w-none"
            onMouseLeave={() => setHover(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeWidth={1} />
                <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                  {tick}
                </text>
              </g>
            ))}
            {daily.map((d, i) => {
              const x = PAD.left + i * slot + (slot - barW) / 2;
              const top = y(d.occupiedRooms);
              const h = PAD.top + plotH - top;
              const r = Math.min(4, h / 2, barW / 2);
              return (
                <g key={d.date}>
                  {h > 0 ? (
                    <path
                      d={`M${x},${PAD.top + plotH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD.top + plotH} Z`}
                      fill={BAR_FILL}
                      opacity={hover === null || hover === i ? 1 : 0.55}
                    />
                  ) : null}
                  {i % labelEvery === 0 ? (
                    <text x={PAD.left + i * slot + slot / 2} y={CHART_H - 8} textAnchor="middle" fontSize={10} fill="var(--muted)">
                      {d.date.slice(5)}
                    </text>
                  ) : null}
                  <rect
                    x={PAD.left + i * slot}
                    y={PAD.top}
                    width={slot}
                    height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={0}
                    aria-label={t("barAria", { date: d.date, occupied: d.occupiedRooms, available: d.availableRooms })}
                  />
                </g>
              );
            })}
            {steadyCapacity && capacity > 0 ? (
              <g>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(capacity)} y2={y(capacity)} stroke="var(--foreground)" strokeOpacity={0.45} strokeWidth={1} />
                <text x={width - PAD.right} y={y(capacity) - 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                  {t("capacityLabel", { n: capacity })}
                </text>
              </g>
            ) : null}
          </svg>
          {hover !== null && daily[hover] ? (
            <div
              role="status"
              className="pointer-events-none absolute top-2 rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm"
              style={{ left: Math.min(PAD.left + hover * slot + slot + 8, width - 170) }}
            >
              <p className="font-medium">{daily[hover].date}</p>
              <p>{t("tooltipOccupied", { occupied: daily[hover].occupiedRooms, available: daily[hover].availableRooms })}</p>
              <p className="text-muted">{t("tooltipGuests", { guests: daily[hover].guests, blocked: daily[hover].blockedRooms })}</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
