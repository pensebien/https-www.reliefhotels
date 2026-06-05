# Relief Hotels & Suites

A modern, multi-language luxury hotel website for **Relief Hotels & Suites** in Calabar, Cross River, Nigeria. Content is captured from [reliefhotelsandsuites.com](https://www.reliefhotelsandsuites.com/) and extended with Guest Rooms, Executive rooms, Suites, Penthouse, tours, and curated experiences.

## Features

- **5-star aesthetic** — EB Garamond + DM Sans, teal accents, video hero, elegant cards
- **Full source content** — hero, stats, experiences, highlights, CTA marquee, contact form, footer
- **Book & explore** — `/rooms`, `/tours`, `/experiences` with pricing in NGN
- **Multi-language** — English, French, Nigerian Pidgin, Igbo, Yorùbá (`next-intl`)
- **Secure reservations** — validated `POST /api/reservations` (wire to email/CRM next)
- **Easy to modify** — copy in `messages/*.json`, structure in `src/content/site.ts`
- **Fast & cheap** — Next.js static pages, Tailwind CSS 4, no heavy CMS required

## Getting started

```bash
cd reliefhotels
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Client demo in the next few hours?** Read **[DEMO.md](./DEMO.md)** — Paystack test setup, 20-minute demo script, dummy data, and dashboard walkthrough.

## Project structure

| Path | Purpose |
|------|---------|
| `docs/design-reference-hilton-abuja.md` | Hilton Abuja UI patterns (property bar, modals, rooms catalog) — read this instead of fetching Hilton |
| `src/content/site.ts` | Rooms, tours, media URLs, contact details |
| `messages/en.json` | English copy (base for all locales) |
| `messages/fr.json`, `pcm.json`, … | Translations |
| `src/components/sections/` | Homepage sections |
| `src/app/[locale]/` | Localized pages |

## Deploy

Deploy to [Vercel](https://vercel.com) for global CDN, preview URLs, and zero-config Next.js hosting.

## Next steps

1. Connect `/api/reservations` to Resend, SendGrid, or your PMS
2. Replace Unsplash placeholders with professional hotel photography
3. Add payment gateway (Paystack / Flutterwave) for instant bookings
4. Expand Igbo/Yorùbá translations in `messages/ig.json` and `messages/yo.json`
