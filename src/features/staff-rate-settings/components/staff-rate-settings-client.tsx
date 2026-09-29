"use client";

import { rooms } from "@/content/site";
import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import type {
  Coupon,
  Extra,
  LongStayDiscount,
  RateConfig,
  RoomRatePolicy,
  SeasonalRate,
} from "@/lib/booking-engine/rate-config";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";
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

export function StaffRateSettingsClient() {
  const t = useTranslations("staffRateSettings");
  const searchParams = useSearchParams();
  const keyFromUrl = searchParams.get("key");
  const [key, setKey] = useState<string | null>(null);
  const [config, setConfig] = useState<RateConfig | null>(null);
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
      const res = await fetch(`/api/staff/settings/rates${keyQuery(loadKey)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await readError(res));
      setConfig(((await res.json()) as { config: RateConfig }).config);
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

  async function save(next: RateConfig): Promise<string | null> {
    const res = await fetch(`/api/staff/settings/rates${keyQuery(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) return readError(res);
    setConfig(((await res.json()) as { config: RateConfig }).config);
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <Link
        href={{ pathname: "/staff", query: key ? { key } : undefined }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors duration-200 hover:text-teal"
      >
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
      {loading && !config ? (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {t("loading")}
        </p>
      ) : null}

      {config ? (
        <RateSettingsForm key={JSON.stringify(config)} initial={config} onSave={save} />
      ) : null}
    </div>
  );
}

/** Remounted with fresh state whenever the saved config changes (see parent key). */
function RateSettingsForm({
  initial,
  onSave,
}: {
  initial: RateConfig;
  onSave: (config: RateConfig) => Promise<string | null>;
}) {
  const t = useTranslations("staffRateSettings");
  const tRooms = useTranslations("rooms");
  const [draft, setDraft] = useState<RateConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const roomName = (id: string) => {
    const room = rooms.find((r) => r.id === id);
    return room ? tRooms(`${room.nameKey.split(".")[1]}.name`) : id;
  };

  function patch(next: Partial<RateConfig>) {
    setDraft((prev) => ({ ...prev, ...next }));
    setStatus(null);
  }

  function updateAt<K extends "rooms" | "seasons" | "longStay" | "coupons" | "extras">(
    list: K,
    index: number,
    change: Partial<RateConfig[K][number]>,
  ) {
    setDraft((prev) => ({
      ...prev,
      [list]: prev[list].map((item, i) => (i === index ? { ...item, ...change } : item)),
    }));
    setStatus(null);
  }

  function removeAt(list: "seasons" | "longStay" | "coupons" | "extras", index: number) {
    setDraft((prev) => ({ ...prev, [list]: prev[list].filter((_, i) => i !== index) }));
    setStatus(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const error = await onSave(draft);
    setSaving(false);
    setStatus(error ? { ok: false, message: error } : { ok: true, message: t("saved") });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section title={t("generalTitle")} hint={t("generalHint")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumField
            label={t("depositPct")}
            value={draft.depositPct}
            min={0}
            max={100}
            onChange={(v) => patch({ depositPct: v ?? 0 })}
          />
          <NumField
            label={t("holdMinutes")}
            value={draft.holdMinutes}
            min={5}
            onChange={(v) => patch({ holdMinutes: v ?? 60 })}
          />
          <NumField
            label={t("freeCancelHours")}
            value={draft.cancellation.freeCancelHoursBefore}
            min={0}
            onChange={(v) =>
              patch({ cancellation: { ...draft.cancellation, freeCancelHoursBefore: v ?? 0 } })
            }
          />
          <NumField
            label={t("refundPct")}
            value={draft.cancellation.refundPctWithinWindow}
            min={0}
            max={100}
            onChange={(v) =>
              patch({ cancellation: { ...draft.cancellation, refundPctWithinWindow: v ?? 0 } })
            }
          />
          <CheckField
            label={t("allowGuestCancel")}
            checked={draft.cancellation.allowGuestCancel}
            onChange={(checked) =>
              patch({ cancellation: { ...draft.cancellation, allowGuestCancel: checked } })
            }
          />
        </div>
      </Section>

      <Section title={t("roomsTitle")} hint={t("roomsHint")}>
        <div className="space-y-3">
          {draft.rooms.map((policy: RoomRatePolicy, i) => (
            <div key={policy.roomId} className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-6">
              <p className="self-center text-sm font-medium sm:col-span-1">{roomName(policy.roomId)}</p>
              <NumField label={t("baseNightly")} value={policy.baseNightlyNgn} min={1} onChange={(v) => updateAt("rooms", i, { baseNightlyNgn: v ?? 1 })} />
              <NumField label={t("weekendUplift")} value={policy.weekendUpliftNgn} min={0} onChange={(v) => updateAt("rooms", i, { weekendUpliftNgn: v ?? 0 })} />
              <NumField label={t("maxGuests")} value={policy.maxGuestsPerUnit} min={1} onChange={(v) => updateAt("rooms", i, { maxGuestsPerUnit: v ?? 1 })} />
              <NumField label={t("minNights")} value={policy.minNights} min={1} onChange={(v) => updateAt("rooms", i, { minNights: v ?? 1 })} />
              <NumField label={t("maxNights")} value={policy.maxNights} min={1} onChange={(v) => updateAt("rooms", i, { maxNights: v ?? 30 })} />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t("seasonsTitle")}
        hint={t("seasonsHint")}
        onAdd={() =>
          patch({
            seasons: [
              ...draft.seasons,
              { id: `season-${Date.now()}`, label: "", from: today, to: today, adjustPct: 0 },
            ],
          })
        }
        addLabel={t("addSeason")}
      >
        {draft.seasons.length === 0 ? <Empty text={t("none")} /> : null}
        {draft.seasons.map((season: SeasonalRate, i) => (
          <Row key={season.id} onRemove={() => removeAt("seasons", i)} removeLabel={t("remove")}>
            <TextField label={t("label")} value={season.label} onChange={(v) => updateAt("seasons", i, { label: v })} />
            <DateField label={t("from")} value={season.from} onChange={(v) => updateAt("seasons", i, { from: v })} />
            <DateField label={t("toExclusive")} value={season.to} onChange={(v) => updateAt("seasons", i, { to: v })} />
            <NumField label={t("fixedNightly")} value={season.nightlyNgn} min={1} optional onChange={(v) => updateAt("seasons", i, { nightlyNgn: v })} />
            <NumField label={t("adjustPct")} value={season.adjustPct} min={-90} optional onChange={(v) => updateAt("seasons", i, { adjustPct: v })} />
            <NumField label={t("minNights")} value={season.minNights} min={1} optional onChange={(v) => updateAt("seasons", i, { minNights: v })} />
            <CheckField label={t("closedToArrival")} checked={Boolean(season.closedToArrival)} onChange={(v) => updateAt("seasons", i, { closedToArrival: v || undefined })} />
            <RoomScope label={t("appliesTo")} allLabel={t("allRooms")} roomName={roomName} value={season.roomIds} onChange={(v) => updateAt("seasons", i, { roomIds: v })} />
          </Row>
        ))}
      </Section>

      <Section
        title={t("longStayTitle")}
        hint={t("longStayHint")}
        onAdd={() => patch({ longStay: [...draft.longStay, { minNights: 7, pct: 10 }] })}
        addLabel={t("addLongStay")}
      >
        {draft.longStay.length === 0 ? <Empty text={t("none")} /> : null}
        {draft.longStay.map((tier: LongStayDiscount, i) => (
          <Row key={i} onRemove={() => removeAt("longStay", i)} removeLabel={t("remove")}>
            <NumField label={t("minNights")} value={tier.minNights} min={2} onChange={(v) => updateAt("longStay", i, { minNights: v ?? 2 })} />
            <NumField label={t("discountPct")} value={tier.pct} min={1} max={99} onChange={(v) => updateAt("longStay", i, { pct: v ?? 1 })} />
          </Row>
        ))}
      </Section>

      <Section
        title={t("couponsTitle")}
        hint={t("couponsHint")}
        onAdd={() => patch({ coupons: [...draft.coupons, { code: "", pct: 10, active: true }] })}
        addLabel={t("addCoupon")}
      >
        {draft.coupons.length === 0 ? <Empty text={t("none")} /> : null}
        {draft.coupons.map((coupon: Coupon, i) => (
          <Row key={i} onRemove={() => removeAt("coupons", i)} removeLabel={t("remove")}>
            <TextField label={t("code")} value={coupon.code} upper onChange={(v) => updateAt("coupons", i, { code: v.toUpperCase() })} />
            <NumField label={t("discountPct")} value={coupon.pct} min={0} max={100} optional onChange={(v) => updateAt("coupons", i, { pct: v })} />
            <NumField label={t("amountOff")} value={coupon.amountNgn} min={1} optional onChange={(v) => updateAt("coupons", i, { amountNgn: v })} />
            <DateField label={t("validFrom")} value={coupon.validFrom} optional onChange={(v) => updateAt("coupons", i, { validFrom: v || undefined })} />
            <DateField label={t("validTo")} value={coupon.validTo} optional onChange={(v) => updateAt("coupons", i, { validTo: v || undefined })} />
            <NumField label={t("minNights")} value={coupon.minNights} min={1} optional onChange={(v) => updateAt("coupons", i, { minNights: v })} />
            <NumField label={t("maxRedemptions")} value={coupon.maxRedemptions} min={1} optional onChange={(v) => updateAt("coupons", i, { maxRedemptions: v })} />
            <CheckField label={t("bypassMinStay")} checked={Boolean(coupon.bypassMinStay)} onChange={(v) => updateAt("coupons", i, { bypassMinStay: v || undefined })} />
            <CheckField label={t("active")} checked={coupon.active !== false} onChange={(v) => updateAt("coupons", i, { active: v })} />
            <RoomScope label={t("appliesTo")} allLabel={t("allRooms")} roomName={roomName} value={coupon.roomIds} onChange={(v) => updateAt("coupons", i, { roomIds: v })} />
          </Row>
        ))}
      </Section>

      <Section
        title={t("extrasTitle")}
        hint={t("extrasHint")}
        onAdd={() =>
          patch({
            extras: [
              ...draft.extras,
              { id: `extra-${Date.now()}`, label: "", priceNgn: 0, pricing: "per_stay", active: true },
            ],
          })
        }
        addLabel={t("addExtra")}
      >
        {draft.extras.length === 0 ? <Empty text={t("none")} /> : null}
        {draft.extras.map((extra: Extra, i) => (
          <Row key={extra.id} onRemove={() => removeAt("extras", i)} removeLabel={t("remove")}>
            <TextField label={t("label")} value={extra.label} onChange={(v) => updateAt("extras", i, { label: v })} />
            <NumField label={t("price")} value={extra.priceNgn} min={0} onChange={(v) => updateAt("extras", i, { priceNgn: v ?? 0 })} />
            <label className="block">
              <span className={cellLabel}>{t("pricing")}</span>
              <select
                value={extra.pricing}
                onChange={(e) => updateAt("extras", i, { pricing: e.target.value as Extra["pricing"] })}
                className={inputClass}
              >
                <option value="per_stay">{t("perStay")}</option>
                <option value="per_night">{t("perNight")}</option>
                <option value="per_guest_night">{t("perGuestNight")}</option>
              </select>
            </label>
            <CheckField label={t("active")} checked={extra.active !== false} onChange={(v) => updateAt("extras", i, { active: v })} />
            <RoomScope label={t("appliesTo")} allLabel={t("allRooms")} roomName={roomName} value={extra.roomIds} onChange={(v) => updateAt("extras", i, { roomIds: v })} />
          </Row>
        ))}
      </Section>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
        {status ? (
          <span className={status.ok ? "text-sm text-teal-dark" : "text-sm text-red-600"}>
            {status.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
  onAdd,
  addLabel,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-medium">{title}</h2>
          <p className="mt-1 text-sm text-muted">{hint}</p>
        </div>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {addLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Row({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="relative grid gap-3 rounded-lg border border-border/60 p-3 pr-12 sm:grid-cols-3 lg:grid-cols-5">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute right-2 top-2 rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted">{text}</p>;
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  optional = false,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className={cellLabel}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step="any"
        value={value ?? ""}
        required={!optional}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(undefined);
          const next = Number(raw);
          if (Number.isFinite(next)) onChange(next);
        }}
        className={inputClass}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  upper = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  upper?: boolean;
}) {
  return (
    <label className="block">
      <span className={cellLabel}>{label}</span>
      <input
        type="text"
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        className={upper ? `${inputClass} uppercase` : inputClass}
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className={cellLabel}>{label}</span>
      <input
        type="date"
        value={value ?? ""}
        required={!optional}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 self-end pb-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-teal"
      />
      {label}
    </label>
  );
}

/** Empty selection = every room type (stored as `roomIds: undefined`). */
function RoomScope({
  label,
  allLabel,
  roomName,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  roomName: (id: string) => string;
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
}) {
  const selected = value ?? [];
  return (
    <fieldset className="sm:col-span-3 lg:col-span-5">
      <legend className={cellLabel}>
        {label} {selected.length === 0 ? `(${allLabel})` : null}
      </legend>
      <div className="flex flex-wrap gap-3">
        {rooms.map((room) => (
          <label key={room.id} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(room.id)}
              onChange={(e) => {
                const next = e.target.checked
                  ? [...selected, room.id]
                  : selected.filter((id) => id !== room.id);
                onChange(next.length ? next : undefined);
              }}
              className="h-4 w-4 accent-teal"
            />
            {roomName(room.id)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
