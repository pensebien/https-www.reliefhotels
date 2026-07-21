# Business Context Summary (Phase 0)

**Source of truth:** `project-context/00-business-context/`  
**Approved:** Phase 0 GO — Kalu + Tech Lead

## Problem

Relief Hotels needs a premium web channel that converts interest into **secure online bookings** and fast operational follow-up.

## Primary KPI

| KPI | Target | Owner |
|-----|--------|-------|
| Paid online bookings | **20 / month** | Tech Lead + Reservations |

## Secondary KPIs (drive QA)

| KPI | Target |
|-----|--------|
| Website readiness | 100% critical journeys pass smoke tests |
| Booking flow reliability | ≥ 98% form/API completion |
| Reservation traceability | 100% stored |
| Manager notification delivery | ≥ 95% SMS/WhatsApp success |
| Response time | ≤ 15 min (service hours) |

## Audience priority

1. Local luxury travelers  
2. International tourists  
3. Corporate / events  

## Budget envelope

~**N2,000,000** (initial)

## Non-negotiables for build agents

1. Secure booking + reservation paths must work end-to-end (demo or live Paystack).
2. Every reservation/booking/inquiry must be **stored and traceable**.
3. **Manager must be notified** (SMS and/or WhatsApp) — Agent F owns implementation.
4. Premium brand tone; mobile-first; multi-language (EN base + fallbacks).

## Prototype → delivery mapping

| Prototype | Agent branch | Business outcome |
|-----------|--------------|------------------|
| V1 Core booking | `agent-e-prototype-v1-booking` | KPI 1, 2, 3 |
| V2 Experiences & events | `agent-e-prototype-v2-experiences` | Conversion + corporate segment |
| V3 Notifications | `agent-f-notifications` | KPI 5, 6 |

See `docs/DELIVERY_PHASED_BUILD_SPEC.md` for waves and merge order.
