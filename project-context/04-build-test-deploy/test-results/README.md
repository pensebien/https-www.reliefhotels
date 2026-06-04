# Test Results

| Folder | Content |
|--------|---------|
| [unit-test-reports/](unit-test-reports/) | Automated unit (future) |
| [integration-test-reports/](integration-test-reports/) | API + Supabase curl |
| [e2e-test-reports/](e2e-test-reports/) | Browser journeys |
| [security-scan-results/](security-scan-results/) | npm audit, checklist |

**Handoffs:** `docs/testing/agent-*-TESTS.md`

## Latest build verification (2026-06-02)

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| Storage fallback | file without Supabase env |
| Storage production | Supabase when env set |
