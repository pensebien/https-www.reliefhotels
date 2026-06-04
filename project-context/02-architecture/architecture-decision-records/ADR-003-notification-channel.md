# ADR-003: Manager notifications — Termii SMS + WhatsApp at launch

**Date:** 2026-06-02  
**Status:** Accepted  
**Deciders:** Kalu, Tech Lead, Operations

## Context

**Phase 0:** Alerts via **SMS and/or WhatsApp**; ≥95% delivery; ≤15 min response.  
**Phase 1:** `notifyManager()` implemented with Termii SMS + `NOTIFY_CHANNEL=console` for demos. WhatsApp path not implemented.  
**Technical challenge:** Reliable, low-latency alerts within Nigeria telco constraints.

## Decision

**Launch production with SMS and WhatsApp** (`NOTIFY_CHANNEL=both`).  
- **SMS:** Termii (`TERMII_API_KEY`, `MANAGER_PHONE`)  
- **WhatsApp:** Implement via Termii WhatsApp API or Meta WhatsApp Cloud API (evaluate during Agent F / pre-launch POC)  
Keep **Resend email** as secondary channel to reservations inbox.

## Options considered

### Option 1: Termii SMS only (launch)

**Pros:** Already implemented  
**Cons:** Does not meet sponsor launch requirement  
**Complexity:** Low — **not selected**

### Option 2: Termii SMS + WhatsApp (both) ✅ Selected

**Pros:** Matches Phase 0; manager gets dual channel  
**Cons:** WhatsApp Business onboarding + template approval; dual delivery monitoring  
**Complexity:** High — **required for launch**

### Option 3: Email only

**Pros:** Cheapest  
**Cons:** Fails manager mobile workflow; misses KPI #5  
**Complexity:** Low — **rejected**

## Rationale

Sponsor requires both channels at launch. SMS path is proven in code; WhatsApp must complete POC before production (`notification-poc-plan.md`). Combined KPI: ≥95% delivery on **at least one** channel per event, with both attempted when `NOTIFY_CHANNEL=both`.

## How this serves Phase 0

Manager learns of booking within minutes; reservations team can call guest back.

## Consequences

**Positive:** Clear POC in `notification-poc-plan.md`  
**Negative:** WhatsApp setup latency — **mitigation:** start Business verification early; fallback to SMS-only env flag only in emergency  

## Success criteria

- 20 test sends ≥95% delivered (Termii report)  
- Message includes guest name, intent, reference id  

## Rollback

Switch `NOTIFY_CHANNEL=console` + email-only; manual dashboard monitoring.

**Signed off:** SMS + WhatsApp at launch (2026-06-02).

## Implementation notes (Agent F)

1. Extend `notifyManager()` to call `sendWhatsApp()` when channel is `both` or `whatsapp`  
2. Env: `WHATSAPP_PROVIDER=termii|meta`, provider-specific keys  
3. Log per-channel `NotifyResult` for KPI measurement  
