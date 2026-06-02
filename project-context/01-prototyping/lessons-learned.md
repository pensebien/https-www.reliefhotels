# Lessons Learned - Phase 1

## What Worked

- Strong visual design and brand tone improved stakeholder confidence.
- Booking and inquiry flows are understandable to both leisure and event users.
- Phase-based feature structure supports collaborative implementation.

## What Was Challenging

- Git/worktree readiness slowed initial parallel-agent execution.
- Notification delivery path is business-critical but externally dependent.
- Scope expanded quickly (rooms, tours, events, dining, SEO) and needed tighter phase boundaries.

## Process Improvements

1. Confirm repo and branching strategy before parallel implementation
2. Lock acceptance criteria per phase before coding
3. Track each phase via context docs and phase KPIs

## Carry-Forward to Phase 2

- Finalize architecture for notification providers
- Document ADRs for payment + messaging provider choices
- Define non-functional targets (uptime, latency, alert delivery rate)
