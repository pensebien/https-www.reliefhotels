/** Runtime configuration — safe to import on server and client (public vars only on client) */

export function getServerConfig() {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const paystackPublic =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
    process.env.PAYSTACK_PUBLIC_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const demoMode = process.env.DEMO_MODE === "true" || !paystackSecret;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return {
    appUrl,
    demoMode,
    paystack: {
      configured: Boolean(paystackSecret && paystackPublic),
      publicKey: paystackPublic ?? "",
      secretKey: paystackSecret ?? "",
    },
    email: {
      configured: Boolean(resendKey),
      from:
        process.env.EMAIL_FROM ??
        "Relief Hotels <onboarding@resend.dev>",
      to:
        process.env.RESERVATION_EMAIL ??
        "reservations@reliefhotelsandsuites.com",
    },
    demoDashboardKey: process.env.DEMO_DASHBOARD_KEY ?? "relief-demo-2026",
  };
}

export function getPublicPaystackKey(): string {
  return (
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
    process.env.PAYSTACK_PUBLIC_KEY ??
    ""
  );
}
