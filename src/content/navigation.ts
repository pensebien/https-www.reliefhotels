import type { RoomCategory } from "@/content/site";

/** Primary header / footer links — keep in sync across SiteHeader and SiteFooter. */
export const mainNavLinks = [
  { href: "/#home" as const, key: "home" },
  { href: "/rooms" as const, key: "rooms" },
  { href: "/dine-wine" as const, key: "dining" },
  { href: "/events" as const, key: "eventsMeetings" },
  { href: "/gallery" as const, key: "gallery" },
] as const;

export const experienceNavLinks = [
  { href: "/experiences" as const, key: "experiences" },
  { href: "/tours" as const, key: "tours" },
] as const;

export const roomCategoryLinks: { href: `/rooms?category=${RoomCategory}`; category: RoomCategory }[] =
  [
    { href: "/rooms?category=guestRoom", category: "guestRoom" },
    { href: "/rooms?category=executive", category: "executive" },
    { href: "/rooms?category=suites", category: "suites" },
    { href: "/rooms?category=penthouse", category: "penthouse" },
  ];
