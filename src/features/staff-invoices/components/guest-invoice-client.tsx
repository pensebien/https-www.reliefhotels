"use client";

import { InvoiceView, type InvoiceViewData } from "@/components/invoice-view";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function GuestInvoiceClient() {
  const t = useTranslations("invoiceView");
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const token = params.get("t") ?? "";
  const [invoice, setInvoice] = useState<InvoiceViewData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id || !token) return;
    const qs = new URLSearchParams({ id, t: token });
    fetch(`/api/booking/invoice?${qs}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setInvoice(body.invoice);
      })
      .catch(() => setFailed(true));
  }, [id, token]);

  if (!id || !token || failed) return <p className="text-center text-sm text-red-600">{t("notFound")}</p>;
  if (!invoice) return <p className="text-center text-muted">{t("loading")}</p>;
  return <InvoiceView invoice={invoice} />;
}
