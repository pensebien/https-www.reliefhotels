"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  DEFAULT_STAFF_ROLE,
  NAV_ITEMS,
  STAFF_ROLES,
  getAccessLevel,
  getAccessibleNavItems,
  parseStaffRole,
  type StaffRole,
} from "@/lib/staff-roles";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

function findActiveHref(pathname: string): string | undefined {
  return [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;
}

type SessionState =
  | { status: "checking" }
  | { status: "disabled" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; name: string; role: StaffRole };

export function StaffShell({ children }: { children: ReactNode }) {
  const t = useTranslations("staffShell");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/staff/auth/me")
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          enabled?: boolean;
          authenticated?: boolean;
          name?: string;
          role?: StaffRole;
        } | null;
        if (cancelled || !body) return;

        if (!body.enabled) {
          setSession({ status: "disabled" });
        } else if (body.authenticated && body.name && body.role) {
          setSession({ status: "authenticated", name: body.name, role: body.role });
        } else {
          setSession({ status: "unauthenticated" });
        }
      })
      .catch(() => {
        if (!cancelled) setSession({ status: "disabled" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (session.status === "unauthenticated" && pathname !== "/staff/login") {
      router.push("/staff/login");
    }
  }, [session.status, pathname, router]);

  if (pathname === "/staff/login") {
    return <>{children}</>;
  }

  if (session.status === "checking" || session.status === "unauthenticated") {
    return null;
  }

  const legacyMode = session.status === "disabled";
  const key = legacyMode ? searchParams.get("key") : null;
  const role =
    session.status === "authenticated" ? session.role : parseStaffRole(searchParams.get("role"));
  const activeHref = findActiveHref(pathname);
  const visibleItems = getAccessibleNavItems(role);

  function buildQuery(nextRole: StaffRole = role) {
    const query: Record<string, string> = {};
    if (key) query.key = key;
    if (legacyMode && nextRole !== DEFAULT_STAFF_ROLE) query.role = nextRole;
    return query;
  }

  function handleRoleChange(nextRole: StaffRole) {
    router.push({ pathname, query: buildQuery(nextRole) });
  }

  async function handleLogout() {
    await fetch("/api/staff/auth/logout", { method: "POST" });
    router.push("/staff/login");
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <nav aria-label={t("navLabel")} className="flex flex-wrap items-center gap-1">
            {visibleItems.map((item) => {
              const isActive = item.href === activeHref;
              const level = getAccessLevel(role, item.href);
              return (
                <Link
                  key={item.href}
                  href={{ pathname: item.href, query: buildQuery() }}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-teal text-gray-950"
                      : "text-muted hover:bg-card hover:text-foreground"
                  }`}
                >
                  {t(`nav.${item.labelKey}`)}
                  {level === "read" ? (
                    <span className="text-xs opacity-70">({t("readOnly")})</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {legacyMode ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              {t("roleLabel")}
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted">
              <span>
                {t("loggedInAs", {
                  name: session.status === "authenticated" ? session.name : "",
                  role: t(`roles.${role}`),
                })}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-teal"
              >
                {t("logout")}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
