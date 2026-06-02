import { Link } from "@/i18n/navigation";
import { getServerConfig } from "@/lib/config";

export function DemoBanner() {
  const config = getServerConfig();

  if (!config.demoMode && config.paystack.configured) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100">
      <span className="font-medium">Demo mode</span>
      {" — "}
      {config.paystack.configured
        ? "Paystack test keys active."
        : "Payments simulate without Paystack keys."}{" "}
      <Link href="/demo" className="underline hover:no-underline">
        Open demo dashboard →
      </Link>
    </div>
  );
}
