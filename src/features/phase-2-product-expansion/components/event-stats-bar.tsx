import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="min-w-[7rem] text-center sm:text-left">
      <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted sm:text-sm">{label}</p>
    </div>
  );
}

export async function EventStatsBar() {
  const t = await getTranslations("phase2.events.stats");

  return (
    <section className="border-b border-border bg-background py-8 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-16">
        <div className="flex flex-1 flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:justify-start sm:gap-x-14 lg:gap-x-20">
          <Stat value="100" label={t("meetingSeating")} />
          <Stat value="2" label={t("spaces")} />
          <Stat
            value={
              <>
                2,700{" "}
                <span className="text-xl font-semibold sm:text-2xl">sq. m.</span>
              </>
            }
            label={t("totalSpace")}
          />
        </div>
        <div className="flex shrink-0 justify-center sm:justify-end">
          <a href="#event-inquiry" className="btn-primary px-8">
            {t("bookHall")}
          </a>
        </div>
      </div>
    </section>
  );
}
