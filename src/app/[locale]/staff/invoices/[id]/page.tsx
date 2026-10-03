import { StaffInvoiceClient } from "@/features/staff-invoices/components/staff-invoice-client";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

export default async function StaffInvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <div className="px-4 py-10 print:p-0">
      <Suspense fallback={<p className="text-center text-muted">Loading invoice…</p>}>
        <StaffInvoiceClient invoiceId={id} />
      </Suspense>
    </div>
  );
}
