import { PaymentCallback } from "@/components/payment-callback";
import { routing } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

export default async function PaymentCallbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-24">
      <Suspense
        fallback={
          <p className="text-muted">Verifying payment…</p>
        }
      >
        <PaymentCallback />
      </Suspense>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
