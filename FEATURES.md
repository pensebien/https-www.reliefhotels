# Feature modules (phases 1–3)

Each phase lives in its own folder for easy parallel work and clean merges.

## Phase 1 — `src/features/phase-1-foundation/`

| Component | Purpose |
|-----------|---------|
| `MeetingsEventsTeaser` | Hilton-style business/events block on homepage |
| `SignatureExperiencesTeaser` | Ibom-style experience cards on homepage |

**Integration:** imported in `src/app/[locale]/page.tsx`

## Phase 2 — `src/features/phase-2-product-expansion/`

| Route | Module |
|-------|--------|
| `/events` | `EventsPageContent` + `EventInquiryForm` |
| `/dine-wine` | `DineWinePageContent` + `DiningReservationForm` |

**APIs:**

- `POST /api/event-inquiries`
- `POST /api/dining-reservations`

Data stored in `data/inquiries.json` (gitignored).

## Phase 3 — `src/features/phase-3-production-polish/`

| Route | SEO focus |
|-------|-----------|
| `/luxury-hotel-calabar` | Luxury hotel keywords |
| `/conference-venue-cross-river` | Conference / events |
| `/romantic-dining-calabar` | Romantic dining |

**CMS:** `content/cms-types.ts` + `content/mock-cms.ts` — replace `MockCmsDataSource` with your CMS adapter.

## i18n

English keys only (for now):

- `phase1.*`
- `phase2.*`
- `phase3.*`

## Verify locally

```bash
npm run dev
```

Smoke-test URLs:

- `/en`
- `/en/events`
- `/en/dine-wine`
- `/en/luxury-hotel-calabar`
- `/en/conference-venue-cross-river`
- `/en/romantic-dining-calabar`
