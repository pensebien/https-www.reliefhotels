"use client";

import { rooms } from "@/content/site";
import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import type { ChannelFeed, FeedStatus } from "@/lib/channels/feeds";
import { ArrowLeft, Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";
const input = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";

type Loaded = {
  feeds: ChannelFeed[];
  status: Record<string, FeedStatus>;
  exports: { roomId: string; url: string | null }[];
  scheduled: boolean;
};

export function StaffChannelsClient() {
  const t = useTranslations("staffChannels");
  const tRooms = useTranslations("rooms");
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [feeds, setFeeds] = useState<ChannelFeed[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "sync" | null>(null);

  useEffect(() => {
    setKey(
      searchParams.get("key") ??
        (typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_STORAGE_KEY) : null) ??
        DEFAULT_KEY,
    );
  }, [searchParams]);
  const q = key ? `?key=${encodeURIComponent(key)}` : "";

  const load = useCallback(async () => {
    if (key === null) return;
    const res = await fetch(`/api/staff/settings/channels${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(res.status === 401 ? "Invalid dashboard key." : res.status === 403 ? "Your role cannot do this." : body?.error ?? t("error"));
      return;
    }
    setError(null);
    setData(body);
    setFeeds(body.feeds);
  }, [key, q, t]);

  useEffect(() => {
    load();
  }, [load]);

  const roomName = (id: string) => {
    const room = rooms.find((r) => r.id === id);
    return room ? tRooms(`${room.nameKey.split(".")[1]}.name`) : id;
  };

  async function save() {
    setBusy("save");
    setNotice(null);
    const res = await fetch(`/api/staff/settings/channels${q}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feeds }),
    });
    const body = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) setNotice(body?.error ?? t("error"));
    else {
      setNotice(t("saved"));
      load();
    }
  }

  async function syncNow() {
    setBusy("sync");
    setNotice(null);
    const res = await fetch(`/api/staff/settings/channels/sync${q}`, { method: "POST" });
    setBusy(null);
    setNotice(res.ok ? t("synced") : t("error"));
    load();
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(t("copied"));
    } catch {
      setNotice(url);
    }
  }

  const update = (i: number, change: Partial<ChannelFeed>) => setFeeds((prev) => prev.map((f, j) => (j === i ? { ...f, ...change } : f)));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
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
      {data && !data.scheduled ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">{t("notScheduled")}</p>
      ) : null}

      {data ? (
        <div className="space-y-10">
          <section aria-labelledby="exports" className="space-y-3">
            <h2 id="exports" className="font-serif text-xl font-medium">{t("exportTitle")}</h2>
            <p className="text-sm text-muted">{t("exportHint")}</p>
            <ul className="space-y-2">
              {data.exports.map((e) => (
                <li key={e.roomId} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/50 p-3">
                  <span className="w-40 shrink-0 text-sm font-medium">{roomName(e.roomId)}</span>
                  <code className="min-w-0 flex-1 truncate rounded bg-muted/10 px-2 py-1 text-xs">{e.url ?? t("noSecret")}</code>
                  {e.url ? (
                    <button type="button" onClick={() => copy(e.url!)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:border-teal">
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      {t("copy")}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="imports" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="imports" className="font-serif text-xl font-medium">{t("importTitle")}</h2>
              <button type="button" onClick={syncNow} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal disabled:opacity-50">
                <RefreshCw className="h-4 w-4" aria-hidden />
                {busy === "sync" ? t("syncing") : t("syncNow")}
              </button>
            </div>
            <p className="text-sm text-muted">{t("importHint")}</p>
            {feeds.length === 0 ? <p className="text-sm text-muted">{t("none")}</p> : null}
            {feeds.map((feed, i) => {
              const s = data.status[feed.id];
              return (
                <div key={feed.id} className="grid gap-3 rounded-xl border border-border bg-card/50 p-4 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-muted">{t("channelName")}</span>
                    <input id={`feed-label-${feed.id}`} className={input} value={feed.label} onChange={(e) => update(i, { label: e.target.value })} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs text-muted">{t("roomType")}</span>
                    <select id={`feed-room-${feed.id}`} className={input} value={feed.roomId} onChange={(e) => update(i, { roomId: e.target.value })}>
                      {rooms.map((r) => <option key={r.id} value={r.id}>{roomName(r.id)}</option>)}
                    </select>
                  </label>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-1.5 pb-2 text-sm">
                      <input id={`feed-active-${feed.id}`} type="checkbox" className="h-4 w-4 accent-teal" checked={feed.active} onChange={(e) => update(i, { active: e.target.checked })} />
                      {t("active")}
                    </label>
                    <button type="button" aria-label={t("remove")} onClick={() => setFeeds((prev) => prev.filter((_, j) => j !== i))} className="rounded p-2 text-muted hover:text-red-600">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <label className="block text-sm sm:col-span-3">
                    <span className="mb-1 block text-xs text-muted">{t("feedUrl")}</span>
                    <input id={`feed-url-${feed.id}`} className={input} value={feed.url} placeholder="https://…/calendar.ics" onChange={(e) => update(i, { url: e.target.value })} />
                  </label>
                  {s ? (
                    <p className={`text-xs sm:col-span-3 ${s.ok ? "text-muted" : "text-red-600"}`}>
                      {s.ok ? t("lastSync", { when: s.at.slice(0, 16).replace("T", " "), n: s.events ?? 0 }) : t("lastError", { when: s.at.slice(0, 16).replace("T", " "), error: s.error ?? "" })}
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setFeeds((prev) => [...prev, { id: `feed-${Date.now()}`, label: "Airbnb", roomId: rooms[0].id, url: "", active: true }])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal">
                <Plus className="h-4 w-4" aria-hidden />
                {t("add")}
              </button>
              <button type="button" onClick={save} disabled={busy !== null} className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950 disabled:opacity-60">
                {busy === "save" ? t("saving") : t("save")}
              </button>
              {notice ? <span className="break-all text-sm text-muted" role="status">{notice}</span> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
