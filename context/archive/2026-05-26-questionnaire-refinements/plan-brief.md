# Questionnaire Refinements — Plan Brief

> Full plan: `context/changes/questionnaire-refinements/plan.md`

## What & Why

Correct 4 questionnaire aspects that produce unrealistic cost estimates: insulation level uses cm-based labels instead of a quality tier with percentage cost multipliers; investment state asks "current state" instead of "target state" with no way to skip completed stages; terrace doors are a boolean instead of a count; and there's no balcony question despite significant cost impact. These corrections are prerequisites for S-02 (plan generation) to produce accurate cost estimates.

## Starting Point

The questionnaire (S-01) is complete with 11 questions across 3 steps + summary, a working `POST /api/plans` endpoint, and 24 cost modifiers in seed data. The `[PER_UNIT:slug]` modifier convention is already established for windows and exterior doors.

## Desired End State

The questionnaire has 13 questions with corrected semantics. Insulation level is a qualitative tier that applies a ~15%/30% cost uplift across 4 stages. Users specify both a target state and starting state, enabling S-02 to skip completed stages. Terrace doors and balconies are counted with per-unit pricing by build standard.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
|---|---|---|
| Insulation labels | Simple qualitative (no cm) | Insulation is broader than wall styrofoam — cm is misleading. |
| Insulation cost model | % uplift on 4 insulation-related stages | Reflects reality: better insulation affects foundations, roof, and heating too. |
| Target state options | All options (FROM_SCRATCH → DEVELOPER) | Allows building only foundations as a valid target. |
| Starting state validation | Default FROM_SCRATCH, validate start < target | Prevents nonsensical input (can't start from a state beyond the target). |
| Terrace door pricing | 0–5 count, current per-unit prices kept | Economy=3k (balcony doors), Standard=8k (smart sliding), Premium=15k (HS). |
| Balcony pricing | 0–4 count, 8k/14k/22k per unit by standard | Covers structural reinforcement + railing + waterproofing. |
| Balcony step placement | Step 2 (Parametry budynku) | Groups with building parameters (floors, attic, garage). |

## Scope

**In scope:**
- Update insulation_level labels and cost modifier model
- Change investment_state semantics to target state
- Add starting_state question with cross-field validation
- Replace has_terrace_doors boolean with terrace_door_count number
- Add balcony_count question with cost modifiers
- Update Zod schemas, form UI, step mappings, summary

**Out of scope:**
- Prisma schema migration (not needed — JSON fields accommodate changes)
- Stage-skipping logic (S-02 scope)
- Migration of existing plan data
- Insulation sub-questions (material type, per-surface config)

## Architecture / Approach

Pure data + UI change — no new architecture. Seed data defines questions and modifiers, Zod validates input shape, form components render and collect answers. The `[PERCENT:N]` and `[PER_UNIT:slug]` description tags in modifiers are conventions that S-02's cost engine will interpret. No API route changes needed (POST /api/plans is slug-agnostic).

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Seed Data & Validation | 13 questions, updated modifiers, new Zod schema | Orphaned old question/modifier rows in DB after reseed |
| 2. Form UI Updates | Updated step mappings, defaults, summary, cross-validation | Cross-field validation UX for starting_state < target |

**Prerequisites:** S-01 complete, `pnpm db:seed` runnable
**Estimated effort:** ~1 session across 2 phases

## Open Risks & Assumptions

- Old `has_terrace_doors` question and its modifiers will remain as orphans in DB after reseed — recommend clean slate reseed via `pnpm db:reset-plans` first.
- The `[PERCENT:N]` tag is a convention, not enforced by schema. S-02 must interpret it correctly when computing costs.
- Existing plans (if any) will have old response slugs — no data migration for MVP.

## Success Criteria (Summary)

- Questionnaire renders 13 questions with correct labels, types, and step groupings
- Cross-field validation prevents starting_state >= investment_state
- Full submit creates 13 QuestionnaireResponse rows with correct slugs and values
