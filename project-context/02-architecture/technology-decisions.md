# Technology Decisions

**Principle:** Prefer proven, low-ops stack within ~N400k budget.  
**Traceability:** Phase 0 investment thesis · Phase 1 technical learnings

## 1. Decision summary

| Area | Decision | Rationale | ADR |
|------|----------|-----------|-----|
| Framework | **Next.js 16** (App Router) | SSR, API routes, i18n ecosystem, team familiarity | — |
| UI | **React 19** + **Tailwind CSS 4** | Fast premium UI, utility styling | — |
| i18n | **next-intl 4** | Locale routes, message files | — |
| Validation | **Zod 4** | API input safety | ADR-002 |
| Payments | **Paystack** | Nigeria NGN, local cards | — |
| Email | **Resend** | Simple transactional API | — |
| SMS + WhatsApp | **Termii** (+ WhatsApp BSP) | Dual manager alerts at launch | ADR-003 |
| Data (prod) | **Supabase PostgreSQL** | Sponsor choice; dashboard + Postgres | ADR-001 |
| Data (demo) | JSON files | Zero cost demos; **not for prod** | ADR-001 |
| Hosting | **Render** | Node runtime + env secrets; sponsor confirmed | — |
| Repo | **GitHub** + feature branches | Agentic delivery workflow | — |
| CI | Host-native build or GitHub Actions (TBD) | `npm run build` gate | — |

## 2. Rejected alternatives (record)

| Alternative | Why not (for v1) |
|-------------|------------------|
| WordPress + plugins | Harder to match custom luxury UX; security maintenance |
| Separate Express API | Extra deploy surface; Next Route Handlers sufficient |
| MongoDB | Relational booking/payment queries simpler in SQL |
| Twilio SMS | Higher cost/complexity vs Termii for NG numbers |
| Vercel (now) | Stakeholder preference for ngrok demos + Render/Netlify path |
| Full PMS integration | Budget/timeline; manual ops follow-up acceptable at 20 bookings/mo |

## 3. Stack version policy

- Pin major versions in `package.json`  
- Security patches: monthly review  
- Next.js upgrades: follow `next-upgrade` skill / official guide before major bumps  

## 4. Feature delivery mapping

| BVDLC phase folder | Code path |
|--------------------|-----------|
| Phase 1 foundation | `src/features/phase-1-foundation` |
| Phase 2 expansion | `src/features/phase-2-product-expansion` |
| Phase 3 polish | `src/features/phase-3-production-polish` |

## 5. Environment & configuration

Single codebase, config via environment variables (`docs/ENV_MATRIX.md`).

| Concern | Mechanism |
|---------|-----------|
| Demo vs live Paystack | `getServerConfig().demoMode` |
| Notifications | `NOTIFY_CHANNEL`, Termii keys |
| Public URL | `NEXT_PUBLIC_APP_URL` |

## 6. Observability (minimal v1)

| Signal | Tool |
|--------|------|
| Build failures | CI / host build log |
| Runtime errors | Host logs + `console.error` in API routes |
| Business events | DB timestamps + demo dashboard |
| SMS delivery | Termii dashboard |

**Phase 4+:** Sentry, structured JSON logs, uptime ping.

## 7. Decision review schedule

- **At production launch:** Revisit hosting and DB sizing  
- **At 20 bookings/month sustained:** PMS integration feasibility  
- **Quarterly:** ADR deprecations if stack changes  
