/** Runtime configuration — safe to import on server and client (public vars only on client) */

import { isSupabaseEnabled } from "@/lib/db/client";
import { getStorageMode } from "@/lib/demo-store";
import {
  isPaystackPublicKey,
  isPaystackSecretKey,
  paystackKeyMode,
  type PaystackKeyMode,
} from "@/lib/paystack-auth";

export function getServerConfig() {
  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY ?? "").trim();
  const paystackPublic = (
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
    process.env.PAYSTACK_PUBLIC_KEY ??
    ""
  ).trim();
  const resendKey = process.env.RESEND_API_KEY;
  const paystackConfigured =
    isPaystackSecretKey(paystackSecret) && isPaystackPublicKey(paystackPublic);
  /** Simulated payments — never allow silent demo when keys are valid unless DEMO_MODE=true. */
  const demoMode =
    process.env.DEMO_MODE === "true" || !paystackConfigured;
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.URL ?? // Netlify site URL
    process.env.DEPLOY_PRIME_URL ?? // Netlify deploy URL
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3002")
  ).replace(/\/$/, "");

  const notifyChannel = (process.env.NOTIFY_CHANNEL ?? "console") as
    | "sms"
    | "whatsapp"
    | "both"
    | "console"
    | "none";

  const keyMode: PaystackKeyMode = paystackConfigured
    ? paystackKeyMode(paystackSecret)
    : "unknown";

  return {
    appUrl,
    demoMode,
    storage: {
      mode: getStorageMode(),
      supabaseConfigured: isSupabaseEnabled(),
    },
    paystack: {
      configured: paystackConfigured,
      publicKey: paystackPublic,
      secretKey: paystackSecret,
      mode: keyMode,
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
        "reservation.reliefhotelsandsuites.com",
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
    rayza: {
      enabled:
        process.env.RAYZA_CONNECT_ENABLED === "true" &&
        Boolean(process.env.RAYZA_API_KEY?.trim()),
      baseUrl:
        process.env.RAYZA_BASE_URL ?? "https://cloud-relay-nu.vercel.app",
    },
    staffAuth: {
      enabled:
        process.env.STAFF_AUTH_ENABLED === "true" &&
        Boolean(process.env.STAFF_SESSION_SECRET?.trim()),
    },
  };
}

export function getPublicPaystackKey(): string {
  return (
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ??
    process.env.PAYSTACK_PUBLIC_KEY ??
    ""
  ).trim();
}
