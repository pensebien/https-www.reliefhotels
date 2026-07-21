"use client";

import { Link } from "@/i18n/navigation";
import { formatNaira } from "@/lib/utils";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PaymentCallback() {
  const t = useTranslations("payment");
  const tBooking = useTranslations("booking");
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const demo = searchParams.get("demo") === "1";

  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [amountKobo, setAmountKobo] = useState(0);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [managerNotified, setManagerNotified] = useState(false);

  useEffect(() => {
    if (!reference) {
      setState("failed");
      return;
    }

    const url = `/api/paystack/verify?reference=${encodeURIComponent(reference)}${demo ? "&demo=1" : ""}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setState("success");
          setAmountKobo(data.amountKobo ?? 0);
          if (data.reservationId) {
            setReservationId(data.reservationId);
          }
          if (data.notified === true) {
            setManagerNotified(true);
          }
        } else if (data.status === "pending") {
          // In-progress Paystack charge — keep verifying UI rather than fail early
          setState("loading");
        } else {
          setState("failed");
        }
      })
      .catch(() => setState("failed"));
  }, [reference, demo]);

  if (!reference) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <p className="mt-4 text-lg">{t("missingReference")}</p>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal" />
        <p className="mt-4 text-lg">{t("verifying")}</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="h-16 w-16 text-teal" />
        <h1 className="mt-6 font-serif text-3xl font-medium">{t("successTitle")}</h1>
        <p className="mt-2 max-w-md text-muted">{t("successDescription")}</p>
        <p className="mt-3 max-w-md text-sm text-muted">
          {tBooking("managerNotifyAfterPayment")}
        </p>
        {managerNotified && (
          <p className="mt-3 text-sm text-teal/90">{tBooking("managerNotified")}</p>
        )}
        {amountKobo > 0 && (
          <p className="mt-4 text-xl font-semibold">
            {formatNaira(amountKobo / 100)}
          </p>
        )}
        <p className="mt-2 text-sm text-muted">
          {t("reference")}: <code className="rounded bg-border px-2 py-0.5">{reference}</code>
        </p>
        {reservationId && (
          <p className="mt-2 text-sm text-muted">
            {t("reservationId")}:{" "}
            <code className="rounded bg-border px-2 py-0.5">{reservationId}</code>
          </p>
        )}
        {demo && (
          <p className="mt-4 rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-100">
            {t("demoNote")}
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950"
          >
            {t("backHome")}
          </Link>
          <Link
            href="/demo"
            className="rounded-full border border-border px-6 py-3 text-sm font-medium"
          >
            {t("viewDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <XCircle className="h-16 w-16 text-red-500" />
      <h1 className="mt-6 font-serif text-3xl font-medium">{t("failedTitle")}</h1>
      <p className="mt-2 text-muted">{t("failedDescription")}</p>
      <Link href="/book" className="mt-8 rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950">
        {t("tryAgain")}
      </Link>
    </div>
  );
}
