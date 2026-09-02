"use client";

import { ConciergeContactPrompt } from "@/components/concierge-contact-prompt";
import { Link } from "@/i18n/navigation";
import { formatNaira } from "@/lib/utils";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20; // ~60s before we stop auto-polling and let the guest check manually

type CallbackState = "loading" | "polling" | "stuck" | "success" | "failed";

export function PaymentCallback() {
  const t = useTranslations("payment");
  const tBooking = useTranslations("booking");
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const demo = searchParams.get("demo") === "1";

  const [state, setState] = useState<CallbackState>("loading");
  const [amountKobo, setAmountKobo] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [managerNotified, setManagerNotified] = useState(false);
  const attemptsRef = useRef(0);

  const verify = useCallback(async () => {
    if (!reference) {
      setState("failed");
      return;
    }

    const url = `/api/paystack/verify?reference=${encodeURIComponent(reference)}${demo ? "&demo=1" : ""}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "success") {
        setState("success");
        setAmountKobo(data.amountKobo ?? 0);
        setEmail(data.email ?? null);
        setManagerNotified(data.notified === true);
        return;
      }

      if (data.status === "pending") {
        attemptsRef.current += 1;
        setState(attemptsRef.current >= MAX_POLL_ATTEMPTS ? "stuck" : "polling");
        return;
      }

      setState("failed");
    } catch {
      setState("failed");
    }
  }, [reference, demo]);

  useEffect(() => {
    void verify();
  }, [verify]);

  useEffect(() => {
    if (state !== "loading" && state !== "polling") return;
    const id = window.setTimeout(verify, POLL_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [state, verify]);

  function checkAgain() {
    attemptsRef.current = 0;
    setState("loading");
    void verify();
  }

  if (!reference) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-500" aria-hidden />
        <p className="mt-4 text-lg">{t("missingReference")}</p>
      </div>
    );
  }

  if (state === "loading" || state === "polling") {
    return (
      <div className="flex flex-col items-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-teal" aria-hidden />
        <p className="mt-4 text-lg">{t("verifying")}</p>
        <p className="mt-1 text-sm text-muted" aria-live="polite">
          {t("verifyingHint")}
        </p>
      </div>
    );
  }

  if (state === "stuck") {
    return (
      <div className="w-full max-w-md text-center">
        <Loader2 className="mx-auto h-12 w-12 text-teal" aria-hidden />
        <h1 className="mt-6 font-serif text-2xl font-medium">{t("stuckTitle")}</h1>
        <p className="mt-2 text-muted">{t("stuckDescription")}</p>
        <p className="mt-3 text-sm text-muted">
          {t("reference")}: <code className="rounded bg-border px-2 py-0.5">{reference}</code>
        </p>
        <button
          type="button"
          onClick={checkAgain}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t("checkAgain")}
        </button>
        <ConciergeContactPrompt />
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-16 w-16 text-teal" aria-hidden />
          <h1 className="mt-6 font-serif text-3xl font-medium">{t("successTitle")}</h1>
          <p className="mt-2 max-w-md text-muted">{t("successDescription")}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-teal/30 bg-teal/5 p-6 text-center">
          {amountKobo > 0 && (
            <p className="text-2xl font-semibold tracking-tight">
              {formatNaira(amountKobo / 100)}
            </p>
          )}
          <p className="mt-1 text-sm text-muted">
            {t("reference")}:{" "}
            <code className="rounded bg-background px-2 py-0.5 font-mono text-xs">
              {reference}
            </code>
          </p>

          <div className="mt-4 space-y-1.5 border-t border-teal/20 pt-4 text-sm text-muted">
            {email && <p>{t("receiptEmailSent", { email })}</p>}
            <p>{tBooking("managerNotifyAfterPayment")}</p>
            {managerNotified && (
              <p className="text-teal-dark dark:text-teal">{tBooking("managerNotified")}</p>
            )}
          </div>
        </div>

        {demo && (
          <p className="mt-4 rounded-lg bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-900 dark:text-amber-100">
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
    <div className="w-full max-w-md text-center">
      <XCircle className="mx-auto h-16 w-16 text-red-500" aria-hidden />
      <h1 className="mt-6 font-serif text-3xl font-medium">{t("failedTitle")}</h1>
      <p className="mt-2 text-muted">{t("failedDescription")}</p>
      <Link
        href="/book"
        className="mt-8 inline-block rounded-full bg-teal px-6 py-3 text-sm font-medium text-gray-950"
      >
        {t("tryAgain")}
      </Link>
      <ConciergeContactPrompt />
    </div>
  );
}
