"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Checkin = {
  submittedAt: string;
  arrivalTime: string;
  nationality: string;
  address: string;
  purposeOfStay: string;
  idType: string;
  idNumber?: string;
  hasPhoto: boolean;
  purgedAt?: string;
};

/** Staff view of a guest's online check-in; the ID photo opens through an authenticated route. */
export function CheckinPanel({ reservationId, dashboardKey }: { reservationId: string; dashboardKey: string }) {
  const t = useTranslations("demo.checkin");
  const [checkin, setCheckin] = useState<Checkin | null | undefined>(undefined);
  const base = `/api/staff/reservations/${encodeURIComponent(reservationId)}/checkin`;
  const q = `?key=${encodeURIComponent(dashboardKey)}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`${base}${q}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!cancelled) setCheckin(body?.checkin ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [base, q]);

  if (checkin === undefined) return null;

  return (
    <div className="space-y-1 rounded-xl border border-border bg-background/60 p-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{t("title")}</p>
      {!checkin ? (
        <p className="text-muted">{t("notYet")}</p>
      ) : (
        <>
          <p className="font-medium text-teal-dark">{t("done", { time: checkin.arrivalTime })}</p>
          <p>{checkin.nationality} · {t(`purpose.${checkin.purposeOfStay}`)}</p>
          <p className="text-muted">{checkin.address}</p>
          <p>
            {t(`idType.${checkin.idType}`)}
            {checkin.idNumber ? ` · ${checkin.idNumber}` : ""}
          </p>
          {checkin.purgedAt ? (
            <p className="text-xs text-muted">{t("purged")}</p>
          ) : checkin.hasPhoto ? (
            <a
              href={`${base}/photo${q}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-dark underline-offset-2 hover:underline"
            >
              {t("viewPhoto")}
            </a>
          ) : null}
        </>
      )}
    </div>
  );
}
