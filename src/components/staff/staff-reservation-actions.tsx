"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function StaffReservationActions({
  reservationId,
  dashboardKey,
  source,
  staffNotes,
  onUpdated,
  compact = false,
}: {
  reservationId: string;
  dashboardKey: string;
  source: string;
  staffNotes?: string;
  onUpdated: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("demo");
  const [busy, setBusy] = useState<"confirm" | "cancel" | "notes" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(staffNotes ?? "");
  const readOnly = source === "demo";

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(
      `/api/demo/reservations/${encodeURIComponent(reservationId)}?key=${encodeURIComponent(dashboardKey)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const json = (await res.json().catch(() => null)) as {
      error?: string;
      rayza?: { ok: boolean; error?: string };
    } | null;
    if (!res.ok) {
      throw new Error(json?.error ?? t("staffActions.error"));
    }
    if (json?.rayza && !json.rayza.ok) {
      console.warn("[RAYZA]", json.rayza.error);
    }
  }

  async function handleConfirm() {
    setBusy("confirm");
    setError(null);
    try {
      await patch({ status: "confirmed" });
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("staffActions.error"));
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!window.confirm(t("staffActions.cancelConfirm"))) return;
    setBusy("cancel");
    setError(null);
    try {
      await patch({ status: "cancelled" });
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("staffActions.error"));
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveNotes() {
    setBusy("notes");
    setError(null);
    try {
      await patch({ staffNotes: notes.trim() });
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("staffActions.error"));
    } finally {
      setBusy(null);
    }
  }

  if (readOnly) {
    return (
      <p className="mt-2 text-[10px] text-muted">{t("staffActions.demoReadOnly")}</p>
    );
  }

  return (
    <div className={cn("space-y-2", compact ? "mt-2" : "mt-3")}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy !== null}
          className="inline-flex rounded-full bg-teal px-3 py-1.5 text-xs font-medium text-gray-950 hover:bg-teal-dark disabled:opacity-50"
        >
          {busy === "confirm" ? t("staffActions.working") : t("staffActions.confirm")}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy !== null}
          className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-red-500/50 disabled:opacity-50"
        >
          {busy === "cancel" ? t("staffActions.working") : t("staffActions.cancel")}
        </button>
      </div>
      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {t("staffActions.notesLabel")}
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
          placeholder={t("staffActions.notesPlaceholder")}
        />
      </label>
      <button
        type="button"
        onClick={handleSaveNotes}
        disabled={busy !== null}
        className="inline-flex rounded-full border border-border px-3 py-1 text-xs hover:border-teal disabled:opacity-50"
      >
        {busy === "notes" ? t("staffActions.working") : t("staffActions.saveNotes")}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
