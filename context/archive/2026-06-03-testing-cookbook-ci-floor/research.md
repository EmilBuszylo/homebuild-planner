---
date: 2026-06-03T06:42:00Z
researcher: Cursor Agent
git_commit: 581495a47d1a5155272cde62df6aae4af42b93be
branch: master
repository: home-build-planner
topic: "Test-plan Phase 4 — cookbook gaps and CI alignment with shipped test rollouts"
tags: [research, codebase, test-plan, ci, vitest, cookbook, testing-cookbook-ci-floor]
status: complete
last_updated: 2026-06-03
last_updated_by: Cursor Agent
---

# Research: Test-plan Phase 4 — cookbook & CI floor

**Date**: 2026-06-03T06:42:00Z  
**Researcher**: Cursor Agent  
**Git Commit**: `581495a47d1a5155272cde62df6aae4af42b93be`  
**Branch**: `master`  
**Repository**: home-build-planner

## Research Question

Ground **test-plan Phase 4** (`context/foundation/test-plan.md` §3 row 4):

> Fill §6 patterns; align §5 gates with what ships.

What is already documented vs stale, what CI actually runs, and what minimal doc/CI gaps remain after Phases 1–3 (54 Vitest tests, 10 files).

## Summary

**Cookbook (§6):** Subsections 6.1–6.6 are largely filled from rollouts 1–3. Remaining work is **consolidation and accuracy**: stale paths (archived `MANUAL-SMOKE`, “API mocking none yet”), §5 gate wording (“Phases 1–2”, broken smoke link), §8 freshness ledger, and a missing **at-a-glance index** (risk → test file → manual smoke). No new test types are required unless a deliberate CI gap is found.

**CI:** `.github/workflows/ci.yml` on `pull_request` runs `pnpm lint` → `pnpm test` → `pnpm build:ci` — matches the three automated gates in test-plan §5 (lint, unit/integration via Vitest, production build). There is **no** standalone `pnpm typecheck`; TypeScript is enforced via `eslint-config-next/typescript` and `next build` in `build:ci`. **Gap:** CI does not run on `push` to `main`; `deploy.yml` builds via Vercel without `pnpm test` — direct pushes to `main` can skip the test gate.

**Recommended Phase 4 scope (cost × signal):** doc-only + optional small CI hardening (e.g. run same `ci` job on `push` to `main`, or `workflow_call` before deploy). Avoid MSW, Playwright, or new test files unless CI audit reveals a missing command.

## Detailed Findings

### Current test inventory (live codebase)

| File | Tests (approx.) | Risks / role |
|------|-----------------|--------------|
| `src/lib/api/plans-route-handlers.test.ts` | 15 | #1, #2, #4, #5, #6, #7 — handler integration |
| `src/lib/validations/questionnaire-inputs.test.ts` | 10 | #6 — API Zod |
| `src/lib/investment-state.test.ts` | 10 | #6 — UI option filtering helpers |
| `src/lib/plan-generation/generate-plan-results.test.ts` | 3 | #3 — directional oracle |
| `src/lib/plan/persist-plan-version.test.ts` | 3 | #4 — persist boundary |
| `src/lib/questionnaire/responses-to-inputs.test.ts` | 3 | #6 — edit reload |
| `src/lib/questionnaire/questionnaire-pipeline.test.ts` | 1 | cross #4 — lib pipeline |
| `src/lib/plan-refinement/apply-market-benchmarks.test.ts` | 4 | #3 — benchmarks |
| `src/lib/rate-limit/plan-recalc.test.ts` | 3 | #7 — policy env only |
| `src/lib/plan/sort-plan-stages-chronologically.test.ts` | 2 | display sort |

**Runner:** `vitest.config.mts` — `include: ["src/**/*.test.ts"]`, `environment: "node"`, `@/` alias. Matches AGENTS.md and test-plan §4.

**Shared fixtures:** `src/lib/api/test-fixtures/questionnaire-payload.ts`, `src/lib/plan-generation/test-fixtures/minimal-stages.ts`, `src/lib/questionnaire/test-fixtures/stored-responses.ts`.

### CI workflow (`.github/workflows/ci.yml`)

- Trigger: **`pull_request` only** (not `push` to `main`).
- Steps: checkout → pnpm 9 → Node 20 → `pnpm install --frozen-lockfile` → **`pnpm lint`** → **`pnpm test`** → **`pnpm run build:ci`** (`prisma generate && next build`, no migrate).
- Aligns with `package.json` scripts; no DB secrets required in CI.

### Deploy workflow (`.github/workflows/deploy.yml`)

- Trigger: `push` to `main`.
- Uses Vercel CLI `vercel build --prod` — **does not** invoke `pnpm test` or `pnpm lint`.
- Implication: merges via PR are gated; **direct commits to `main` are not**.

### test-plan §6 — what is done vs stale

| Section | Status | Gap |
|---------|--------|-----|
| 6.1 Unit tests | Filled (Phase 2–3) | Could add one-line “when to add colocated test” pointer to risk map |
| 6.2 Handler integration | Filled (Phases 1–3) | Document exported `harnessMocks` / `asUser` for extenders |
| 6.3 E2E | Filled (excluded) | OK |
| 6.4 New API routes | Filled | OK |
| 6.5 Generation/benchmarks | Filled (Phase 2) | OK |
| 6.6 Rollout notes | Phases 1–3 present | Phase 3 `MANUAL-SMOKE` path still says `context/changes/...` (folder archived) |

**Missing (Phase 4 target):**

- **§6.0 or “Quick reference”** — table: Risk # → primary automated test file(s) → manual smoke doc (archive path).
- **§4 Stack row “API mocking”** — still says “none yet / See Phase 2 research picks MSW”; actual choice is **in-process `vi.hoisted` + `vi.mock`** in handler test file (documented in 6.2).
- **§5 pre-prod smoke** — links `context/changes/testing-access-control-ownership/MANUAL-SMOKE.md` (wrong); should index archive paths for Phase 1 + Phase 3 smokes.
- **§5 integration gate** — text says “Phases 1–2 shipped”; should be **1–3**.
- **§8 Freshness ledger** — still 2026-06-02; bump after Phase 4.

### test-plan §5 — typecheck nuance

§5 lists “lint + typecheck” as one gate. Repo has **`pnpm lint`** only (ESLint + TypeScript rules via `eslint-config-next/typescript`). No `pnpm typecheck` / `tsc --noEmit`. **`pnpm build:ci`** provides compile-time TS via Next build. Phase 4 should either:

- **Clarify in test-plan** that typecheck is satisfied by `build:ci` + ESLint typescript rules, or
- **Add** `typecheck` script + CI step (heavier; only if team wants explicit `tsc`).

Recommendation: **clarify, do not add script** unless user wants redundant gate.

### AGENTS.md alignment

- Build/test section already mentions `src/lib/api/*.test.ts` and Vitest — good.
- Missing explicit pointer: “full test strategy and recipes → `context/foundation/test-plan.md` §6”.
- No mention of CI expectations for contributors.

### README

- No testing/CI section — optional one-liner in README pointing to test-plan + `pnpm test` (low priority).

### Manual smoke artifacts

| Rollout | Location |
|---------|----------|
| Phase 1 access/auth | `context/archive/2026-06-02-testing-access-control-ownership/MANUAL-SMOKE.md` |
| Phase 3 questionnaire | `context/archive/2026-06-03-testing-questionnaire-hardening/MANUAL-SMOKE.md` |

Phase 2 had no separate MANUAL-SMOKE (dev smoke noted in archive plan only).

## Code References

- `.github/workflows/ci.yml` — PR gate: lint, test, build:ci
- `.github/workflows/deploy.yml` — main deploy without Vitest
- `vitest.config.mts` — `src/**/*.test.ts`, node env
- `package.json` — `test`, `lint`, `build:ci` scripts
- `AGENTS.md` — Vitest + handler test note
- `context/foundation/test-plan.md` — §4–§8 targets for Phase 4 edits

## Architecture Insights

- **Single handler harness** (`plans-route-handlers.test.ts`) is the integration hub; cookbook should steer new plan APIs there or to sibling `*-route-handlers.test.ts` per §6.4 — not MSW.
- **Vitest hoisting constraint** (mocks in same file) is load-bearing; any §6 index should mention it once prominently.
- **CI truth** = what runs in `ci.yml`; test-plan §5 should mirror job steps verbatim to avoid drift.

## Historical Context (from prior changes)

- Phase 1 (`context/archive/2026-06-02-testing-access-control-ownership/`) established handler mock pattern and first cookbook §6.2.
- Phase 2 (`context/archive/2026-06-02-testing-generation-recalc-integrity/`) filled §6.1/§6.5 and generation tests; research chose mocks over MSW.
- Phase 3 (`context/archive/2026-06-03-testing-questionnaire-hardening/`) added questionnaire lib tests + MANUAL-SMOKE; archived before test-plan path fix.

## Related Research

- `context/archive/2026-06-02-testing-generation-recalc-integrity/research.md` — Risk #4 generate path (handler + persist layers)

## Open Questions

1. **CI on `push` to `main`:** Should Phase 4 add `on: push: branches: [main]` to `ci.yml` (or require CI status in branch protection)? Research recommends at least documenting the direct-push gap.
2. **Explicit `tsc`:** User preference: clarify-only vs new script — plan should default clarify-only.
3. **README testing blurb:** Include in Phase 4 or skip as out of scope?

## Recommended plan phases (for `/10x-plan`)

1. **test-plan consolidation** — §6.0 index, fix stale §4/§5/§6.6/§8, optional §6.2 harness note.
2. **AGENTS.md** — one pointer to test-plan §6.
3. **CI alignment (optional)** — extend `ci.yml` trigger or document; no new tests unless audit fails.
4. **Rollout close** — §3 row 4 complete; no `research.md` requirement in test-plan for this phase beyond this file.
