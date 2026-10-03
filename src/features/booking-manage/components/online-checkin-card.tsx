"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export type CheckinInfo = {
  state: "disabled" | "not_open" | "open" | "done" | "closed";
  opensOn?: string;
  requireIdPhoto: boolean;
  instructions?: string;
  roomNumbers?: string[];
};

const field = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20";
const label = "mb-1 block text-xs font-medium uppercase tracking-wider text-muted";

/** Guest self check-in on the manage-booking page. */
export function OnlineCheckinCard({
  id,
  token,
  info,
  onDone,
}: {
  id: string;
  token: string;
  info: CheckinInfo;
  onDone: () => void;
}) {
  const t = useTranslations("manageBooking.checkin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (info.state === "disabled" || info.state === "closed") return null;

  if (info.state === "not_open") {
    return (
      <div className="rounded-2xl border border-border p-6">
        <p className="font-medium">{t("title")}</p>
        <p className="mt-1 text-sm text-muted">{t("opensOn", { date: info.opensOn ?? "" })}</p>
      </div>
    );
  }

  if (info.state === "done") {
    return (
      <div className="rounded-2xl border-2 border-teal/30 bg-teal/5 p-6">
        <p className="font-medium">{t("doneTitle")}</p>
        {info.instructions ? <p className="mt-1 whitespace-pre-line text-sm">{info.instructions}</p> : null}
        {info.roomNumbers?.length ? (
          <p className="mt-2 text-sm font-medium">{t("rooms", { rooms: info.roomNumbers.join(", ") })}</p>
        ) : null}
      </div>
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("id", id);
    form.set("t", token);
    const res = await fetch("/api/booking/manage/checkin", { method: "POST", body: form });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? t("error"));
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border p-6">
      <div>
        <p className="font-medium">{t("title")}</p>
        <p className="mt-1 text-sm text-muted">{t("intro")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={label}>{t("arrivalTime")}</span>
          <input id="ci-arrival" name="arrivalTime" type="time" required defaultValue="14:00" className={field} />
        </label>
        <label className="block">
          <span className={label}>{t("nationality")}</span>
          <input id="ci-nationality" name="nationality" required defaultValue="Nigerian" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>{t("address")}</span>
          <input id="ci-address" name="address" required autoComplete="street-address" className={field} />
        </label>
        <label className="block">
          <span className={label}>{t("purpose")}</span>
          <select id="ci-purpose" name="purposeOfStay" className={field} defaultValue="leisure">
            <option value="leisure">{t("purposes.leisure")}</option>
            <option value="business">{t("purposes.business")}</option>
            <option value="conference">{t("purposes.conference")}</option>
            <option value="other">{t("purposes.other")}</option>
          </select>
        </label>
        <label className="block">
          <span className={label}>{t("idType")}</span>
          <select id="ci-idtype" name="idType" className={field} defaultValue="national_id">
            <option value="national_id">{t("idTypes.national_id")}</option>
            <option value="passport">{t("idTypes.passport")}</option>
            <option value="drivers_licence">{t("idTypes.drivers_licence")}</option>
            <option value="voters_card">{t("idTypes.voters_card")}</option>
          </select>
        </label>
        <label className="block">
          <span className={label}>{t("idNumber")}</span>
          <input id="ci-idnumber" name="idNumber" required autoComplete="off" className={field} />
        </label>
        <label className="block">
          <span className={label}>{info.requireIdPhoto ? t("idPhotoRequired") : t("idPhoto")}</span>
          <input
            id="ci-idphoto"
            name="idPhoto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={info.requireIdPhoto}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2"
          />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input id="ci-consent" name="consent" value="yes" type="checkbox" required className="mt-1 h-4 w-4 accent-teal" />
        <span>{t("consent")}</span>
      </label>
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950 hover:bg-teal-dark disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {t("submit")}
      </button>
    </form>
  );
}
