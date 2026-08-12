"use client";

import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { useRoomBlocks } from "@/features/staff-housekeeping/hooks/use-room-blocks";
import type { RoomBlockType } from "@/features/staff-housekeeping/types";
import { rooms } from "@/content/site";
import { addDays, formatYmd } from "@/lib/reservation-dates";
import { Link } from "@/i18n/navigation";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

export function StaffHousekeepingClient() {
  const t = useTranslations("staffHousekeeping");
  const tRooms = useTranslations("rooms");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");

  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    const resolved =
      keyFromUrl ??
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem(SESSION_STORAGE_KEY)
        : null) ??
      DEFAULT_KEY;
    setKey(resolved);
  }, [keyFromUrl]);

  const { blocks, loading, error, loadedOnce, actionError, addBlock, markClean, refresh } =
    useRoomBlocks(key);

  const hasData = loadedOnce && !error;

  function handleKeySubmit(nextKey: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextKey);
    }
    setKey(nextKey);
  }

  const roomOptions = useMemo(
    () =>
      rooms.map((room) => {
        const path = room.nameKey.replace(/^rooms\./, "");
        return { id: room.id, label: tRooms(path as "guest.name") };
      }),
    [tRooms],
  );

  const [roomId, setRoomId] = useState<string>(rooms[0]?.id ?? "");
  const [blockType, setBlockType] = useState<RoomBlockType>("housekeeping");
  const [checkIn, setCheckIn] = useState(() => formatYmd(new Date()));
  const [checkOut, setCheckOut] = useState(() => formatYmd(addDays(new Date(), 1)));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAddBlock(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const ok = await addBlock({
      roomId,
      checkIn,
      checkOut,
      blockType,
      reason: reason.trim() || undefined,
    });
    setSubmitting(false);
    if (ok) setReason("");
  }

  function roomLabel(id: string): string {
    return roomOptions.find((r) => r.id === id)?.label ?? id;
  }

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
    [blocks],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
      <Link
        href={{ pathname: "/staff", query: key ? { key } : undefined }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors duration-200 hover:text-teal"
      >
        {t("backToPortal")}
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
          <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("subtitle")}</p>
        </div>
        {hasData ? (
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            {t("refresh")}
          </button>
        ) : null}
      </div>

      {key !== null && (
        <StaffCalendarKeyForm
          key={key}
          initialKey={key}
          loading={loading}
          onSubmit={handleKeySubmit}
          placeholder={t("keyPlaceholder")}
          submitLabel={t("unlock")}
        />
      )}

      {error && <p className="mb-6 text-sm text-red-600">{error}</p>}
      {loading && !loadedOnce ? (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {t("loading")}
        </p>
      ) : null}

      {hasData ? (
        <>
          <form
            onSubmit={handleAddBlock}
            className="mb-8 grid gap-3 rounded-xl border border-border bg-card/50 p-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <label className="flex flex-col gap-1 text-sm">
              {t("form.room")}
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
              >
                {roomOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t("form.blockType")}
              <select
                value={blockType}
                onChange={(e) => setBlockType(e.target.value as RoomBlockType)}
                className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
              >
                <option value="housekeeping">{t("blockType.housekeeping")}</option>
                <option value="maintenance">{t("blockType.maintenance")}</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t("form.blockedFrom")}
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t("form.freeFrom")}
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm lg:col-span-1">
              {t("form.reason")}
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("form.reasonPlaceholder")}
                className="h-10 rounded-lg border border-border bg-card px-2 text-sm"
              />
            </label>

            <div className="sm:col-span-2 lg:col-span-5">
              <button
                type="submit"
                disabled={submitting}
                className="h-10 rounded-lg bg-teal px-4 text-sm font-medium text-gray-950 disabled:opacity-60"
              >
                {submitting ? t("form.submitting") : t("form.submit")}
              </button>
              <p className="mt-2 text-xs text-muted">{t("form.roleHint")}</p>
              {actionError ? (
                <p className="mt-2 text-sm text-red-600">{actionError}</p>
              ) : null}
            </div>
          </form>

          {sortedBlocks.length === 0 ? (
            <p className="text-sm text-muted">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {sortedBlocks.map((block) => (
                <li
                  key={block.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-4"
                >
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {roomLabel(block.roomId)}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          block.blockType === "housekeeping"
                            ? "bg-slate-500/20 text-slate-700 dark:text-slate-300"
                            : "bg-amber-500/20 text-amber-900 dark:text-amber-100"
                        }`}
                      >
                        {t(`blockType.${block.blockType}`)}
                      </span>
                    </p>
                    <p className="text-sm text-muted">
                      {t("blockedRange", { from: block.checkIn, to: block.checkOut })}
                    </p>
                    {block.reason ? (
                      <p className="text-xs text-muted">{block.reason}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => markClean(block.id)}
                    className="rounded-full border border-border px-4 py-2 text-sm hover:border-teal"
                  >
                    {t("markClean")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
