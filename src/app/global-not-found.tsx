import { ThemeScript } from "@/components/theme-script";
import { site } from "@/content/site";
import type { Metadata } from "next";
import { DM_Sans, EB_Garamond } from "next/font/google";
import Link from "next/link";
import "./globals.css";

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

export const metadata: Metadata = {
  title: `Page not found — ${site.name}`,
  description: "The page you're looking for doesn't exist or may have moved.",
};

/**
 * Handles URLs that don't match any route at all. The root layout keys its
 * <html>/<body> off the [locale] segment, so an unmatched URL has no layout
 * to render inside — this file renders a full document of its own instead.
 */
export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      className={`${ebGaramond.variable} ${dmSans.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <ThemeScript />
        <p className="text-sm uppercase tracking-[0.22em] text-teal">
          {site.shortName}
        </p>
        <h1 className="mt-4 font-serif text-6xl font-medium sm:text-7xl">404</h1>
        <p className="mt-4 max-w-sm text-lg text-muted">
          We couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link href="/" className="btn-primary mt-8 px-8">
          Return home
        </Link>
      </body>
    </html>
  );
}
