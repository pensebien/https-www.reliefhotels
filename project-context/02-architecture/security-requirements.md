# Security Requirements

**Scope:** Relief Hotels public website + booking APIs  
**Threat model (v1):** Opportunistic abuse, credential leakage, PII exposure, payment fraud — not nation-state APT.

## 1. Security objectives

| Objective | Requirement |
|-----------|-------------|
| Confidentiality | Guest PII and API secrets protected |
| Integrity | Bookings/payments not silently lost or duplicated |
| Availability | Resist basic DoS; rate limits on write APIs |
| Accountability | Trace booking by `id` / Paystack `reference` |

## 2. Authentication & authorization

| Surface | Model |
|---------|-------|
| Public site | No login (guest-facing) |
| `/api/*` write | No API keys for guests; validation + rate limit |
| `/api/demo/activity` | Shared secret `?key=` matches `DEMO_DASHBOARD_KEY` |
| Admin / PMS | **Not in v1** |

**Production hardening:**

- [x] Keep `/demo` with secret key (sponsor decision) — rotate key quarterly  
- [ ] Rotate `DEMO_DASHBOARD_KEY` if ever exposed  
- [ ] Do not ship `DEMO_MODE=true` to production  

## 3. Secrets management

| Secret | Storage | Exposure |
|--------|---------|----------|
| `PAYSTACK_SECRET_KEY` | Host env only | Never `NEXT_PUBLIC_*` |
| `RESEND_API_KEY` | Host env only | Server |
| `TERMII_API_KEY` | Host env only | Server |
| `DATABASE_URL` | Host env only | Server |
| `DEMO_DASHBOARD_KEY` | Host env | Query param (demo only) |
| Paystack public key | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Browser OK |

- No secrets in Git (`.env.local`, `.env` gitignored)  
- Rotate keys if repo leak suspected  

## 4. Data protection

| Data class | Examples | Handling |
|------------|----------|----------|
| PII | Name, email, phone | Store in Postgres; minimize fields |
| Payment | Paystack reference, amount | No PAN/CVV on Relief servers |
| Operational | Manager phone | Env only |

**Retention:** TBD with Kalu (recommend 24 months bookings, then archive).

**Transmission:** HTTPS only; HSTS via host.

## 5. Input validation & output encoding

- All `POST /api/*` bodies validated with **Zod** before persistence  
- React default escaping for XSS on rendered user content (minimal free-text display)  
- Reject oversized payloads (&gt; 32KB body limit — implement Phase 4)  

## 6. Payment security

- Card entry only on **Paystack hosted** pages (PCI SAQ A scope for merchant)  
- Verify payments server-side with secret key before marking paid  
- Treat client-side verify responses as untrusted until server `verify` succeeds  

## 7. API abuse controls

| Control | Phase | Detail |
|---------|-------|--------|
| Rate limiting | 4 | Per-IP on `/api/reservations`, paystack init |
| CORS | N/A | Same-origin default for browser forms |
| CSRF | Low risk | JSON POST from same site; add token if cross-site forms added |

## 8. Dependency security

- `npm audit` before production deploy  
- Dependabot or monthly manual bump for `next`, `react`  

## 9. Incident response (lightweight)

1. Revoke rotated API keys (Paystack, Termii, Resend)  
2. Redeploy last known good build  
3. Notify Kalu + reservations team if PII breach suspected  
4. Document in `04-build-test-deploy/dev-notes/known-issues.md`  

## 10. Security acceptance checklist (pre-production)

- [ ] All secrets in host dashboard, not repo  
- [ ] `NEXT_PUBLIC_APP_URL` is production HTTPS  
- [ ] Live Paystack keys separated from test  
- [x] Demo route key-gated (not public without secret)  
- [ ] Postgres TLS connection (`sslmode=require`)  
- [ ] Privacy policy linked from footer  
- [ ] Manager phone correct in production env  
