/** Runtime configuration — safe to import on server and client (public vars only on client) */

import { isSupabaseEnabled } from "@/lib/db/client";
import { getStorageMode } from "@/lib/demo-store";

export function getServerConfig() {
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const paystackPublic =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
    process.env.PAYSTACK_PUBLIC_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const demoMode = process.env.DEMO_MODE === "true" || !paystackSecret;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RENDER_EXTERNAL_URL
      ? process.env.RENDER_EXTERNAL_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3002");

  const notifyChannel = (process.env.NOTIFY_CHANNEL ?? "console") as
    | "sms"
    | "whatsapp"
    | "both"
    | "console"
    | "none";

  return {
    appUrl,
    demoMode,
    storage: {
      mode: getStorageMode(),
      supabaseConfigured: isSupabaseEnabled(),
    },
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
        "reservations@reliefhotelsandsuites.com.ng",
    },
    notifications: {
      channel: notifyChannel,
      termiiConfigured: Boolean(process.env.TERMII_API_KEY),
      whatsappProvider: process.env.WHATSAPP_PROVIDER ?? "termii",
      managerPhoneSet: Boolean(process.env.MANAGER_PHONE),
    },
    demoDashboardKey: process.env.DEMO_DASHBOARD_KEY ?? "relief-demo-2026",
    staffPortal: {
      host:
        process.env.STAFF_PORTAL_HOST ??
        "reservation.reliefhotelsandsuites.com.ng",
    },
    moniepoint: {
      clientId: process.env.MONIEPOINT_CLIENT_ID ?? "",
      clientSecret: process.env.MONIEPOINT_CLIENT_SECRET ?? "",
      terminalSerial: process.env.MONIEPOINT_TERMINAL_SERIAL ?? "",
      configured: Boolean(
        process.env.MONIEPOINT_CLIENT_ID &&
          process.env.MONIEPOINT_CLIENT_SECRET &&
          process.env.MONIEPOINT_TERMINAL_SERIAL,
      ),
    },
  };
}

export function getPublicPaystackKey(): string {
  return (
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
    process.env.PAYSTACK_PUBLIC_KEY ??
    ""
  );
}
