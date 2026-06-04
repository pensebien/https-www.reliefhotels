# Test handoff — Agent D (API Services)

**Branch:** `features/agent-d-api-services`  
**Contract:** `docs/contracts/api-v1.md`

## Scope

- Reservation, Paystack init/verify, event inquiry, dining reservation APIs
- Storage: Supabase when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set; else `data/demo-store.json`, `data/inquiries.json`
- Response shape stable for Agent E and F

## Automated checks

- [ ] `npm run build` — PASS / FAIL

## Manual QA (curl)

```bash
# Reservation
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"t@example.com","stayPreference":"signature-suite","message":"QA test"}'

# Event inquiry
curl -X POST http://localhost:3000/api/event-inquiries \
  -H "Content-Type: application/json" \
  -d '{"firstName":"A","lastName":"B","email":"e@example.com","phone":"+234800","eventType":"corporate","eventDate":"2026-07-01","guestCount":"40","message":"QA"}'
```

**Expected:** `{ "ok": true, "id": "..." }` for each.

## Sign-off

- [ ] Ready to merge (before E and F)
