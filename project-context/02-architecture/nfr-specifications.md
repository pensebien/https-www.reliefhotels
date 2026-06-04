# Non-Functional Requirements (NFR)

**Aligned to:** [success-metrics.md](../00-business-context/success-metrics.md)

## 1. Availability & reliability

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-A1 | Public site uptime | ≥ 99.5% / month | Host status page |
| NFR-A2 | API booking completion rate | ≥ 98% successful submissions | API logs / DB counts |
| NFR-A3 | Reservation traceability | 100% writes persisted | DB row exists for each 200 OK |
| NFR-A4 | RTO (host outage) | &lt; 4 hours | Runbook + redeploy |

**Note:** Serverless + file store is **not** NFR-A3 compliant — production requires Postgres (ADR-001).

## 2. Performance

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-P1 | Home / rooms TTFB | &lt; 800ms p95 | CDN + static where possible |
| NFR-P2 | LCP (mobile 4G) | &lt; 2.5s | Hero image optimization |
| NFR-P3 | API POST latency | &lt; 2s p95 | Excludes Paystack redirect |
| NFR-P4 | Paystack redirect | User-perceived &lt; 5s to hosted page | External |

## 3. Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S1 | Concurrent users | 50 simultaneous (launch) |
| NFR-S2 | Bookings / month | 20+ paid (business KPI) — headroom 10× |
| NFR-S3 | Data growth | 12 months reservations in single DB instance |

Vertical scale on managed host; no Kubernetes for v1.

## 4. Security

See [security-requirements.md](security-requirements.md).

| ID | Requirement |
|----|-------------|
| NFR-SEC1 | TLS 1.2+ everywhere |
| NFR-SEC2 | Secrets only in server env |
| NFR-SEC3 | Input validation on all write APIs |
| NFR-SEC4 | Rate limit public POST APIs (Phase 4) |

## 5. Usability & accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-U1 | Mobile-first booking | Works on iOS/Android Chrome/Safari |
| NFR-U2 | Locale coverage | 5 locales with EN fallback |
| NFR-U3 | WCAG | AA for primary flows (goal; audit Phase 4) |
| NFR-U4 | Brand | Premium visual parity with 5-star positioning |

## 6. Operability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-O1 | Manager SMS delivery | ≥ 95% (Termii) |
| NFR-O2 | First response time | ≤ 15 min service hours (operational) |
| NFR-O3 | Demo dashboard | Key-gated activity view for stakeholders |
| NFR-O4 | Deploy | &lt; 15 min from merge to live (CI/CD) |

## 7. Maintainability

| ID | Requirement |
|----|-------------|
| NFR-M1 | TypeScript strict mode |
| NFR-M2 | Feature folders map to BVDLC phases |
| NFR-M3 | ADRs for data, API, notifications |
| NFR-M4 | `npm run build` passes on main before merge |

## 8. Compliance & privacy (baseline)

| ID | Requirement |
|----|-------------|
| NFR-C1 | Collect minimum PII (name, email, phone where needed) |
| NFR-C2 | No card data on Relief servers (Paystack PCI scope) |
| NFR-C3 | Nigeria Data Protection Act awareness — privacy policy page (Phase 3/4) |

## 9. NFR verification matrix

| NFR | Test method | Owner |
|-----|-------------|-------|
| A2, A3 | `docs/testing/agent-*-TESTS.md` + DB audit | Tech Lead |
| P1–P2 | Lighthouse mobile | Tech Lead |
| O1 | Termii test send × 20 samples | Operations |
| SEC1–3 | Checklist in security-requirements | Tech Lead |
