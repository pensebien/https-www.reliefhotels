"use client";

import { rooms } from "@/content/site";
import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import type { RoomSetup, RoomSetupRoom } from "@/lib/room-setup";
import { ArrowLeft, ImagePlus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

const inputClass = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";
const cellLabel = "mb-1 block text-xs font-medium text-muted";

function keyQuery(key: string | null): string {
  return key ? `?key=${encodeURIComponent(key)}` : "";
}

async function readError(res: Response): Promise<string> {
  if (res.status === 401) return "Invalid dashboard key.";
  if (res.status === 403) return "Your role cannot do this.";
  const body = await res.json().catch(() => null);
  const issues = Array.isArray(body?.issues) ? `: ${body.issues.join("; ")}` : "";
  return `${body?.error ?? `Request failed (${res.status})`}${issues}`;
}

export function StaffRoomSettingsClient() {
  const t = useTranslations("staffRoomSettings");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");
  const [key, setKey] = useState<string | null>(null);
  const [setup, setSetup] = useState<RoomSetup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setKey(
      keyFromUrl ??
        (typeof window !== "undefined"
          ? window.sessionStorage.getItem(SESSION_STORAGE_KEY)
          : null) ??
        DEFAULT_KEY,
    );
  }, [keyFromUrl]);

  const load = useCallback(async (loadKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/settings/rooms${keyQuery(loadKey)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await readError(res));
      setSetup(((await res.json()) as { setup: RoomSetup }).setup);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (key !== null) load(key);
  }, [key, load]);

  function handleKeySubmit(nextKey: string) {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextKey);
    setKey(nextKey);
  }

  async function save(next: RoomSetup): Promise<string | null> {
    const res = await fetch(`/api/staff/settings/rooms${keyQuery(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) return readError(res);
    setSetup(((await res.json()) as { setup: RoomSetup }).setup);
    return null;
  }

  async function upload(roomId: string, file: File): Promise<{ url?: string; error?: string }> {
    const form = new FormData();
    form.set("roomId", roomId);
    form.set("file", file);
    const res = await fetch(`/api/staff/settings/rooms/photos${keyQuery(key)}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) return { error: await readError(res) };
    return { url: ((await res.json()) as { url: string }).url };
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <Link
        href={{ pathname: "/staff", query: key ? { key } : undefined }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors duration-200 hover:text-teal"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToPortal")}
      </Link>

      <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
      <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 text-muted">{t("subtitle")}</p>

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
      {loading && !setup ? (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {t("loading")}
        </p>
      ) : null}

      {setup ? (
        <RoomSetupForm key={JSON.stringify(setup)} initial={setup} onSave={save} onUpload={upload} />
      ) : null}
    </div>
  );
}

/** Remounted with fresh state whenever the saved setup changes (see parent key). */
function RoomSetupForm({
  initial,
  onSave,
  onUpload,
}: {
  initial: RoomSetup;
  onSave: (setup: RoomSetup) => Promise<string | null>;
  onUpload: (roomId: string, file: File) => Promise<{ url?: string; error?: string }>;
}) {
  const t = useTranslations("staffRoomSettings");
  const tRooms = useTranslations("rooms");
  const [draft, setDraft] = useState<RoomSetup>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const roomName = (id: string) => {
    const room = rooms.find((r) => r.id === id);
    return room ? tRooms(`${room.nameKey.split(".")[1]}.name`) : id;
  };

  function update(index: number, change: Partial<RoomSetupRoom>) {
    setDraft((prev) => ({
      rooms: prev.rooms.map((room, i) => (i === index ? { ...room, ...change } : room)),
    }));
    setStatus(null);
  }

  /** Keep one room number per room: extra rooms get the next free number, fewer rooms drop the last. */
  function setInventory(index: number, inventory: number) {
    const room = draft.rooms[index];
    const labels = room.unitLabels.slice(0, inventory);
    const numeric = labels.map(Number).filter(Number.isFinite);
    let n = numeric.length ? Math.max(...numeric) + 1 : labels.length + 1;
    while (labels.length < inventory) {
      const candidate = String(n++);
      if (!labels.includes(candidate)) labels.push(candidate);
    }
    update(index, { inventory, unitLabels: labels });
  }

  async function handleUpload(index: number, file: File | undefined) {
    if (!file) return;
    const room = draft.rooms[index];
    setUploading(room.roomId);
    const result = await onUpload(room.roomId, file);
    setUploading(null);
    if (result.url) update(index, { photos: [...room.photos, result.url] });
    else setStatus({ ok: false, message: result.error ?? t("uploadFailed") });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const error = await onSave(draft);
    setSaving(false);
    setStatus(error ? { ok: false, message: error } : { ok: true, message: t("saved") });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {draft.rooms.map((room, index) => (
        <section
          key={room.roomId}
          className="space-y-4 rounded-xl border border-border bg-card/50 p-5"
          aria-labelledby={`room-${room.roomId}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id={`room-${room.roomId}`} className="font-serif text-xl font-medium">
              {roomName(room.roomId)}
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                id={`online-${room.roomId}`}
                type="checkbox"
                checked={room.bookableOnline}
                onChange={(e) => update(index, { bookableOnline: e.target.checked })}
                className="h-4 w-4 accent-teal"
              />
              {t("bookableOnline")}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <label className="block">
              <span className={cellLabel}>{t("inventory")}</span>
              <input
                id={`inventory-${room.roomId}`}
                type="number"
                min={1}
                max={200}
                required
                value={room.inventory}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (Number.isInteger(next) && next >= 1 && next <= 200) setInventory(index, next);
                }}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={cellLabel}>{t("roomNumbers")}</span>
              <input
                id={`numbers-${room.roomId}`}
                type="text"
                value={room.unitLabels.join(", ")}
                onChange={(e) =>
                  update(index, {
                    unitLabels: e.target.value.split(",").map((v) => v.trim()),
                  })
                }
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-muted">
                {t("roomNumbersHint", { count: room.inventory })}
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <p className={cellLabel}>{t("photos")}</p>
            {room.photos.length === 0 ? (
              <p className="text-sm text-muted">{t("noPhotos")}</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {room.photos.map((url, photoIndex) => (
                  <li key={url} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- staff preview of arbitrary uploads */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
                    />
                    <div className="flex items-center justify-between text-xs">
                      {photoIndex === 0 ? (
                        <span className="font-medium text-teal-dark">{t("mainPhoto")}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            update(index, {
                              photos: [url, ...room.photos.filter((p) => p !== url)],
                            })
                          }
                          className="inline-flex items-center gap-1 text-muted hover:text-teal"
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden />
                          {t("makeMain")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => update(index, { photos: room.photos.filter((p) => p !== url) })}
                        aria-label={t("removePhoto")}
                        className="rounded p-1 text-muted hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal">
              <ImagePlus className="h-4 w-4" aria-hidden />
              {uploading === room.roomId ? t("uploading") : t("addPhoto")}
              <input
                id={`photo-${room.roomId}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploading !== null || room.photos.length >= 12}
                onChange={(e) => {
                  handleUpload(index, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <button
          type="submit"
          disabled={saving || uploading !== null}
          className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
        {status ? (
          <span className={status.ok ? "text-sm text-teal-dark" : "text-sm text-red-600"}>
            {status.message}
          </span>
        ) : (
          <span className="text-xs text-muted">{t("saveHint")}</span>
        )}
      </div>
    </form>
  );
}
