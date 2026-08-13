"use client";

import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { useTaxSettings } from "@/features/staff-tax-settings/hooks/use-tax-settings";
import type { TaxCollectionMode, TaxSettings } from "@/features/staff-tax-settings/types";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";

export function StaffTaxSettingsClient() {
  const t = useTranslations("staffTaxSettings");
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

  const { settings, loading, saving, error, loadedOnce, save } = useTaxSettings(key);
  const hasData = loadedOnce && !error;

  function handleKeySubmit(nextKey: string) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, nextKey);
    }
    setKey(nextKey);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:px-8">
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
      {loading && !loadedOnce ? (
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {t("loading")}
        </p>
      ) : null}

      {hasData && settings ? (
        <TaxSettingsForm
          key={settings.updatedAt}
          settings={settings}
          saving={saving}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

/**
 * Mounted only once `settings` is loaded, and remounted (via the parent's
 * `key={settings.updatedAt}`) whenever it changes — so form state
 * initializes directly from props, with no effect needed to mirror it.
 */
function TaxSettingsForm({
  settings,
  saving,
  onSave,
}: {
  settings: TaxSettings;
  saving: boolean;
  onSave: (patch: {
    vatPercentage?: number;
    collectionMode?: TaxCollectionMode;
  }) => Promise<boolean>;
}) {
  const t = useTranslations("staffTaxSettings");
  const [vatInput, setVatInput] = useState(String(settings.vatPercentage));
  const [mode, setMode] = useState<TaxCollectionMode>(settings.collectionMode);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const vatPercentage = Number(vatInput);
    if (!Number.isFinite(vatPercentage) || vatPercentage < 0 || vatPercentage > 100) {
      return;
    }
    const ok = await onSave({ vatPercentage, collectionMode: mode });
    if (ok) setSaved(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-border bg-card/50 p-5"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t("vatLabel")}</span>
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={vatInput}
          onChange={(e) => {
            setVatInput(e.target.value);
            setSaved(false);
          }}
          className="h-10 w-32 rounded-lg border border-border bg-background px-3 text-sm"
        />
        <span className="ml-2 text-sm text-muted">%</span>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("modeLabel")}</legend>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="collectionMode"
              checked={mode === "pass_through"}
              onChange={() => {
                setMode("pass_through");
                setSaved(false);
              }}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{t("passThroughLabel")}</span>
              <span className="block text-muted">{t("passThroughHint")}</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="collectionMode"
              checked={mode === "absorbed"}
              onChange={() => {
                setMode("absorbed");
                setSaved(false);
              }}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{t("absorbedLabel")}</span>
              <span className="block text-muted">{t("absorbedHint")}</span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950 disabled:opacity-60"
        >
          {saving ? t("saving") : t("save")}
        </button>
        {saved ? <span className="text-sm text-teal-dark">{t("saved")}</span> : null}
      </div>
      <p className="text-xs text-muted">{t("roleHint")}</p>
    </form>
  );
}
