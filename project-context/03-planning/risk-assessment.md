# Risk Assessment (Phase 3 planning)

**Review cadence:** Weekly until production; then monthly  
**Links:** `../02-architecture/` · `acceptance-criteria/`

| Risk | L | I | Mitigation | Owner |
|------|---|---|------------|-------|
| Agent merge conflicts | M | M | Order A→D→E→F; thin slices | Tech Lead |
| Supabase migration data loss | M | H | Migration script + backup; TEST D-03 | Tech Lead |
| WhatsApp launch delay | H | H | Early BSP signup; SMS satisfies partial KPI | Kalu |
| Paystack callback URL wrong on Netlify | M | H | ENV_MATRIX checklist; one test live charge | Tech Lead |
| Dual-channel notify duplicate noise | L | M | Concise templates; ops runbook | Ops |
| Scope creep in agent sessions | M | M | `code-generation-prompts.md` out-of-scope lists | Tech Lead |
| Budget overrun (>N2m) | L | M | `resource-allocation.md` contingency | Kalu |
| Low booking conversion | M | H | Phase 1 UX findings; iterate post-launch | Kalu |
| Demo key leaked | L | M | Quarterly rotation; not in repo | Tech Lead |
| BVDLC docs drift from code | M | M | Update `project-context/` on ADR/contract change | Tech Lead |

**Legend:** L = Likelihood, I = Impact (H/M/L)

## Residual acceptance

| Environment | Accepted risk |
|-------------|---------------|
| ngrok demo | File store, console notifications |
| Production | **Not** accepted without Supabase + dual notify POC |

## Planning-phase triggers (escalate)

- WhatsApp POC fails twice → executive decision on launch date  
- Agent D blocked &gt; 3 days → descope non-critical APIs temporarily  
- Scorecard &lt; 3.5 → no agent launch (PIVOT UX first)  
