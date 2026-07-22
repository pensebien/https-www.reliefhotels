# Solution Architecture — Relief Hotels Web Platform

**Date:** 2026-06-02  
**Status:** Draft (Phase 2)  
**Traceability:** [Executive Intent](../00-business-context/executive-intent.md) · [Success Metrics](../00-business-context/success-metrics.md) · [API v1](../../docs/contracts/api-v1.md)

## 1. Purpose

Deliver a **premium, multilingual marketing and booking website** for Relief Hotels & Suites (Calabar, Nigeria) that:

1. Converts high-intent guests through room reservation and deposit/payment flows  
2. Captures events, dining, and experience inquiries  
3. Alerts hotel management within minutes via SMS (WhatsApp later)  
4. Supports client demos (ngrok) and production on a custom domain  

## 2. Architectural style

| Aspect | Choice |
|--------|--------|
| Pattern | **Modular monolith** — single Next.js 16 App Router application |
| Deployment unit | One deployable web app (SSR/SSG + Route Handlers) |
| Data | **Phase 1:** JSON file stores (demo/local) · **Production:** Supabase PostgreSQL on Netlify (ADR-001) |
| Integrations | Paystack, Resend, Termii via server-side Route Handlers |
| i18n | `next-intl` with locale-prefixed routes (`/en`, `/fr`, …) |

No separate BFF or microservices for initial scope (~N2m); complexity stays in one repo with feature folders (`src/features/phase-*`).

## 3. System context (C4 — Level 1)

```text
                    ┌─────────────────────┐
                    │   Guest / Planner   │
                    │  (web + mobile)     │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │  Relief Hotels App  │
                    │  (Next.js on host)  │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  Paystack   │    │   Resend    │    │   Termii    │
    │  (payments) │    │   (email)   │    │   (SMS)     │
    └─────────────┘    └─────────────┘    └─────────────┘
           │                   │                   │
           └───────────────────┴───────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Hotel operations    │
                    │ (manager phone,     │
                    │  reservations inbox)│
                    └─────────────────────┘
```

**Out of scope (Phase 2 baseline):** PMS/channel manager, CMS SaaS, native mobile apps. **In scope for launch:** WhatsApp manager alerts (ADR-003).

## 4. Core capabilities → components

| Business capability | Primary UI | API | Persistence |
|--------------------|------------|-----|-------------|
| Brand & discovery | `[locale]/`, rooms, gallery, SEO landings | — | Static/TS content |
| Room reservation | `book`, contact | `POST /api/reservations` | Store → Postgres |
| Deposits / pay | `book`, `payment/callback` | Paystack init/verify | Payments table |
| Events | `events` | `POST /api/event-inquiries` | Inquiries table |
| Dining | `dine-wine` | `POST /api/dining-reservations` | Dining table |
| Manager alerts | — | Internal `notifyManager()` | Provider logs |
| Ops demo | `demo` | `GET /api/demo/activity` | Key-gated read |

## 5. Request paths (logical)

1. **Marketing read path** — Cached/static pages, locale middleware, minimal server work  
2. **Write path (booking)** — Client form → Zod validation → Route Handler → persist → email (optional) → notify manager  
3. **Payment path** — Initialize (server) → redirect Paystack → callback → verify → persist payment → notify  

All write paths are **synchronous** in v1; notification retry queue is a Phase 4 hardening item ([technical-learnings](../01-prototyping/validation-reports/technical-learnings.md)).

## 6. Environments

See `docs/ENV_MATRIX.md`.

| Tier | URL pattern | Data | Payments |
|------|-------------|------|----------|
| Local | localhost:3000 | File JSON | Test / DEMO_MODE |
| Demo | ngrok-free.app | File JSON | Test |
| Production | reliefhotelsandsuites.com (Netlify) | Supabase Postgres | Live Paystack |

## 7. Quality attributes (summary)

Detailed NFRs: [nfr-specifications.md](nfr-specifications.md).

- **Availability:** 99.5% monthly (single-region host)  
- **Security:** HTTPS, secrets server-only, demo dashboard key  
- **Performance:** LCP &lt; 2.5s on 4G for home/rooms (target)  
- **Operability:** Console SMS in demo; Termii delivery logs in prod  

## 8. Phase 2 deliverables checklist

| Artifact | Status |
|----------|--------|
| This document | Draft |
| [component-design.md](component-design.md) | Draft |
| [integration-points.md](integration-points.md) | Draft |
| ADRs 001–003 | **Accepted** (2026-06-02 sponsor input) |
| Diagrams (`diagrams/*.mmd`) | Draft |
| Production DB migration | Planned (post-ADR-001 sign-off) |

## 9. Confirmed decisions (2026-06-02)

| # | Decision |
|---|----------|
| O-1 | **Netlify** — production host |
| O-2 | **Supabase** — PostgreSQL |
| O-3 | **SMS + WhatsApp** at launch (`NOTIFY_CHANNEL=both`) |
| O-4 | **Keep `/demo`** on production with secret `DEMO_DASHBOARD_KEY` (rotate periodically) |
