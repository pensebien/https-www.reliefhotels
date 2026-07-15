import { site } from "@/content/site";
import { getStaffPortalPublicUrl } from "@/lib/staff-portal";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

export async function StaffPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("staffPortal");
  const portalUrl = getStaffPortalPublicUrl();
  const publicSiteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://reliefhotelsandsuites.com";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src={site.logoSrc}
              alt={site.name}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="font-serif text-lg font-medium leading-tight">
                {t("title")}
              </p>
              <p className="text-xs text-muted">{t("subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="hidden rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-xs text-teal-dark sm:inline">
              {portalUrl.replace("https://", "")}
            </span>
            <Link
              href={publicSiteUrl}
              className="text-teal hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("viewPublicSite")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted">
        {t("footer")}
      </footer>
    </div>
  );
}
