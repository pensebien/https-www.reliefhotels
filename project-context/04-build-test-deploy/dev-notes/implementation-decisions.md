# Implementation Decisions (Phase 4)

**Date:** 2026-06-02

## ID-01: Supabase with file fallback

**Decision:** Use `@supabase/supabase-js` with service role when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set; otherwise existing JSON files under `data/`.

**Why:** Local/ngrok demos work without cloud DB; production on Render uses Supabase per ADR-001.

**Files:** `src/lib/db/`, `src/lib/demo-store.ts`, `src/lib/inquiry-store.ts`

## ID-02: Schema location

**Decision:** `docs/supabase/schema.sql` — run manually in Supabase SQL editor.

## ID-03: WhatsApp via Termii first

**Decision:** `WHATSAPP_PROVIDER=termii` uses Termii WhatsApp API; `meta` reserved for future Meta Cloud env vars.

**Why:** Same vendor as SMS; ADR-003 dual channel at launch.

## ID-04: Notification logging

**Decision:** Optional `notification_log` table when Supabase enabled; failures never block booking writes.

## ID-05: No agent branches for this slice

**Decision:** Implement on `main` after documentation pause; record artifacts in `code-artifacts/README.md`.
