"use client";

import { formatNaira } from "@/lib/utils";
import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

type PaystackCheckoutProps = {
  email: string;
  itemType: "room" | "tour";
  itemId: string;
  /** Required — create reservation via POST /api/reservations first (Part 1). */
  reservationId: string;
  nights?: number;
  guests?: number;
  label: string;
  /** Use ₦5,000 for quick Paystack test payments in client demos */
  useDemoTestAmount?: boolean;
  className?: string;
};

export function PaystackCheckout({
  email,
  itemType,
  itemId,
  reservationId,
  nights = 1,
  guests = 1,
  label,
  useDemoTestAmount = false,
  className,
}: PaystackCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!email || !email.includes("@")) {
      setError("Enter a valid email above to continue.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          itemType,
          itemId,
          reservationId,
          nights,
          guests,
          ...(useDemoTestAmount ? { demoAmountNgn: 5000 } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");

      window.location.href = data.authorizationUrl as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-6 py-3.5 text-sm font-medium text-gray-950 transition-colors hover:bg-teal-dark disabled:opacity-60 sm:w-auto"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {loading ? "Redirecting to Paystack…" : label}
      </button>
      {useDemoTestAmount && (
        <p className="mt-2 text-xs text-muted">
          Demo test charge: {formatNaira(5000)} — use Paystack test card{" "}
          <code className="rounded bg-border px-1">4084084084084081</code>
        </p>
      )}
    </div>
  );
}
