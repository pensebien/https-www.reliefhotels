"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const STORAGE_KEY = "relief-cookie-consent";
type Ids = { gaMeasurementId: string | null; metaPixelId: string | null };

function readChoice(): "granted" | "denied" | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function addScript(id: string, attrs: { src?: string; text?: string }) {
  if (document.getElementById(id)) return;
  const el = document.createElement("script");
  el.id = id;
  if (attrs.src) {
    el.src = attrs.src;
    el.async = true;
  }
  if (attrs.text) el.text = attrs.text;
  document.head.appendChild(el);
}

/** Loads Google Analytics / Meta Pixel only after the guest accepts (NDPA consent). */
function loadTrackers({ gaMeasurementId, metaPixelId }: Ids) {
  if (gaMeasurementId) {
    addScript("ga-src", { src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}` });
    addScript("ga-init", {
      text: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaMeasurementId)});`,
    });
  }
  if (metaPixelId) {
    addScript("meta-pixel", {
      text: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(metaPixelId)});fbq('track','PageView');`,
    });
  }
}

export function AnalyticsConsent() {
  const t = useTranslations("consent");
  const [ids, setIds] = useState<Ids | null>(null);
  const [choice, setChoice] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    const saved = readChoice();
    setChoice(saved);
    if (saved === "denied") return;
    fetch("/api/site/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: Ids | null) => {
        if (!body || (!body.gaMeasurementId && !body.metaPixelId)) return;
        setIds(body);
        if (saved === "granted") loadTrackers(body);
      })
      .catch(() => undefined);
  }, []);

  if (!ids || choice) return null;

  const decide = (value: "granted" | "denied") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
    setChoice(value);
    if (value === "granted") loadTrackers(ids);
  };

  return (
    <div
      role="dialog"
      aria-label={t("label")}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-lg sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-muted">
        {t("message")}{" "}
        <Link href="/privacy" className="text-teal-dark underline">
          {t("privacy")}
        </Link>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => decide("denied")} className="rounded-lg border border-border px-4 py-2 hover:border-teal">
          {t("decline")}
        </button>
        <button type="button" onClick={() => decide("granted")} className="rounded-lg bg-teal px-4 py-2 font-medium text-gray-950">
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
