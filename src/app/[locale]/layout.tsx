import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StaffPortalShell } from "@/components/staff-portal-shell";
import { StructuredDataScript } from "@/components/structured-data-script";
import { ThemeScript } from "@/components/theme-script";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { site, structuredData } from "@/content/site";
import { routing } from "@/i18n/routing";
import { STAFF_PORTAL_HEADER } from "@/lib/staff-portal";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { DM_Sans, EB_Garamond } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import "../globals.css";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    applicationName: site.name,
    keywords: [
      site.name,
      "luxury hotel Calabar",
      "hotel suites Nigeria",
      "concierge hotel Calabar",
      "spa hotel Calabar",
      "Cross River tourism",
    ],
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "en" ? "en_NG" : locale,
      type: "website",
      siteName: site.name,
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    icons: {
      icon: [
        { url: site.faviconSrc, sizes: "48x48", type: "image/x-icon" },
        { url: site.iconSrc, sizes: "32x32", type: "image/png" },
        { url: site.logoSrc, sizes: "336x336", type: "image/png" },
      ],
      shortcut: site.faviconSrc,
      apple: [{ url: site.appleIconSrc, sizes: "180x180", type: "image/png" }],
    },
    manifest: "/site.webmanifest",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const headersList = await headers();
  const isStaffPortal = headersList.get(STAFF_PORTAL_HEADER) === "1";

  return (
    <html
      lang={locale === "pcm" ? "en-NG" : locale}
      className={`${ebGaramond.variable} ${dmSans.variable} scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <ThemeScript />
        {!isStaffPortal && <StructuredDataScript data={structuredData} />}
        <NextIntlClientProvider messages={messages}>
          {isStaffPortal ? (
            <StaffPortalShell>{children}</StaffPortalShell>
          ) : (
            <>
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <WhatsAppFloat />
            </>
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
