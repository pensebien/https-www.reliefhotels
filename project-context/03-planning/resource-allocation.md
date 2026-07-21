# Resource Allocation

**Budget envelope:** ~N2,000,000 (Phase 0)  
**Team model:** Startup / small team (BVDLC tailoring)  
**Planning date:** 2026-06-02

## Roles

| Role | Person | Responsibilities | % allocation (next 8 weeks) |
|------|--------|------------------|----------------------------|
| Executive Sponsor | Kalu | GO/NO-GO, budget, domain/DNS, stakeholder demos | 10% |
| Tech Lead | Project owner | Architecture, agents, Supabase, Render, QA | 60% |
| Operations / Reservations | Hotel manager | Prototype sessions, SMS/WhatsApp POC, response SLA | 15% |
| Marketing (optional) | TBD | Copy, gallery assets, SEO review | 5% as needed |

No separate Product Owner — Tech Lead covers planning + delivery per combined Phase 2/3 BVDLC guidance.

## Effort by milestone

| Milestone | Effort (Tech Lead days) | Other |
|-----------|-------------------------|-------|
| M2 Prototype validation | 2–3 | Ops: 5 sessions × 30 min |
| M3 Architecture (done) | 2 | Sponsor: 1 hr review |
| M3b Agent waves A→F | 8–12 | Parallel agents reduce calendar time |
| M4 Production deploy | 2–3 | Kalu: DNS + Paystack live approval |
| M5 Month-1 monitoring | 1/mo ongoing | Ops: daily alert response |

## Budget allocation (indicative)

| Category | Est. (NGN) | Notes |
|----------|------------|-------|
| Build (labor) | 250,000–300,000 | Tech Lead / contractor |
| Hosting (Render) | 0–15,000/mo | Free tier → starter |
| Supabase | 0–10,000/mo | Free tier at launch volume |
| Paystack fees | Variable | Per transaction |
| Termii SMS + WhatsApp | 5,000–20,000/mo | Volume-dependent |
| Resend email | 0–5,000/mo | Low volume |
| Domain / DNS | Existing | Notigori |
| Contingency (15%) | ~60,000 | POC failures, extra iteration |

## Agent wave staffing

| Wave | Agents | Human coordinator | Reviewer |
|------|--------|-------------------|----------|
| 1 | A | Tech Lead | Tech Lead |
| 2 | D | Tech Lead | Tech Lead |
| 3 | E-v1, E-v2, F (parallel) | Tech Lead | Kalu for UX sign-off on E |
| Merge | All | Tech Lead | Tech Lead runs TEST docs |

**Rule:** One human merges; agents do not merge to `main` without TEST sign-off.

## Tools (no extra headcount)

| Tool | Owner | Cost |
|------|-------|------|
| GitHub | Tech Lead | Free |
| Cursor agents | Tech Lead | Existing license |
| ngrok | Tech Lead | Free tier demos |
| Render + Supabase | Tech Lead | SaaS above |
| Paystack / Termii / Resend | Kalu + Tech Lead | Usage-based |

## Escalation

| Issue | Escalate to |
|-------|-------------|
| Budget overrun | Kalu |
| WhatsApp BSP delay | Kalu + Tech Lead (ADR-003 fallback plan) |
| Live Paystack go-live | Kalu |
| Guest-facing outage | Tech Lead → Kalu if &gt; 1 hr |
