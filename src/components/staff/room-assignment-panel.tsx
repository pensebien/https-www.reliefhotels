"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Options = {
  rooms: { unitId: string; label: string; free: boolean }[];
  current: string[];
  units: number;
};

/** Assign or move a stay's physical rooms (Room 101). Taken rooms are listed but disabled. */
export function RoomAssignmentPanel({
  reservationId,
  dashboardKey,
  onUpdated,
}: {
  reservationId: string;
  dashboardKey: string;
  onUpdated: () => void;
}) {
  const t = useTranslations("demo.roomAssignment");
  const [options, setOptions] = useState<Options | null>(null);
  const [choice, setChoice] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/staff/reservations/${encodeURIComponent(reservationId)}/rooms?key=${encodeURIComponent(dashboardKey)}`;

  const load = useCallback(async () => {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error ?? t("loadError"));
      return;
    }
    const next = body as Options;
    setOptions(next);
    setChoice(Array.from({ length: next.units }, (_, i) => next.current[i] ?? ""));
  }, [t, url]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(body: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(json?.error ?? t("saveError"));
      return;
    }
    onUpdated();
  }

  if (!options) {
    return error ? <p className="text-xs text-red-600">{error}</p> : null;
  }

  const labelFor = (unitId: string) => options.rooms.find((r) => r.unitId === unitId)?.label;
  const complete = choice.every(Boolean) && new Set(choice).size === choice.length;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("title")}</p>
      <p className="text-sm">
        {options.current.length
          ? t("assigned", { rooms: options.current.map(labelFor).join(", ") })
          : t("notAssigned")}
      </p>
      <div className="flex flex-wrap gap-2">
        {choice.map((value, slot) => (
          <select
            key={slot}
            id={`room-slot-${reservationId}-${slot}`}
            aria-label={t("roomSlot", { n: slot + 1 })}
            value={value}
            onChange={(e) =>
              setChoice((prev) => prev.map((v, i) => (i === slot ? e.target.value : v)))
            }
            className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="">{t("chooseRoom")}</option>
            {options.rooms.map((room) => (
              <option key={room.unitId} value={room.unitId} disabled={!room.free}>
                {room.free ? room.label : t("taken", { room: room.label })}
              </option>
            ))}
          </select>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !complete}
          onClick={() => submit({ unitIds: choice })}
          className="inline-flex rounded-full bg-teal px-3 py-1.5 text-xs font-medium text-gray-950 hover:bg-teal-dark disabled:opacity-50"
        >
          {busy ? t("working") : t("save")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit({ auto: true })}
          className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-teal disabled:opacity-50"
        >
          {t("auto")}
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
