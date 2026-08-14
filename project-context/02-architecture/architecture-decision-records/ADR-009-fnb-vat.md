# ADR-009: F&B / room VAT — owner-configurable rate and collection mode

**Date:** 2026-08-13
**Status:** Accepted
**Deciders:** Tech Lead
**Traces to:** ADR-006 (flagged that no tax model existed anywhere in the app), ADR-007 (roles), `hms-expansion-roadmap.md`

## Context

**Phase 0 requirement:** none — Wave 2, Phase 2 of the in-house HMS.

Confirmed by repo-wide grep (twice, in two separate sessions) and explicitly called out in ADR-006: no VAT/tax computation exists anywhere in Relief Hotels' codebase. `FolioCharge` (`src/lib/folio/types.ts`) is a flat `qty * unitPriceNgn`; the cashier settle flow collects a free-form amount with no itemized pricing at all.

Discussed and confirmed directly with the business owner before building:
- Default rate: **7.5%**, matching Nigeria's current federal VAT rate.
- Default collection mode: **pass-through** — VAT itemized on top of the guest's bill (Subtotal + VAT = Total), not folded into displayed prices.
- **VAT only.** Relief is in Cross River/Calabar, which — unlike Lagos's hotel/restaurant consumption levy — has no state-level hotel consumption tax today. A second configurable tax slot was considered and explicitly rejected for now; add one later if it ever applies, rather than building unused generality now.
- Both the rate and the collection mode must be **owner-editable at runtime**, not an env var or a code constant — the owner may register for VAT, change rate, or switch modes without a deploy.

## Decision

1. New `TaxSettings` (`src/lib/tax-settings.ts`): `{ vatPercentage: number, collectionMode: "absorbed" | "pass_through" }`, single-row, same dual file/Supabase-store pattern as every other store in this codebase (`docs/supabase/migration-012-tax-settings.sql`). Defaults to 7.5% / pass_through.
2. `folioChargeBreakdown(charge, taxSettings)` (`src/lib/folio/types.ts`, mirrored in `src/features/fnb/lib/helpers.ts` per this codebase's existing feature-folder convention of independent local type/helper copies — see `folioChargeTotalNgn`, already duplicated the same way): returns `{ subtotalNgn, taxNgn, totalNgn }`. `pass_through` adds tax on top of `unitPriceNgn` (assumed pre-tax); `absorbed` backs the tax out of `unitPriceNgn` (assumed already tax-inclusive) for display only — the charge's stored price never changes either way.
3. New `/staff/settings/tax` — **manager and restaurant_owner only** (`GET` is open to any authenticated staff role, since front-desk/cashier need the rate to render a correct bill; `PATCH` is restricted), matching the `ACCESS_MATRIX` entries already reserved for this route in ADR-007.
4. Applied to `FnbFolioList` — the one shared component behind both F&B surfaces (`/staff/fnb` and the cashier's embedded F&B tab), so wiring it once covers both.

## Options considered

| Option | Pros | Cons | Result |
|--------|------|------|--------|
| Hardcode 7.5% in code | Simplest | Owner can't adjust if VAT status/rate changes; ADR-006 already flagged that no one had defined this — hardcoding would just move the same problem, not fix it | Rejected |
| Env var for the rate | Slightly simpler than a DB table | Requires a deploy to change; wrong shape for something the owner should self-serve | Rejected |
| Apply tax breakdown to the cashier's room-deposit field too | More "complete" | That field is a free-form amount the staff types, not an itemized price — there's no `unitPriceNgn` to break down; forcing a tax UI onto it would be a confusing retrofit onto a concept (deposit collection) that isn't really a priced "bill" | Rejected — scoped to F&B folio charges, where itemized pricing actually exists |

## Consequences

**Positive:** F&B billing now has a real, owner-controlled VAT model instead of no tax model at all; both F&B surfaces get it from one shared component.
**Negative:** room-charge revenue (the cashier settle flow) still has no itemized tax breakdown — the free-form deposit amount is unaffected by this ADR.
**Mitigation:** if/when room charges become itemized (a real per-stay price rather than a typed deposit amount), reuse `folioChargeBreakdown`'s shape rather than inventing a second tax calculation.

## Success criteria

- `/staff/fnb` and the cashier's F&B tab both show Subtotal / VAT / Total for the open balance, consistent with the configured rate and mode.
- `manager`/`restaurant_owner` can change the rate/mode from `/staff/settings/tax`; `cashier`/`cleaner_head` cannot (403).
- Switching `collectionMode` changes what the guest is shown without altering any stored `unitPriceNgn`.

## Rollback

Leave `vatPercentage` at 0 via `/staff/settings/tax` — every breakdown becomes `{ subtotalNgn: total, taxNgn: 0, totalNgn: total }`, equivalent to no tax.
