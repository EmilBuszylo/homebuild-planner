# Cookbook & CI Floor — Implementation Plan

## Overview

Implement **test-plan Phase 4** (`context/foundation/test-plan.md` §3 row 4): consolidate cookbook documentation, align §5 quality gates with `.github/workflows/ci.yml`, and close the direct-push CI gap. **No new Vitest tests** unless verification discovers a missing command (research: inventory already covers risks #1–#7).

## Current State Analysis

- Phases 1–3 shipped **54 tests** across 10 `src/lib/**/*.test.ts` files (`research.md` inventory).
- CI (PR only): `pnpm lint` → `pnpm test` → `pnpm build:ci` in `.github/workflows/ci.yml`.
- test-plan §6.1–6.6 content exists but §4/§5/§6.6/§8 have stale paths and wording.
- `deploy.yml` on `push` to `main` does not run Vitest.

### Key Discoveries

- API mocking decision is **in-process mocks** in `plans-route-handlers.test.ts`, not MSW (`research.md`).
- Typecheck is **not** a separate script; ESLint TypeScript rules + `build:ci` suffice (`research.md`).
- Phase 3 `MANUAL-SMOKE` lives under `context/archive/2026-06-03-testing-questionnaire-hardening/`.

## Desired End State

1. **§6.0 Quick reference** in `test-plan.md`: Risk # → primary test file(s) → manual smoke (archive path or “—”).
2. **§4–§5–§8** accurate: API mocking row, integration gate “Phases 1–3”, pre-prod smoke index, CI steps listed explicitly, typecheck clarified, freshness dates 2026-06-03.
3. **§6.2** notes exported helpers (`asUser`, `harnessMocks`) for extenders.
4. **§6.6** Phase 3 MANUAL-SMOKE path fixed to archive.
5. **AGENTS.md** points to `context/foundation/test-plan.md` §6.
6. **README** short Testing subsection (commands + link to test-plan).
7. **`.github/workflows/ci.yml`** runs the same `ci` job on `pull_request` and `push` to `main`.
8. **§3 row 4** `complete` with change folder `testing-cookbook-ci-floor`.
9. `pnpm test`, `pnpm lint`, `pnpm build:ci` pass.

### Verification

```bash
pnpm test
pnpm lint
pnpm build:ci
```

## What We're NOT Doing

- New Vitest tests, MSW, Playwright, component tests.
- `pnpm typecheck` / `tsc --noEmit` script (unless verification fails — then stop and reassess).
- Changing `deploy.yml` to Vercel-less build (out of scope).
- Editing archived change folders under `context/archive/`.
- test-plan §1–§3 risk map content changes (only §3 row status).

## Implementation Approach

Doc-first, then minimal CI YAML. Use `research.md` inventory verbatim for §6.0 table. Mirror `ci.yml` step names in §5 “Where” column.

## Critical Implementation Details

**§6.0 table columns:** `Risk #` | `Automated coverage (primary files)` | `Manual smoke` — use archive paths only; Phase 2 manual = “— (handler tests only)”.

**CI duplicate runs:** Pushing to `main` after merge may run CI on PR and push; acceptable for MVP.

## Phase 1: Test-plan consolidation

### Overview

Single edit pass on `context/foundation/test-plan.md` for cookbook accuracy and rollout index.

### Changes Required

#### 1. Add §6.0 Quick reference

**File**: `context/foundation/test-plan.md`

**Intent**: Insert `### 6.0 Quick reference` before §6.1 with a markdown table mapping risks #1–#7 to test files and manual smoke docs (from `research.md` inventory).

**Contract**: Include all 10 test files where relevant; manual smokes only for Phase 1 and Phase 3 archive paths; note Vitest hoisting constraint in one bullet below the table.

#### 2. Fix stale sections

**Intent**: Update §4 API mocking row to in-process Vitest mocks. §5: split/clarify lint vs typecheck (`pnpm lint` + `build:ci`); integration gate “Phases 1–3”; pre-prod smoke → bullet list of archive `MANUAL-SMOKE.md` paths; add subsection “CI job (PR and main)” listing three commands. §6.6 Phase 3: archive path for MANUAL-SMOKE. §8 freshness: 2026-06-03, note Phase 4 complete. §4 test-base profile: “10 files, 54 tests” (approximate; re-count if needed at implement time).

#### 3. Extend §6.2 harness note

**Intent**: One bullet: exported `asUser`, `asAnonymous`, `harnessMocks`, `invokePostPlans`, `invokeRecalculate` from `plans-route-handlers.test.ts` for extension (no separate mock module).

### Success Criteria

#### Automated Verification

- `pnpm test` still passes (no code change)
- `pnpm lint` passes

#### Manual Verification

- Read §6.0 table — every risk #1–#7 has a file reference or explicit “manual only”

---

## Phase 2: Contributor pointers

### Overview

Point agents and humans at the canonical test-plan from repo entry docs.

### Changes Required

#### 1. AGENTS.md

**File**: `AGENTS.md`

**Intent**: Under Build, test, and development, add bullet: full test strategy and cookbook → `context/foundation/test-plan.md` (§6); local commands `pnpm test`, `pnpm lint`; CI runs same on PR and `main`.

**Contract**: Do not duplicate §6.2 content — link only.

#### 2. README Testing subsection

**File**: `README.md`

**Intent**: Add short `## Testing` with three commands and link to test-plan.

**Contract**: ≤6 lines; Polish not required (README may stay English per existing README tone — match existing file language).

### Success Criteria

#### Automated Verification

- `pnpm lint` passes

#### Manual Verification

- Links resolve to existing paths

---

## Phase 3: CI workflow alignment

### Overview

Run the existing `ci` job on `push` to `main` so direct pushes are gated like PRs.

### Changes Required

#### 1. Extend ci.yml triggers

**File**: `.github/workflows/ci.yml`

**Intent**: Under `on:`, add `push: branches: [main]` alongside `pull_request`.

**Contract**: Do not change job steps or Node/pnpm versions. Add YAML comment that job matches test-plan §5.

#### 2. Document in test-plan §5

**Intent**: In Phase 1 §5 CI subsection, state triggers: `pull_request` and `push` to `main`; note `deploy.yml` still uses Vercel build without Vitest (informational).

### Success Criteria

#### Automated Verification

- `pnpm test` and `pnpm lint` and `pnpm build:ci` pass locally
- YAML valid (no workflow linter in repo — eyeball syntax)

#### Manual Verification

- Optional: push branch and confirm Actions tab shows CI (owner)

---

## Phase 4: Verify and close rollout

### Overview

Confirm green commands and stamp test-plan Phase 4 complete.

### Changes Required

#### 1. test-plan §3 row 4

**File**: `context/foundation/test-plan.md`

**Intent**: Set row 4 Status `complete`, Change folder `testing-cookbook-ci-floor`. Update header “Last updated” to Phase 4 complete.

#### 2. change.md

**File**: `context/changes/testing-cookbook-ci-floor/change.md`

**Intent**: Set `status: implemented` when all automated steps pass.

### Success Criteria

#### Automated Verification

- `pnpm test`
- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification

- None

---

## Testing Strategy

No new automated tests. Verification is regression of existing suite + docs/CI only.

### Manual Testing Steps

1. Skim §6.0 — confirm risk coverage matches team expectations.
2. Optional: open GitHub Actions after merge to confirm `CI` on `main` push.

## Performance Considerations

None.

## Migration Notes

Not applicable.

## References

- `context/changes/testing-cookbook-ci-floor/research.md`
- `context/foundation/test-plan.md`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `context/archive/2026-06-02-testing-access-control-ownership/MANUAL-SMOKE.md`
- `context/archive/2026-06-03-testing-questionnaire-hardening/MANUAL-SMOKE.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Test-plan consolidation

#### Automated

- [x] 1.1 `pnpm test` and `pnpm lint` pass after test-plan edits — e2368db
- [x] 1.2 §6.0 table and §4–§8 fixes present in `test-plan.md` — e2368db

### Phase 2: Contributor pointers

#### Automated

- [x] 2.1 `pnpm lint` passes after AGENTS.md / README edits — 812f00c
- [x] 2.2 Links to `context/foundation/test-plan.md` §6 resolve — 812f00c

### Phase 3: CI workflow alignment

#### Automated

- [x] 3.1 `pnpm test`, `pnpm lint`, `pnpm build:ci` pass locally — 6e8a567
- [x] 3.2 `ci.yml` includes `push` to `main` trigger — 6e8a567

### Phase 4: Verify and close rollout

#### Automated

- [x] 4.1 Full verification commands pass — 4f4224b
- [x] 4.2 test-plan §3 row 4 marked `complete` — 4f4224b
