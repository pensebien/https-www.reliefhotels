# Technical Notes

## Run Supabase schema

1. Create project at https://supabase.com  
2. SQL Editor → paste `docs/supabase/schema.sql` → Run  
3. Settings → API → copy URL + **service role** key to Netlify/local `.env.local`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Verify storage mode

```bash
# Without Supabase env → file store (data/*.json)
# With Supabase env → rows in dashboard Table Editor
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"firstName":"A","lastName":"B","email":"a@b.com","stayPreference":"executive-room","message":"test"}'
```

## Termii WhatsApp

Set `NOTIFY_CHANNEL=both`, `WHATSAPP_PROVIDER=termii`, and `TERMII_WHATSAPP_DEVICE_ID` from Termii dashboard when approved.
