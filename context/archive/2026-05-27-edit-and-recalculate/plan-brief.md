# Edit and recalculate (S-05) — Plan Brief

> Full plan: `context/changes/edit-and-recalculate/plan.md`

## What & Why

MVP planning is iterative: users must change questionnaire answers and get an updated cost breakdown and timeline (FR-005, US-01). Today `/ankieta` redirects away when a plan exists, and `POST /api/plans` returns 409 — there is no recalculation path despite `PlanVersion` being designed for versioning.

## Starting Point

- Schema: `Plan` → many `PlanVersion` (unique `versionNumber` per plan); responses and `PlanStageResult` hang off a version (F-02 intent).
- `POST /api/plans` creates v1 only; 409 if plan exists (`src/app/api/plans/route.ts`).
- `GET /api/plans/[planId]/results` already returns the **latest** version (`orderBy versionNumber desc`, `take: 1`).
- Generation engine in `src/lib/plan-generation/` is reusable; S-03 delivers panel + plan UI entry points.

## Desired End State

A user with a plan opens **„Edytuj odpowiedzi”** from panel or plan page → `/ankieta` prefilled with their latest answers → submits → server creates **PlanVersion N+1**, regenerates `PlanStageResult`, redirects to `/moj-plan/:id` → updated table + timeline (≤100s). First-time create flow unchanged (`POST /api/plans` only when no plan).

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Complexity | MEDIUM | API + edit UX + shared tx; no schema migration | Plan |
| Versioning | New `PlanVersion` per recalc | Matches F-02 audit trail; GET already reads latest | Plan |
| History UI | Latest only in MVP | GET results already latest; no compare UI | Plan |
| Entry points | Panel + plan page | Discoverable edit without typing URLs | Plan |
| Recalc API | `POST /api/plans/[planId]/recalculate` | Clear create vs update; same body as create | Plan |
| Create API | Keep 409 on duplicate plan | Preserves one-plan-per-user invariant | Plan |
| Generation | Shared helper used by create + recalc | Avoid duplicated transaction logic | Plan |
| Rate limits | Out of scope (S-06) | Roadmap blocks S-06 on OQ #2 | Plan |

## Scope

**In scope:**

- `POST /api/plans/[planId]/recalculate` (auth, ownership, tx: new version + responses + generate)
- Refactor create path to shared persistence/generation helper
- Questionnaire edit mode: prefill from latest version, submit to recalculate
- Remove “redirect away” on `/ankieta` when plan exists
- „Edytuj odpowiedzi” on panel (has plan) and plan results page
- Polish copy: submit „Przelicz ponownie” in edit mode

**Out of scope:**

- Version history picker / diff (future)
- `S-06` rate-limit enforcement
- Internet refinement (S-04)
- Schema migrations (none expected)
- Automated test stack

## Architecture / Approach

```
Create:  POST /api/plans → tx(create Plan, v1, responses, generate) → 201
Recalc:  POST /api/plans/:id/recalculate → tx(vN+1, responses, generate) → 200
Read:    GET /api/plans/:id/results → latest version (unchanged contract)
UI:      questionnaire page loads latest responses → QuestionnaireForm(edit) → recalc POST
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Recalculate API | Route + shared tx helper; POST create refactored | versionNumber race — use max+1 in tx |
| 2. Questionnaire edit mode | Prefill, dual submit target, page loader | Coercing stored strings back to RHF types |
| 3. Entry points & E2E | Panel/plan links, copy, manual verify | Regression on first-time create path |

**Prerequisites:** S-03 done; generation + GET results on branch.

**Estimated effort:** ~2–3 after-hours sessions across 3 phases.

## Open Risks & Assumptions

- Old versions accumulate rows (acceptable MVP; no purge).
- Plans without `PlanStageResult` on v1 still 404 until user recalculates once.
- DEVELOPER pricing calibration still deferred from S-02.

## Success Criteria (Summary)

- User edits answers and sees updated costs + timeline on the same plan URL.
- New user path (no plan) still works via `POST /api/plans`.
- Recalculation completes within ≤100s NFR on local KB.
