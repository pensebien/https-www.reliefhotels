# Review Prompts (Phase 3)

Human or AI PR review before merging agent branches.

---

## Architecture compliance review

```text
Review this PR against Relief Hotels BVDLC architecture.

Read:
- project-context/02-architecture/solution-architecture.md
- project-context/02-architecture/security-requirements.md
- Relevant ADRs in architecture-decision-records/

Answer:
1. Does the change violate any Accepted ADR?
2. Are secrets server-only?
3. Does persistence match ADR-001 (Supabase in prod)?
4. Do notifications match ADR-003 (both channels when NOTIFY_CHANNEL=both)?
5. List required ENV_MATRIX updates.

Verdict: APPROVE | APPROVE WITH NOTES | BLOCK
```

---

## Business value review

```text
Review this PR for business value traceability.

Read:
- project-context/00-business-context/executive-intent.md
- project-context/00-business-context/success-metrics.md

Answer:
1. Which KPI does this support?
2. Does it weaken booking reliability, notification delivery, or brand UX?
3. Is scope creep present (out of agent thin slice)?

Verdict: APPROVE | DEFER | BLOCK
```

---

## API contract review

```text
Review API changes against docs/contracts/api-v1.md.

For each modified route:
- Request/response shape unchanged or versioned?
- Notification triggers still fire?
- Error responses safe (no stack traces to client)?

List breaking changes for Agent E/F coordination.
```

---

## Mobile & accessibility quick review

```text
Review changed TSX for:
- Touch targets on forms (book, events, dine-wine)
- Loading/error states on payment flow
- No layout break at 375px

Reference: project-context/02-architecture/nfr-specifications.md NFR-U1, NFR-U2.
```

---

## Pre-merge checklist (paste in PR description)

```markdown
## BVDLC merge checklist
- [ ] Branch matches agent assignment (A|D|E-v1|E-v2|F)
- [ ] `npm run build` PASS
- [ ] `docs/testing/agent-*-TESTS.md` completed
- [ ] `acceptance-criteria/phase-3-agent-delivery.md` § agent signed
- [ ] ENV_MATRIX / .env.example updated if new vars
- [ ] No secrets in diff
- [ ] Recorded in project-context/04-build-test-deploy/code-artifacts/README.md
```
