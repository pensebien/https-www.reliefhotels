"use client";

import { rooms } from "@/content/site";
import type { BoardRoom } from "@/lib/housekeeping/board";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Filter = "all" | "dirty" | "due";

function lagosToday(): string {
  return new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
}

/** Today's rooms for cleaners: who's arriving/leaving, clean or dirty, tasks to tick off. */
export function HousekeepingBoard({ dashboardKey }: { dashboardKey: string }) {
  const t = useTranslations("staffHousekeeping.board");
  const tRooms = useTranslations("rooms");
  const [date, setDate] = useState(lagosToday);
  const [board, setBoard] = useState<BoardRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const q = `key=${encodeURIComponent(dashboardKey)}`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/staff/housekeeping/board?date=${date}&${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) setError(res.status === 403 ? t("forbidden") : body?.error ?? t("error"));
    else {
      setError(null);
      setBoard(body.rooms);
    }
  }, [date, q, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(unitId: string, status: "clean" | "dirty") {
    setBoard((prev) => prev?.map((r) => (r.unitId === unitId ? { ...r, status } : r)) ?? prev);
    const res = await fetch(`/api/staff/housekeeping/rooms/${encodeURIComponent(unitId)}?${q}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) load();
  }

  async function toggleTask(unitId: string, taskId: string, done: boolean) {
    setBoard(
      (prev) =>
        prev?.map((r) =>
          r.unitId === unitId ? { ...r, tasks: r.tasks.map((task) => (task.id === taskId ? { ...task, done } : task)) } : r,
        ) ?? prev,
    );
    const res = await fetch(`/api/staff/housekeeping/tasks?${q}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, taskId, date, done }),
    });
    if (!res.ok) load();
  }

  const typeName = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? tRooms(`${room.nameKey.split(".")[1]}.name`) : roomId;
  };

  const counts = useMemo(() => {
    const list = board ?? [];
    return {
      dirty: list.filter((r) => r.status === "dirty").length,
      departing: list.filter((r) => r.movement === "departing" || r.movement === "turnover").length,
      arriving: list.filter((r) => r.movement === "arriving" || r.movement === "turnover").length,
      stayover: list.filter((r) => r.movement === "stayover").length,
    };
  }, [board]);

  const shown = (board ?? []).filter((r) =>
    filter === "dirty" ? r.status === "dirty" : filter === "due" ? r.tasks.some((task) => !task.done) : true,
  );

  return (
    <section aria-labelledby="hk-board" className="mb-12 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="hk-board" className="font-serif text-2xl font-medium">{t("title")}</h2>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted">{t("date")}</span>
          <input id="hk-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-10 rounded-lg border border-border bg-background px-3" />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {board ? (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {(["dirty", "departing", "arriving", "stayover"] as const).map((k) => (
              <div key={k} className="rounded-xl border border-border bg-card/50 p-3">
                <dt className="text-xs text-muted">{t(`count.${k}`)}</dt>
                <dd className="text-xl font-semibold tabular-nums">{counts[k]}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterLabel")}>
            {(["all", "dirty", "due"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  filter === f ? "border-teal bg-teal/15 font-medium" : "border-border hover:border-teal",
                )}
              >
                {t(`filter.${f}`)}
              </button>
            ))}
          </div>
          {shown.length === 0 ? <p className="text-sm text-muted">{t("nothing")}</p> : null}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((room) => (
              <li key={room.unitId} className="space-y-2 rounded-xl border border-border bg-card/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-serif text-xl font-semibold">{t("room", { label: room.label })}</p>
                    <p className="text-xs text-muted">{typeName(room.roomId)}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      room.status === "dirty"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                        : "bg-teal/15 text-teal-dark",
                    )}
                  >
                    {t(`status.${room.status}`)}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="font-medium">{t(`movement.${room.movement}`)}</span>
                  {room.guestName ? <span className="text-muted"> · {room.guestName}</span> : null}
                  {room.movement === "stayover" && room.nightOfStay !== undefined ? (
                    <span className="text-muted"> · {t("night", { n: room.nightOfStay + 1 })}</span>
                  ) : null}
                </p>
                {room.tasks.length ? (
                  <ul className="space-y-1">
                    {room.tasks.map((task) => (
                      <li key={task.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={(e) => toggleTask(room.unitId, task.id, e.target.checked)}
                            className="h-4 w-4 accent-teal"
                          />
                          <span className={task.done ? "text-muted line-through" : ""}>{task.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  onClick={() => setStatus(room.unitId, room.status === "dirty" ? "clean" : "dirty")}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-sm font-medium",
                    room.status === "dirty" ? "bg-teal text-gray-950 hover:bg-teal-dark" : "border border-border hover:border-teal",
                  )}
                >
                  {room.status === "dirty" ? t("markClean") : t("markDirty")}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
