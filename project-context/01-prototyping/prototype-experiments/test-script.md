# Prototype Test Script

**Project:** Relief Hotels & Suites  
**Phase:** 1 — Prototyping  
**Version:** 1.0  
**Date:** 2026-06-02

## Purpose

Run structured sessions to validate whether the website supports discovery, booking intent, and operational follow-up for our three priority audiences.

## Session Setup

- **Environment:** ngrok URL (production-like) or `http://localhost:3000`
- **Devices:** 1 mobile phone + 1 laptop per session
- **Duration:** 25–35 minutes per participant
- **Facilitator:** Tech Lead
- **Observer:** Notes taker (optional)

## Participant Profiles (Target Mix)

| # | Profile | Example |
|---|---------|---------|
| 1–3 | Local luxury traveler | Lagos/Abuja guest, weekend stay |
| 4–5 | International tourist | First visit to Calabar |
| 6–7 | Corporate / event planner | Conference, wedding, or gala inquiry |

---

## Task 1 — First Impression (2 min)

**Instruction:** “Open the homepage. Do not click yet. Tell me what kind of hotel this is and who it is for.”

| Field | Record |
|-------|--------|
| Time to answer | ___ sec |
| Premium perception (1–5) | ___ |
| Trust perception (1–5) | ___ |
| Notes | |

**Pass criteria:** Participant identifies luxury / Calabar / hotel stay within 30 seconds.

---

## Task 2 — Room Discovery (5 min)

**Instruction:** “Find a suite you would book for a 2-night stay. Tell me why you picked it.”

**Path:** Home → Rooms → select suite

| Field | Record |
|-------|--------|
| Completed without help | Yes / No |
| Time to complete | ___ min |
| Found price clearly | Yes / No |
| Found amenities clearly | Yes / No |
| Would book this room (1–5) | ___ |
| Friction points | |

**Pass criteria:** Reaches room detail and understands price + amenities in under 5 minutes.

---

## Task 3 — Booking / Deposit Flow (7 min)

**Instruction:** “Try to pay a deposit or complete the booking flow for your chosen room.”

**Path:** Rooms → Pay deposit online → `/book` → Paystack or demo success

| Field | Record |
|-------|--------|
| Completed flow | Yes / No / Partial |
| Time to complete | ___ min |
| Understood deposit amount | Yes / No |
| Payment trust (1–5) | ___ |
| Error encountered | |
| Reference/success shown | Yes / No |

**Pass criteria:** User reaches payment step or success page without facilitator intervention.

---

## Task 4 — Event / Dining Inquiry (5 min)

**Instruction:** “You are planning a corporate dinner for 40 guests. Find where to inquire and submit a request.”

**Path:** Events or Dine & Wine → fill form → submit

| Field | Record |
|-------|--------|
| Found events/dining page | Yes / No |
| Form submitted successfully | Yes / No |
| Time to complete | ___ min |
| Clarity of venue options (1–5) | ___ |
| Notes | |

**Pass criteria:** Form submission succeeds; user understands what happens next.

---

## Task 5 — Concierge Fallback (3 min)

**Instruction:** “If you preferred to speak to someone instead of booking online, how would you contact the hotel?”

**Path:** Contact section or footer

| Field | Record |
|-------|--------|
| Found phone/email | Yes / No |
| Time to find contact | ___ sec |
| Confidence in response (1–5) | ___ |

**Pass criteria:** Phone and email visible within 60 seconds.

---

## Task 6 — Language & Mobile (3 min)

**Instruction:** “Switch language (if available) and check one page on your phone.”

| Field | Record |
|-------|--------|
| Language switch works | Yes / No |
| Mobile layout acceptable (1–5) | ___ |
| Text readable | Yes / No |

---

## Post-Session Questions

1. Would you trust paying online on this site? (1–5) ___
2. What felt most premium? ___
3. What felt confusing or missing? ___
4. Would you recommend this hotel based on the website alone? (Yes/No/Maybe) ___
5. One change that would make you book today? ___

---

## Session Summary (Facilitator)

| Metric | Value |
|--------|-------|
| Participant ID | P-___ |
| Date | |
| Profile | Local luxury / International / Corporate |
| Tasks passed | ___ / 6 |
| Overall usability (1–5) | ___ |
| Blockers | |
| Recommended fixes (priority) | 1. 2. 3. |

---

## Demo URLs (update per session)

| Page | Path |
|------|------|
| Home | `/en` |
| Rooms | `/rooms` |
| Book | `/book?type=room&id=signature-suite` |
| Events | `/events` |
| Dine & Wine | `/dine-wine` |
| Gallery | `/gallery` |
| Demo dashboard | `/demo` (key: `relief-demo-2026`) |
