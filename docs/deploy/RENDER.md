# Render Deployment — Relief Hotels

**ADR:** [ADR-004](../../project-context/02-architecture/architecture-decision-records/ADR-004-hosting-render.md)  
**Checklist:** [deployment-checklist.md](../../project-context/04-build-test-deploy/deployment-logs/deployment-checklist.md)  
**Env:** [ENV_MATRIX.md](../ENV_MATRIX.md)

---

## 1. Overview

| Item | Value |
|------|--------|
| Service type | **Web Service** (Node) |
| Runtime | Node 20+ |
| Build | `npm install && npm run build` |
| Start | `npm start` |
| Database | **Supabase** (external; not Render Postgres) |
| Domain | Custom via Notigori DNS → Render |

---

## 2. Prerequisites

- [ ] GitHub repo connected to Render
- [ ] Supabase project + `docs/supabase/schema.sql` applied
- [ ] Paystack live or test keys (per environment)
- [ ] Termii SMS (+ WhatsApp device if `NOTIFY_CHANNEL=both`)
- [ ] Resend verified domain (production email)

---

## 3. Create Web Service

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect repository `reliefhotels` (or monorepo root path if nested)
3. **Root directory:** `reliefhotels` (if repo root is parent folder, set accordingly)
4. **Branch:** `main` (later: deploy from release tags)
5. **Instance type:** Starter (scale up if needed)

### Build & start commands

| Field | Command |
|-------|---------|
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

### Health check (optional)

- Path: `/en` or `/`
- Expected: 200

---

## 4. Environment variables

Copy from `docs/ENV_MATRIX.md` **Production** row into Render → **Environment**.

| Key | Required | Notes |
|-----|----------|-------|
| `NODE_VERSION` | Recommended | `20` |
| `NEXT_PUBLIC_APP_URL` | Yes | `https://www.reliefhotelsandsuites.com` (no trailing slash) |
| `SUPABASE_URL` | Yes | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Secret** — server only |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes | Live or test |
| `PAYSTACK_SECRET_KEY` | Yes | **Secret** |
| `RESEND_API_KEY` | Yes | **Secret** |
| `EMAIL_FROM` | Yes | Verified sender |
| `RESERVATION_EMAIL` | Yes | Hotel inbox |
| `MANAGER_PHONE` | Yes | E.164 `+234...` |
| `NOTIFY_CHANNEL` | Yes | `both` for launch (ADR-003) |
| `TERMII_API_KEY` | Yes | **Secret** |
| `TERMII_SENDER_ID` | Yes | |
| `TERMII_WHATSAPP_DEVICE_ID` | If `both` | Termii dashboard |
| `WHATSAPP_PROVIDER` | If `both` | `termii` or `meta` |
| `DEMO_DASHBOARD_KEY` | Yes | Rotate from default; keep for stakeholder demo |
| `DEMO_MODE` | No | **Do not set** `true` in production |

Render sets `RENDER_EXTERNAL_URL` automatically — `lib/config.ts` uses it as fallback if `NEXT_PUBLIC_APP_URL` unset during first deploy.

---

## 5. Paystack callback

After first deploy, set Paystack dashboard:

- **Callback URL:** `{NEXT_PUBLIC_APP_URL}/payment/callback`
- Example: `https://www.reliefhotelsandsuites.com/payment/callback`

For staging Render URL, use preview URL until custom domain is live.

---

## 6. Custom domain (Notigori)

1. Render → Service → **Settings** → **Custom Domains**
2. Add `www.reliefhotelsandsuites.com` (and apex if needed)
3. At DNS provider (Notigori), add records Render shows (CNAME / A)
4. Wait for SSL **Active**
5. Update `NEXT_PUBLIC_APP_URL` to canonical HTTPS URL → **Manual Deploy**

---

## 7. Post-deploy smoke (15 min)

```bash
BASE=https://your-service.onrender.com  # or custom domain

curl -s -o /dev/null -w "%{http_code}" "$BASE/en"          # expect 200
curl -s -X POST "$BASE/api/reservations" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Smoke","lastName":"Test","email":"smoke@test.com","stayPreference":"executive-room","message":"Render deploy QA"}'
# expect {"ok":true,...}

# Demo dashboard
open "$BASE/demo?key=YOUR_DEMO_DASHBOARD_KEY"
```

Verify in Supabase Table Editor: new `reservations` row.

Record in `project-context/04-build-test-deploy/deployment-logs/deployment-history.md`.

---

## 8. Rollback

See [rollback-procedures.md](../../project-context/04-build-test-deploy/deployment-logs/rollback-procedures.md).

Render → **Deploys** → previous deploy → **Rollback**.

---

## 9. Preview environments (optional)

- Enable **Pull Request Previews** on Render for agent branches
- Use **test** Paystack keys on previews
- `NOTIFY_CHANNEL=console` or `sms` only on previews to avoid spam

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails on Render | Check Node version; run `npm run build` locally on same commit |
| 502 on start | Ensure `npm start` binds `$PORT` (Next.js does by default) |
| Bookings not in DB | `SUPABASE_*` missing or RLS blocking service role |
| Paystack redirect wrong | `NEXT_PUBLIC_APP_URL` mismatch |
| No SMS | `TERMII_API_KEY`, `MANAGER_PHONE`, `NOTIFY_CHANNEL` |
| WhatsApp only logs | Set `TERMII_WHATSAPP_DEVICE_ID`; check Termii approval |

---

## 11. Agent / PR workflow

- Agent branches merge to `main` → Render auto-deploys (if enabled)
- Use PR previews to QA agent work before merge
- Coordinator: `scripts/agent-pr-create.sh` + merge order in `docs/DELIVERY_AGENT_BRANCH_COMMANDS.md`
