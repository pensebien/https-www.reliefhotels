# Phase 2 — Architecture

**Status:** ✅ Accepted (2026-06-02)  
**BVDLC reference:** [Context Folder Structure](https://bvdlc.ai/resources/context-folder-structure.html)

## Documents

| File | Description |
|------|-------------|
| [solution-architecture.md](solution-architecture.md) | System context, capabilities, environments |
| [component-design.md](component-design.md) | Next.js layers, modules, APIs, libs |
| [integration-points.md](integration-points.md) | Paystack, Resend, Termii, Supabase, Netlify |
| [nfr-specifications.md](nfr-specifications.md) | Availability, performance, operability |
| [technology-decisions.md](technology-decisions.md) | Stack table and rejected alternatives |
| [security-requirements.md](security-requirements.md) | Secrets, PII, payment, checklist |

## Architecture Decision Records

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](architecture-decision-records/ADR-001-database-choice.md) | Supabase PostgreSQL | **Accepted** |
| [ADR-002](architecture-decision-records/ADR-002-api-design.md) | Route Handlers REST API | **Accepted** |
| [ADR-003](architecture-decision-records/ADR-003-notification-channel.md) | SMS + WhatsApp at launch | **Accepted** |
| [ADR-004](architecture-decision-records/ADR-004-hosting-netlify.md) | Netlify hosting | **Accepted** |
| [ADR-005](architecture-decision-records/ADR-005-cashier-dual-pos.md) | Front-desk cashier dual POS (Paystack + Moniepoint) | **Accepted** |
| [ADR-template](architecture-decision-records/ADR-template.md) | Template for future ADRs | — |

## Confirmed sponsor decisions

| Topic | Choice |
|-------|--------|
| Hosting | **Netlify** |
| Database | **Supabase Postgres** |
| Manager alerts | **SMS + WhatsApp** (`NOTIFY_CHANNEL=both`) |
| Production `/demo` | **Keep** with `DEMO_DASHBOARD_KEY` (rotate periodically) |

## Diagrams (Mermaid)

| Diagram | File |
|---------|------|
| System context | [diagrams/system-architecture.mmd](diagrams/system-architecture.mmd) |
| Booking & payment flow | [diagrams/data-flow.mmd](diagrams/data-flow.mmd) |
| Deployment | [diagrams/deployment-architecture.mmd](diagrams/deployment-architecture.mmd) |

## Next implementation steps

1. Create Supabase project + schema migration (Agent D)  
2. WhatsApp POC + `notifyManager()` dual channel (Agent F)  
3. Netlify deploy + `docs/ENV_MATRIX.md` production row  
4. Phase 1 validation sessions still required before declaring prototype complete
