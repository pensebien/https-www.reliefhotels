import { GuestInvoiceClient } from "@/features/staff-invoices/components/guest-invoice-client";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Your invoice", robots: { index: false, follow: false } };

export default async function GuestInvoicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="px-4 py-12 print:p-0">
      <Suspense fallback={<p className="text-center text-muted">Loading invoice…</p>}>
        <GuestInvoiceClient />
      </Suspense>
    </div>
  );
}
