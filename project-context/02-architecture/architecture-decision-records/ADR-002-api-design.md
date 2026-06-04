# ADR-002: API style — Next.js Route Handlers (REST, unversioned paths)

**Date:** 2026-06-02  
**Status:** Accepted  
**Deciders:** Tech Lead

## Context

**Phase 0:** Secure booking and inquiries from web channel.  
**Phase 1:** Implemented `app/api/*` with JSON POST/GET and Zod validation.  
**Technical challenge:** Keep one deployable unit; document stable contract for agents and future mobile clients.

## Decision

Keep **RESTful Route Handlers** under `/api/*` with JSON bodies. Document contract in `docs/contracts/api-v1.md`. No GraphQL or tRPC for v1.

**Notification events** are internal TypeScript types (`NotifyPayload`), not public webhooks.

## Options considered

### Option 1: Next.js Route Handlers (current)

**Pros:** Colocated with UI; one repo; SSR + API same host  
**Cons:** Couples API lifecycle to frontend deploys  
**Complexity:** Low

### Option 2: Separate Express/Fastify service

**Pros:** Independent scaling  
**Cons:** Second deploy, CORS, duplicate types — overkill for 20 bookings/mo  
**Complexity:** High

### Option 3: GraphQL

**Pros:** Flexible queries  
**Cons:** Unnecessary for 5 endpoints; harder for agents  
**Complexity:** Medium

## Rationale

Matches delivered prototype; minimizes cost; contract doc sufficient for Agent D/E/F coordination.

## How this serves Phase 0

Fast iteration on booking flows without infrastructure sprawl.

## Consequences

**Positive:** Simple mental model; easy ngrok demos  
**Negative:** Version breaking changes need discipline — mitigate with `api-v2.md` when needed  

## Success criteria

- All five public endpoints pass contract tests in `docs/testing/`  
- Zod rejects invalid payloads with 400  

## Rollback

N/A — foundational choice already shipped on `main`.
