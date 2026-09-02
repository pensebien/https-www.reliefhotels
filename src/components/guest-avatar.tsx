import { cn } from "@/lib/utils";
import Image from "next/image";

function initialsFromName(name: string): string {
  const parts = name
    .replace(/\./g, " ")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

const AVATAR_TONES = [
  "bg-teal/20 text-teal-dark",
  "bg-gold/25 text-[#8a6d2f]",
  "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100",
] as const;

export function GuestAvatar({
  name,
  image,
  size = "md",
  className,
  toneIndex = 0,
}: {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  toneIndex?: number;
}) {
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  const initials = initialsFromName(name);
  const tone = AVATAR_TONES[toneIndex % AVATAR_TONES.length];

  if (image) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-background",
          sizeClass,
          className,
        )}
      >
        <Image
          src={image}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
        />
        <span className="sr-only">{name}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-background",
        sizeClass,
        tone,
        className,
      )}
      aria-hidden
    >
      {initials}
      <span className="sr-only">{name}</span>
    </span>
  );
}
