# Runbook — Manager Notifications

## Demo (current)

1. Set `NOTIFY_CHANNEL=console` in `.env.local`
2. Submit reservation or complete Paystack test payment
3. Check terminal logs and `/demo?key=relief-demo-2026`

## Production (when Termii live)

1. Set `NOTIFY_CHANNEL=sms` (or `both`)
2. Set `TERMII_API_KEY`, `TERMII_SENDER_ID`, `MANAGER_PHONE`
3. Verify one test SMS after deploy
4. Track delivery in Termii dashboard; target ≥95% per success-metrics

## Escalation

If SMS fails: check `MANAGER_PHONE` E.164 format; fall back to email via Resend + demo dashboard.
