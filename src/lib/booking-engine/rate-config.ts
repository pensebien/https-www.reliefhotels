/**
 * Booking-engine rate rules (Sirvoy-style: base rates, seasonal/weekend
 * overrides, stay restrictions, longer-stay discounts, coupons, extras,
 * deposit, payment hold and cancellation policy).
 *
 * Owner-editable from /staff/settings/rates, stored as one validated JSON
 * document — the `booking_engine_settings` singleton row in Supabase, or
 * data/rate-config.json in file mode (same pattern as tax-settings.ts).
 *
 * Defaults are deliberately neutral — no seasons, no weekend uplift, no
 * coupons or extras — so prices match `rooms[].priceFrom` exactly until the
 * owner adds rules.
 */

import { dataPath } from "@/lib/data-dir";
import { rooms } from "@/content/site";
import { getSupabaseAdmin, isSupabaseEnabled } from "@/lib/db/client";
import { readJsonFile, writeJsonFile } from "@/lib/json-file-store";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ngn = z.number().int().min(0).max(100_000_000);

export const roomRatePolicySchema = z.object({
  roomId: z.string().min(1),
  baseNightlyNgn: ngn.min(1),
  /** Added to the base on Friday and Saturday nights. */
  weekendUpliftNgn: ngn,
  maxGuestsPerUnit: z.number().int().min(1).max(20),
  minNights: z.number().int().min(1).max(365),
  maxNights: z.number().int().min(1).max(365),
});

/** Inclusive `from`, exclusive `to` — a night is priced by its start date. */
export const seasonalRateSchema = z
  .object({
    id: z.string().min(1).max(60),
    label: z.string().min(1).max(100),
    from: dateSchema,
    to: dateSchema,
    /** Omit to apply to every room type. */
    roomIds: z.array(z.string()).optional(),
    nightlyNgn: ngn.min(1).optional(),
    adjustPct: z.number().min(-90).max(500).optional(),
    minNights: z.number().int().min(1).max(365).optional(),
    /** Closed to arrival on these dates (e.g. fully sold event nights). */
    closedToArrival: z.boolean().optional(),
  })
  .refine((s) => s.to > s.from, { message: "Season end must be after start" });

export const longStayDiscountSchema = z.object({
  minNights: z.number().int().min(2).max(365),
  pct: z.number().gt(0).lt(100),
});

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/)
      .transform((c) => c.toUpperCase()),
    pct: z.number().min(0).max(100).optional(),
    amountNgn: ngn.min(1).optional(),
    validFrom: dateSchema.optional(),
    validTo: dateSchema.optional(),
    roomIds: z.array(z.string()).optional(),
    minNights: z.number().int().min(1).optional(),
    /** Lets the holder book below min-stay (Sirvoy "use coupons to skip restrictions"). */
    bypassMinStay: z.boolean().optional(),
    /** Counted from non-cancelled reservations carrying the code. */
    maxRedemptions: z.number().int().min(1).optional(),
    active: z.boolean().default(true),
  })
  .refine((c) => c.pct !== undefined || c.amountNgn !== undefined || c.bypassMinStay, {
    message: "A coupon needs a % off, an amount off, or to skip min stay",
  });

export const extraSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(100),
  priceNgn: ngn,
  pricing: z.enum(["per_stay", "per_night", "per_guest_night"]),
  roomIds: z.array(z.string()).optional(),
  active: z.boolean().default(true),
});

export const cancellationPolicySchema = z.object({
  /** Guests may cancel online from the manage-booking link. */
  allowGuestCancel: z.boolean(),
  /** Free cancellation until this many hours before check-in (hotel day starts 14:00). */
  freeCancelHoursBefore: z.number().int().min(0).max(24 * 60),
  /** % of paid deposit refunded when cancelling inside the free window; outside it, 0. */
  refundPctWithinWindow: z.number().min(0).max(100),
});

export const rateConfigSchema = z.object({
  rooms: z.array(roomRatePolicySchema),
  seasons: z.array(seasonalRateSchema).max(200),
  longStay: z.array(longStayDiscountSchema).max(20),
  coupons: z.array(couponSchema).max(200),
  extras: z.array(extraSchema).max(50),
  depositPct: z.number().min(0).max(100),
  /** Minutes an unpaid online booking holds its room before it is released. */
  holdMinutes: z.number().int().min(5).max(24 * 60),
  cancellation: cancellationPolicySchema,
});

export type RoomRatePolicy = z.infer<typeof roomRatePolicySchema>;
export type SeasonalRate = z.infer<typeof seasonalRateSchema>;
export type LongStayDiscount = z.infer<typeof longStayDiscountSchema>;
export type Coupon = z.input<typeof couponSchema>;
export type Extra = z.input<typeof extraSchema>;
export type ExtraPricing = Extra["pricing"];
export type CancellationPolicy = z.infer<typeof cancellationPolicySchema>;
export type RateConfig = {
  rooms: RoomRatePolicy[];
  seasons: SeasonalRate[];
  longStay: LongStayDiscount[];
  coupons: Coupon[];
  extras: Extra[];
  depositPct: number;
  holdMinutes: number;
  cancellation: CancellationPolicy;
};

const MAX_GUESTS_BY_ROOM: Record<string, number> = {
  "guest-room": 2,
  "executive-room": 2,
  "signature-suite": 3,
  "presidential-suite": 4,
};

function defaultRoomPolicy(room: (typeof rooms)[number]): RoomRatePolicy {
  return {
    roomId: room.id,
    baseNightlyNgn: room.priceFrom,
    weekendUpliftNgn: 0,
    maxGuestsPerUnit: MAX_GUESTS_BY_ROOM[room.id] ?? 2,
    minNights: 1,
    maxNights: 30,
  };
}

export const DEFAULT_RATE_CONFIG: RateConfig = {
  rooms: rooms.map(defaultRoomPolicy),
  seasons: [],
  longStay: [],
  coupons: [],
  extras: [],
  depositPct: 20,
  holdMinutes: 60,
  cancellation: {
    allowGuestCancel: true,
    freeCancelHoursBefore: 48,
    refundPctWithinWindow: 100,
  },
};

/**
 * Stored configs are merged over the defaults so a room type added to the
 * catalog later still gets a policy, and a field added to RateConfig later
 * doesn't invalidate older saved documents.
 */
export function normalizeRateConfig(raw: unknown): RateConfig {
  const stored = (raw && typeof raw === "object" ? raw : {}) as Partial<RateConfig>;
  const merged = {
    ...DEFAULT_RATE_CONFIG,
    ...stored,
    cancellation: { ...DEFAULT_RATE_CONFIG.cancellation, ...stored.cancellation },
    rooms: rooms.map(
      (room) =>
        stored.rooms?.find((r) => r.roomId === room.id) ?? defaultRoomPolicy(room),
    ),
  };
  const parsed = rateConfigSchema.safeParse(merged);
  if (!parsed.success) {
    console.error("[rate-config] stored config invalid — using defaults", parsed.error.issues);
    return DEFAULT_RATE_CONFIG;
  }
  return parsed.data;
}

const STORE_FILE = dataPath("rate-config.json");
const CACHE_TTL_MS = 30_000;
let cache: { config: RateConfig; at: number } | null = null;

async function loadRateConfig(): Promise<RateConfig> {
  if (!isSupabaseEnabled()) {
    return normalizeRateConfig(await readJsonFile<unknown>(STORE_FILE, () => null));
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return DEFAULT_RATE_CONFIG;

  const { data, error } = await supabase
    .from("booking_engine_settings")
    .select("config")
    .eq("id", 1)
    .maybeSingle();

  // Migration 016 not applied yet → behave exactly as before it existed.
  if (error || !data) return DEFAULT_RATE_CONFIG;
  return normalizeRateConfig(data.config);
}

/** Cached for 30s per server instance — every search and quote reads this. */
export async function getRateConfig(): Promise<RateConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.config;
  const config = await loadRateConfig();
  cache = { config, at: Date.now() };
  return config;
}

export async function saveRateConfig(input: unknown): Promise<RateConfig> {
  const parsed = rateConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new RateConfigValidationError(parsed.error.issues.map((i) => i.message));
  }
  const config = parsed.data;

  if (!isSupabaseEnabled()) {
    await writeJsonFile(STORE_FILE, config);
  } else {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from("booking_engine_settings").upsert({
      id: 1,
      config,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  cache = { config, at: Date.now() };
  return config;
}

export class RateConfigValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("; "));
  }
}

/** Test seam — drops the 30s cache. */
export function clearRateConfigCache(): void {
  cache = null;
}
