# Design reference: Hilton Transcorp Abuja

**Use this file instead of fetching Hilton pages.** Patterns below are what Relief Hotels mirrors in code.

## URLs

| Page | URL |
|------|-----|
| Property home | https://www.hilton.com/en/hotels/abuhitw-transcorp-hilton-abuja/ |
| Rooms & rates | https://www.hilton.com/en/hotels/abuhitw-transcorp-hilton-abuja/rooms/ |

## Property bar (homepage — `HotelPropertyBar`)

Slim horizontal strip below site header, **sticky** at `top-20` (below 80px header).

**Left**

- Small logo (optional)
- **Relief Hotels & Suites** (property name)
- Full address on one line + **map pin icon only** (teal, clickable → Google Maps)
- Example address: `2 CICC Road, Ikot Mbo, Calabar, Cross River, Nigeria`

**Right — booking strip** (single bordered row, Hilton blue `#104c97`)

| Control | Behavior |
|---------|----------|
| Check-in / Check-out | Hidden native date input; visible: **large bold day** + stacked **MON** / **WEEKDAY** (e.g. `4` + `JUN` / `THU`) on one line |
| Rooms & guests | **Button** (not `<select>`); opens **modal** with +/- steppers: Rooms, Adults, Children; **Done** |
| Special rates | **Button**; opens **modal**: corporate code, promo code, AAA/senior checkboxes; **Apply** |
| Check Rooms & Rates | Solid blue CTA → `/rooms` with query params |

No duplicate nav links in the property bar (main nav stays in `SiteHeader`).

## Rooms page (`/rooms` — `RoomsCatalog`)

**Do not** clone full Hilton chrome; only the upper catalog area.

1. Centered **`h1`**: `font-serif text-4xl font-medium sm:text-5xl` — **Rooms & Suites**
2. **Your stay includes** subheading + amenity list (non-smoking, restaurant, outdoor bar, fitness, VIP bar)
3. Centered tabs: **All | Guest Rooms | Executive | Suites | Penthouse**
4. Grid filters by tab; **All** groups rooms under category headings
5. Room cards below keep Relief’s existing card UI (not Hilton cards)

## Relief implementation map

| Hilton pattern | Component / data |
|----------------|------------------|
| Property bar | `src/components/hotel-property-bar.tsx` |
| Modals | `src/components/booking-modal.tsx` |
| Rooms catalog | `src/components/rooms-catalog.tsx` |
| Site content | `src/content/site.ts` (`address`, `rooms`, `roomCategories`) |
| Copy | `messages/*.json` → `propertyBar`, `rooms` |

## When extending

- Match **compact height**, **button-style** booking controls, and **modal** flows before adding new fields.
- Date day numeral: **bold, ~3xl–4xl**, blue `#104c97`.
- Prefer updating this doc if Hilton-aligned patterns change.
