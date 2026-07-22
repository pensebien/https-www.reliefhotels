# Known Issues

| ID | Issue | Workaround | Fixed? |
|----|-------|------------|--------|
| KI-01 | File store unreliable on serverless | Use Supabase on Netlify | Mitigated when env set |
| KI-02 | WhatsApp requires Termii device/template setup | Console log until keys configured | Open |
| KI-03 | ngrok URL must match `NEXT_PUBLIC_APP_URL` | Update env each demo session | Doc in ENV_MATRIX |
| KI-04 | Duplicate Paystack verify | Unique `reference` in DB | Mitigated in Supabase mode |
