# Cookbook & CI floor — Plan Brief

> Full plan: `context/changes/testing-cookbook-ci-floor/plan.md`  
> Research: `context/changes/testing-cookbook-ci-floor/research.md`  
> Test plan: `context/foundation/test-plan.md` (Phase 4)

## What & Why

Close **test-plan Phase 4**: after rollouts 1–3, §6 recipes exist but paths and §5 gates drifted from reality. Contributors and CI need one accurate map (risk → tests → manual smoke) and gates that match `.github/workflows/ci.yml`.

## Starting Point

- **54 Vitest tests** in 10 files; CI on PR runs `lint` → `test` → `build:ci`.
- §6.1–6.6 filled incrementally; §4 still says “API mocking TBD”; §5 links broken MANUAL-SMOKE path; no §6 index.
- `deploy.yml` on `main` does not run tests (direct-push gap).

## Desired End State

- `test-plan.md` has §6.0 quick reference, accurate §4–§5–§8, fixed archive paths, §3 row 4 **complete**.
- `AGENTS.md` points to test-plan §6 for test recipes.
- `ci.yml` also runs on `push` to `main` (same job as PR).
- `pnpm test` / `pnpm lint` / `pnpm build:ci` green; no new test files unless audit finds a gap.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| New tests | None (default) | Inventory covers risks; Phase 4 is consolidation | Research |
| API mocking doc | In-process Vitest mocks | Matches shipped harness; not MSW | Research |
| Typecheck gate | Clarify in §5 (ESLint TS + `build:ci`) | No redundant `tsc` script | Research / Plan |
| CI on `main` | Add `push: branches: [main]` to `ci.yml` | Closes direct-push bypass | Research |
| README | One short Testing subsection | Low-cost contributor discoverability | Plan |
| E2E / Playwright | Still excluded | test-plan §7 unchanged | Test-plan |

## Scope

**In scope:** test-plan edits, AGENTS.md, optional README, `ci.yml` trigger, verification commands.

**Out of scope:** MSW, Playwright, new Vitest files, `pnpm typecheck` script, deploy workflow rewrite, re-running archived rollouts.

## Architecture / Approach

Doc-first alignment: test-plan §5 mirrors `ci.yml` steps verbatim; §6.0 maps risks to existing files; CI duplicate trigger on `main` without changing job steps.

## Phases at a Glance

| Phase | Delivers | Key risk |
|-------|----------|----------|
| 1. Test-plan consolidation | §6.0, §4–§8 fixes, §6.6 paths | Doc drift |
| 2. Contributor pointers | AGENTS.md + README | Discoverability |
| 3. CI on main push | `ci.yml` trigger | Untested direct pushes |
| 4. Verify & close rollout | §3 row 4 complete | — |

**Prerequisites:** Phases 1–3 test rollouts archived; green `pnpm test` today.  
**Estimated effort:** ~1 session, 4 short phases.

## Open Risks & Assumptions

- Duplicate CI on PR + push to same commit may run twice if branch is main — acceptable cost.
- Branch protection not configured in repo — CI on `main` is best-effort without GitHub settings.

## Success Criteria (Summary)

- New contributor finds risk → test file → smoke doc in one §6.0 table.
- test-plan §5 matches CI job steps; no stale “MSW” or `context/changes/` smoke links.
- `push` to `main` runs the same lint/test/build job as PRs.
