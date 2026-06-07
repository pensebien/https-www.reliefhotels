# Test handoff — Agent E (Prototype V2 — Experiences & Events)

**Prototype:** `project-context/01-prototyping/prototype-experiments/prototype-v2/`  
**Branch:** `features/agent-e-prototype-v2-experiences`  
**Audience KPI:** Corporate events + international tourist discovery

## Scope delivered

- Homepage: Events and Meetings teaser, Signature Experiences teaser
- `/events` — venues + event inquiry form
- `/dine-wine` — venues + dining reservation form
- Nav links: Events, Dine & Wine

## Automated checks

- [ ] `npm run lint` — PASS / FAIL
- [ ] `npm run build` — PASS / FAIL

### Commands run

```bash
npm run lint
npm run build
```

## Manual QA

### Preconditions

- App running (local or ngrok)

### Steps

1. Homepage — scroll to **Events and Meetings** — click CTA → `/events`.
2. On `/events`, submit event inquiry (corporate, 50 guests, future date).
3. Go to `/dine-wine` — submit dining reservation (Rooftop, 4 guests).
4. Homepage — click **Signature Experiences** cards (picnic, romantic, heritage, wellness) — each navigates.
5. Confirm forms show success state after submit.

### Expected outcomes

- Event and dining submissions return success (no 500)
- Data visible in `data/inquiries.json` locally OR console log
- Corporate planner can find capacity info within 2 clicks from home

## Sign-off

- [ ] Agent: automated checks passed
- [ ] QA: manual steps passed
- [ ] Ready to merge

## Blockers / follow-ups

- Agent F must confirm manager notified on event/dining submit (see F TEST doc)
