# Rollback Procedures

## Render (fast)

1. Open Render dashboard → Service → **Deploys**
2. Select last known good deploy → **Rollback**
3. Confirm site health (`/en`, `/api/reservations` health via smoke curl)

## Database (careful)

- Supabase: do **not** rollback schema without backup
- Bad migration: restore from Supabase backup / point-in-time if enabled
- Document incident in `../dev-notes/known-issues.md`

## Secrets compromise

1. Rotate Paystack, Termii, Resend, Supabase service role keys
2. Redeploy Render with new env
3. Rotate `DEMO_DASHBOARD_KEY` if demo URL was exposed

## Payment incidents

- Paystack dashboard: verify transaction by `reference`
- Match `payments` table in Supabase
- Manual refund per Paystack policy if duplicate charge

## Notification fallback

If WhatsApp down: set `NOTIFY_CHANNEL=sms` temporarily (document in deployment-history).
