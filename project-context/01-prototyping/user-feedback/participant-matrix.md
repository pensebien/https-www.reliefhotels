# Participant Matrix

**Project:** Relief Hotels & Suites  
**Target sessions:** 7  
**Window:** Phase 1 prototyping (first 2 weeks)

## Recruitment Targets

| Segment | Count | Priority | Why |
|---------|-------|----------|-----|
| Local luxury travelers | 3 | P1 | Primary revenue audience (Nigeria) |
| International tourists | 2 | P2 | Brand perception + English/international UX |
| Corporate / event planners | 2 | P2 | Events & dining conversion path |

---

## Participant Tracker

| ID | Name / Alias | Segment | Device | Session date | Status | Usability (1–5) | Would book? | Key quote | Follow-up |
|----|--------------|---------|--------|--------------|--------|-----------------|-------------|-----------|-----------|
| P-01 | | Local luxury | Mobile | | Planned | | | | |
| P-02 | | Local luxury | Desktop | | Planned | | | | |
| P-03 | | Local luxury | Mobile | | Planned | | | | |
| P-04 | | International | Mobile | | Planned | | | | |
| P-05 | | International | Desktop | | Planned | | | | |
| P-06 | | Corporate | Desktop | | Planned | | | | |
| P-07 | | Corporate | Mobile | | Planned | | | | |

**Automated personas (Playwright):** `P-A01`–`P-A06` — run `npm run test:prototype`. See `docs/testing/prototype-automation.md`. Count as **4 of 5** minimum sessions; add **≥1 human** session for premium perception.

**Status values:** `Planned` · `Scheduled` · `Completed` · `No-show` · `Cancelled`

---

## Segment-Specific Questions

### Local luxury
- Does pricing in NGN feel clear and fair?
- Is the brand “5-star Nigerian luxury” credible?
- Would you pay deposit online vs call concierge?

### International tourist
- Is Calabar / Cross River context clear?
- Are tours and experiences easy to discover?
- Is English copy sufficient (FR/Pidgin needed)?

### Corporate / event planner
- Are venue capacities and event types clear?
- Is the event inquiry form complete enough?
- Would you expect a callback within 15 minutes?

---

## Risk Flags (watch list)

| Flag | Trigger | Action |
|------|---------|--------|
| R-01 | Payment flow fails | Log error; fix before next session |
| R-02 | Form submit fails | Check API + ngrok; verify in `/demo` |
| R-03 | Mobile layout broken | Prioritize CSS fix |
| R-04 | “Doesn’t feel luxury” | Review hero, typography, imagery |
| R-05 | No notification to manager | Escalate to notification POC |

---

## Completion Criteria (Phase 1)

- [ ] Minimum **5 of 7** sessions completed
- [ ] At least **1 session per segment** completed
- [ ] Average usability score **≥ 3.5 / 5**
- [ ] At least **60%** would book or “maybe” book
- [ ] All P1 blockers documented in `lessons-learned.md`

---

## Session Logistics

| Item | Detail |
|------|--------|
| Facilitator | Tech Lead |
| Sponsor observer | Kalu (optional) |
| Session length | 30 min |
| Incentive | TBD (coffee voucher / thank-you note) |
| Recording | Ask consent before screen share |
| Notes location | `user-feedback/session-notes/session-YYYY-MM-DD-XX.md` |
