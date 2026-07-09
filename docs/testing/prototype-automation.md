# Automated Prototype Sessions

Playwright runs **4 synthetic personas** through the Phase 1 [test script](../prototype-experiments/test-script.md) with human-like delays, scrolling, and typing. This reduces manual session count while keeping real humans for premium perception and live SMS checks.

## Quick start

```bash
# Install browser (first time only)
npx playwright install chromium

# Run all personas + generate scorecard draft (~2 min)
npm run test:prototype

# Watch the browser act like a user
npm run test:prototype -- --headed

# Server already running on 3002
SKIP_WEB_SERVER=1 npm run test:prototype
```

## Personas (automated)

| ID | Profile | Device | Maps to manual matrix |
|----|---------|--------|------------------------|
| P-A01 | Local luxury | Mobile (iPhone 13) | P-01 |
| P-A02 | Local luxury | Desktop | P-02 |
| P-A04 | International | Mobile | P-04 |
| P-A06 | Corporate | Desktop | P-06 |

Corporate persona submits an **event inquiry**; others submit a **dining reservation** (task 4).

## Tasks covered

1. First impression — homepage luxury signal  
2. Room discovery — suites → pay deposit  
3. Booking — form → demo Paystack callback → success  
4. Event or dining inquiry form  
5. Contact phone/email on `/#contact`  
6. Language switch (EN → FR) + mobile viewport check  
7. *(bonus)* Booking visible on `/demo` confirmed tab  

## Outputs

| File | Purpose |
|------|---------|
| `test-results/prototype-sessions/P-A*.json` | Per-session task results |
| `test-results/prototype-sessions/summary.json` | Aggregate metrics |
| `validation-reports/automated-prototype-report.md` | Draft for `prototype-scorecard.md` |

## Phase 1 sign-off blend

| Evidence type | Count | Required for GO |
|---------------|-------|-----------------|
| **Automated** (this suite) | 4 | Functional coverage |
| **Human** (facilitated) | **≥ 2** | Premium perception, trust, optional Termii SMS on device |
| **Total sessions** | **≥ 5** | Per `participant-matrix.md` |

After a green run:

1. Open `automated-prototype-report.md`  
2. Copy suggested category scores into `prototype-scorecard.md` (note “automated” in Evidence)  
3. Mark `P-A01`–`P-A06` rows in `participant-matrix.md` as `Completed (automated)`  
4. Run **1–2 live human sessions** to fill brand/trust gaps  
5. Sign `phase-1-prototype.md`

## What automation cannot replace

- “Does this feel luxury?” subjective scores  
- Paystack **live** card UI  
- Manager **SMS/WhatsApp** on a physical phone  
- Stakeholder demo narration  

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 3002 in use | `SKIP_WEB_SERVER=1` and use existing `npm run dev` |
| Playwright not installed | `npm i -D @playwright/test` && `npx playwright install chromium` |
| Task 3 fails | Ensure `DEMO_MODE=true` (default in runner) |
| Dashboard task fails | Open `/demo?key=relief-demo-2026` manually; check storage |
