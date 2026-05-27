# Questionnaire Refinements — Implementation Plan

## Overview

Correct 4 questionnaire aspects to match real-world home-building cost mechanics, based on builder experience feedback. Changes: (1) insulation level becomes a qualitative choice with percentage cost multipliers across insulation-related stages; (2) investment state now means "target state" with a new "starting state" question — stages already completed are skipped; (3) terrace doors change from boolean to count with per-unit pricing by standard; (4) new balcony count question with per-unit cost modifiers. No Prisma schema migration needed — all changes are in seed data, Zod validation, and form UI.

## Current State Analysis

The questionnaire has 11 questions grouped into 3 content steps + summary. Questions are defined in `prisma/seed.ts`, validated by `src/lib/validations/questionnaire.ts`, and rendered by components in `src/components/questionnaire/`. Cost modifiers use a `[PER_UNIT:slug]` convention in the description field for per-unit pricing (already used for windows and exterior doors).

Key issues with the current model:
- `insulation_level` labels reference cm of styrofoam ("15–20 cm", etc.) — insulation is much broader (walls, foundation, attic, material types) and should be a quality tier affecting multiple stages
- `investment_state` asks "current state" but should ask "target state" — there's no way to express "I already have foundations, build from there"
- `has_terrace_doors` is a boolean — can't express 2 or 3 terrace doors; pricing is fixed instead of per-unit
- No balcony question exists — balconies significantly affect structural and finishing costs

## Desired End State

After this plan is complete:

- `insulation_level` has simple qualitative labels (no cm references). ENHANCED adds ~15% and PASSIVE adds ~30% to costs on insulation-related stages (insulation, foundations, roof_structure, heating).
- `investment_state` is relabeled as target state ("Do jakiego stanu chcesz doprowadzić budowę?"). A new `starting_state` question ("Z jakiego stanu startujesz?") with the same options allows skipping completed stages. Cross-field validation ensures starting < target.
- `has_terrace_doors` is replaced by `terrace_door_count` (NUMBER, 0–5) with per-unit pricing by standard.
- New `balcony_count` (NUMBER, 0–4) question with per-unit cost modifiers by standard.
- Step mapping updated: `starting_state` in Step 1, `balcony_count` in Step 2, `terrace_door_count` replaces `has_terrace_doors` in Step 3.
- `pnpm build` and `pnpm lint` pass. After `pnpm db:seed`, the DB reflects updated questions and modifiers.

### Key Discoveries:

- `prisma/seed.ts:422-598` — the `[PER_UNIT:slug]` convention in modifier descriptions is already established for windows and exterior doors. Terrace doors and balconies follow the same pattern.
- `src/lib/validations/questionnaire.ts:3-9` — `investmentStateSchema` enum values (FROM_SCRATCH through DEVELOPER) stay unchanged; the Zod type is reused for both `investment_state` (target) and `starting_state`.
- `src/components/questionnaire/step-content.tsx` — `STEP_FIELDS` record maps step index to question slugs; this is the single place controlling which questions appear on which step.
- `prisma/schema.prisma` — `QuestionDefinition` uses JSON fields for `options` and `validation`, so no migration is needed for new questions or changed labels.
- `src/app/api/plans/route.ts` — persists responses as `{ questionSlug, value: String(value) }` — fully generic, no changes needed for new/changed questions.

## What We're NOT Doing

- **No Prisma schema migration** — QuestionDefinition's JSON fields accommodate all changes.
- **No changes to the API route** — `POST /api/plans` is slug-agnostic; new questions are persisted automatically.
- **No stage-skipping logic in the UI** — `starting_state` is captured as data; S-02 (plan-generation) will implement the skip logic when computing costs and timeline.
- **No migration of existing plan data** — MVP with minimal users; old plans keep old response values.
- **No insulation sub-questions** (material type, per-surface config) — the qualitative tier is the MVP abstraction.

## Implementation Approach

Two phases: Phase 1 updates the data layer (seed definitions, cost modifiers, Zod schemas) to establish the new question model. Phase 2 updates the form UI (step mappings, defaults, summary, cross-validation) to present the changes to the user. Both phases are independently testable — Phase 1 can be verified via `db:seed` + schema checks before touching the UI.

---

## Phase 1: Seed Data & Validation Updates

### Overview

Update question definitions, cost modifiers, and Zod validation schemas to reflect the 4 corrections. After this phase, `pnpm db:seed` populates the DB with corrected data and the Zod schema validates the new input shape.

### Changes Required:

#### 1. Update insulation_level question labels

**File**: `prisma/seed.ts`

**Intent**: Replace cm-based insulation labels with simple qualitative descriptions that don't imply only wall styrofoam thickness.

**Contract**: Change the `insulation_level` question's `options` array labels:
- `STANDARD` → `"Standardowy"` (was `"Standardowy (15–20 cm)"`)
- `ENHANCED` → `"Wzmocniony"` (was `"Wzmocniony (20–25 cm)"`)
- `PASSIVE` → `"Pasywny"` (was `"Pasywny (25–35 cm)"`)

#### 2. Update insulation cost modifiers to percentage model

**File**: `prisma/seed.ts`

**Intent**: Change insulation modifiers from flat PLN/m² additions on the insulation stage only, to percentage uplifts across insulation-related stages (insulation, foundations, roof_structure, heating). This reflects reality: better insulation affects foundation prep, roof construction, and heating system choice.

**Contract**: Remove the existing 2 insulation→insulation modifiers (ENHANCED +40/m², PASSIVE +90/m²) and the insulation→heating modifier (PASSIVE +60/m²). Replace with modifiers on 4 stages:

For ENHANCED (~15% uplift):
- `insulation` stage: `costAdjustmentPerM2` = round(base × 0.15) for each standard tier. Use a `[PERCENT:15]` tag in description.
- `foundations` stage: same percentage logic.
- `roof_structure` stage: same percentage logic.
- `heating` stage: same percentage logic.

For PASSIVE (~30% uplift):
- Same 4 stages with `[PERCENT:30]` tag.

The `[PERCENT:N]` description tag signals to S-02's cost engine that this modifier is a percentage uplift, not a flat value. The `costAdjustmentPerM2` field stores the pre-computed PLN/m² amount for the ECONOMY tier (S-02 will compute the actual percentage at runtime from the base cost of the user's chosen standard).

**Implementation detail**: Since the modifier schema stores absolute PLN/m² values (not percentages), and the base cost varies by standard tier, store the ECONOMY-tier computed amount and tag the description with `[PERCENT:N]` so S-02 can recalculate for STANDARD/PREMIUM. Example: insulation ECONOMY base = 100 PLN/m², ENHANCED 15% = +15 PLN/m² → `costAdjustmentPerM2: 15`, description: `"[PERCENT:15] Wzmocnione ocieplenie — podwyższony standard izolacji"`.

Computed modifiers (ENHANCED 15%, PASSIVE 30%):

| Stage | Base Economy | +ENHANCED (15%) | +PASSIVE (30%) |
|---|---|---|---|
| insulation | 100 | 15 | 30 |
| foundations | 400 | 60 | 120 |
| roof_structure | 200 | 30 | 60 |
| heating | 120 | 18 | 36 |

#### 3. Change investment_state question semantics

**File**: `prisma/seed.ts`

**Intent**: Relabel `investment_state` from "Stan inwestycji" to "Stan docelowy" to make it clear the user is selecting what they're building toward, not their current state.

**Contract**: Change `label` to `"Stan docelowy budowy"`. Keep all options (FROM_SCRATCH through DEVELOPER) with existing labels. Keep `sortOrder: 1`.

#### 4. Add starting_state question

**File**: `prisma/seed.ts`

**Intent**: New question asking the user where they're starting from. Stages with `completedByState <= starting_state` will be excluded from costs and timeline by S-02.

**Contract**: New entry in the `questions` array:
- `slug: "starting_state"`
- `label: "Aktualny stan budowy"`
- `type: QuestionType.SINGLE_CHOICE`
- `required: true`
- `sortOrder: 2` (shifts subsequent questions +1)
- `options`: same as `investment_state` — FROM_SCRATCH through DEVELOPER with same labels
- `validation: null`, `unit: null`

All questions after `investment_state` increment their `sortOrder` by 1 to accommodate.

#### 5. Replace has_terrace_doors with terrace_door_count

**File**: `prisma/seed.ts`

**Intent**: Replace the boolean terrace door question with a numeric count, enabling per-unit pricing.

**Contract**: Remove the `has_terrace_doors` question entry. Add new entry:
- `slug: "terrace_door_count"`
- `label: "Liczba drzwi tarasowych"`
- `type: QuestionType.NUMBER`
- `required: false`
- `sortOrder: 13` (same position in step 3, adjusted for starting_state shift)
- `validation: { min: 0, max: 5 }`
- `unit: "szt."`

Update terrace door modifiers: replace the 3 `has_terrace_doors=true` fixed-cost modifiers with 3 `build_standard`-triggered `[PER_UNIT:terrace_door_count]` modifiers:
- ECONOMY: `fixedCostAdjustment: 3000`, description: `"[PER_UNIT:terrace_door_count] Drzwi tarasowe — balkonowe zwykłe"`
- STANDARD: `fixedCostAdjustment: 8000`, description: `"[PER_UNIT:terrace_door_count] Drzwi tarasowe — przesuwne system smart"`
- PREMIUM: `fixedCostAdjustment: 15000`, description: `"[PER_UNIT:terrace_door_count] Drzwi tarasowe — przesuwne system HS"`

#### 6. Add balcony_count question and modifiers

**File**: `prisma/seed.ts`

**Intent**: New question for balcony count, with per-unit cost modifiers by build standard. Balconies affect structural costs (console/slab extension, railing, waterproofing).

**Contract**: New question entry:
- `slug: "balcony_count"`
- `label: "Liczba balkonów"`
- `type: QuestionType.NUMBER`
- `required: false`
- `sortOrder: 9` (Step 2 — Parametry budynku, after garage_spots)
- `validation: { min: 0, max: 4 }`
- `unit: "szt."`

New cost modifiers on the `floor_slabs` stage (balconies are structural extensions of the slab):
- ECONOMY: `fixedCostAdjustment: 8000`, description: `"[PER_UNIT:balcony_count] Balkon — standard ekonomiczny"`
- STANDARD: `fixedCostAdjustment: 14000`, description: `"[PER_UNIT:balcony_count] Balkon — standard standardowy"`
- PREMIUM: `fixedCostAdjustment: 22000`, description: `"[PER_UNIT:balcony_count] Balkon — standard premium"`

#### 7. Update Zod validation schema

**File**: `src/lib/validations/questionnaire.ts`

**Intent**: Update the schema to match the new question set: add `starting_state`, replace `has_terrace_doors` with `terrace_door_count`, add `balcony_count`, and add cross-field refinement for starting_state < investment_state.

**Contract**:
- Add `starting_state: investmentStateSchema` (required, reuses existing enum)
- Remove `has_terrace_doors`
- Add `terrace_door_count: z.number().int().min(0).max(5).optional().default(0)`
- Add `balcony_count: z.number().int().min(0).max(4).optional().default(0)`
- Add a `.refine()` on `questionnaireInputsSchema` validating that the ordinal position of `starting_state` < ordinal position of `investment_state` (define an order map: FROM_SCRATCH=0, FOUNDATIONS=1, OPEN_SHELL=2, CLOSED_SHELL=3, DEVELOPER=4). Error message: `"Stan startowy musi być wcześniejszy niż stan docelowy"`.

#### 8. Recalculate sortOrder for all questions

**File**: `prisma/seed.ts`

**Intent**: With `starting_state` inserted at position 2 and `balcony_count` inserted in Step 2, all subsequent sortOrders need recalculation.

**Contract**: Final sortOrder mapping:

| sortOrder | slug | step |
|---|---|---|
| 1 | investment_state | 0 |
| 2 | starting_state | 0 |
| 3 | build_standard | 0 |
| 4 | insulation_level | 0 |
| 5 | area | 1 |
| 6 | floors | 1 |
| 7 | has_attic | 1 |
| 8 | garage_spots | 1 |
| 9 | balcony_count | 1 |
| 10 | window_count | 2 |
| 11 | exterior_door_count | 2 |
| 12 | terrace_door_count | 2 |
| 13 | key_date | 2 |

### Success Criteria:

#### Automated Verification:

- `pnpm build` passes
- `pnpm lint` passes

#### Manual Verification:

- `pnpm db:seed` runs without errors
- Prisma Studio shows 13 question definitions with correct labels, types, and sortOrders
- Insulation modifiers target 4 stages with `[PERCENT:N]` descriptions
- Terrace door modifiers use `[PER_UNIT:terrace_door_count]` pattern
- Balcony modifiers exist on `floor_slabs` stage with `[PER_UNIT:balcony_count]` pattern
- Old `has_terrace_doors` question no longer exists in seed (may need manual DB cleanup or `db:reset-plans` + reseed)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to Phase 2. The human will need to run `pnpm db:seed` to apply the new data.

---

## Phase 2: Form UI Updates

### Overview

Update the questionnaire form components to reflect the new question set: step mappings, default values, summary display, and cross-field validation for starting_state < investment_state.

### Changes Required:

#### 1. Update step field mapping

**File**: `src/components/questionnaire/step-content.tsx`

**Intent**: Update `STEP_FIELDS` to include new questions and reflect the reorganized step assignments.

**Contract**: New `STEP_FIELDS` mapping:
- Step 0: `["investment_state", "starting_state", "build_standard", "insulation_level"]` (was 3, now 4)
- Step 1: `["area", "floors", "has_attic", "garage_spots", "balcony_count"]` (was 4, now 5)
- Step 2: `["window_count", "exterior_door_count", "terrace_door_count", "key_date"]` (was 4 with `has_terrace_doors`, now 4 with `terrace_door_count`)

Update `STEP_TITLES` if they reference step content.

#### 2. Update form default values

**File**: `src/components/questionnaire/questionnaire-form.tsx`

**Intent**: Add defaults for new optional fields and remove the old `has_terrace_doors` default.

**Contract**: Update `defaultValues` in `useForm`:
- Remove `has_terrace_doors: false`
- Add `terrace_door_count: 0`
- Add `balcony_count: 0`

Update `TOTAL_STEPS` if step count changes (it stays at 4: 3 content + 1 summary).

#### 3. Update summary display

**File**: `src/components/questionnaire/questionnaire-summary.tsx`

**Intent**: Update the summary groups to include new questions and handle the changed field types correctly.

**Contract**: Update `STEP_GROUPS` to match the new step field mapping from change 1. Ensure `formatAnswer` handles `terrace_door_count` and `balcony_count` as NUMBER type (with unit display). Remove `has_terrace_doors` from the groups.

#### 4. Handle cross-field validation UX

**File**: `src/components/questionnaire/questionnaire-form.tsx`

**Intent**: Display the cross-field validation error (starting_state >= investment_state) when the user tries to proceed past Step 0.

**Contract**: The Zod `.refine()` produces a root-level error. On Step 0, `form.trigger(STEP_FIELDS[0])` validates individual fields but not cross-field refinements. Add logic to check `form.trigger()` with the refinement path after individual fields pass. If the refinement fails, display the error below the `starting_state` field or as a step-level alert.

### Success Criteria:

#### Automated Verification:

- `pnpm build` passes
- `pnpm lint` passes

#### Manual Verification:

- Step 1 shows 4 questions: target state, starting state, build standard, insulation level (no cm in labels)
- Selecting starting_state >= investment_state and clicking "Dalej" shows validation error in Polish
- Step 2 shows 5 questions including balcony count (0–4)
- Step 3 shows terrace door count (0–5) instead of boolean checkbox, plus windows, exterior doors, and date
- Summary displays all 13 answers correctly with appropriate formatting
- Full submit works — plan created with 13 responses in DB

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. This completes S-01b.

---

## Testing Strategy

### Unit Tests:

- No test runner configured — no unit tests in this change.

### Integration Tests:

- Not in scope. Verified manually.

### Manual Testing Steps:

1. Run `pnpm db:seed` — verify 13 questions, updated modifiers
2. Log in, navigate to `/ankieta`, walk through all steps
3. On Step 1: verify insulation labels have no cm, starting_state appears below target state
4. Try invalid starting_state >= investment_state — verify Polish error
5. On Step 2: verify balcony_count appears with 0–4 range and "szt." unit
6. On Step 3: verify terrace_door_count (number, 0–5) replaces old boolean
7. Submit — verify 13 QuestionnaireResponse rows in DB via Prisma Studio
8. Check that `starting_state` and `balcony_count` values are stored correctly

## Performance Considerations

- Question count goes from 11 to 13 — negligible DB/UI impact
- Modifier count increases by ~8 (4 stages × 2 insulation tiers for %, plus 3 balcony, minus 3 old terrace boolean) — negligible seed/query impact
- No additional API calls or client-side fetches

## Migration Notes

- **Existing plans in DB**: old `has_terrace_doors` responses and old insulation modifier values remain. No data migration for MVP — existing plans are not recalculated.
- **Seed idempotency**: `pnpm db:seed` uses upsert for questions and stages, but the old `has_terrace_doors` question definition and its modifiers will remain in DB as orphans unless manually deleted. Recommend running `pnpm db:reset-plans` then re-seeding on a clean slate, or adding cleanup logic to the seed script.
- **Schema**: No Prisma migration needed. All changes are in seed data, Zod, and UI.

## References

- Roadmap S-01b: `context/foundation/roadmap.md`
- Seed data: `prisma/seed.ts`
- Zod schemas: `src/lib/validations/questionnaire.ts`
- Step mapping: `src/components/questionnaire/step-content.tsx`
- Form component: `src/components/questionnaire/questionnaire-form.tsx`
- Summary component: `src/components/questionnaire/questionnaire-summary.tsx`
- Question renderers: `src/components/questionnaire/question-renderers.tsx`
- Lesson — FK grouping: `context/foundation/lessons.md` (lines 33-38)
- Lesson — API routes for domain data: `context/foundation/lessons.md` (lines 5-10)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Seed Data & Validation Updates

#### Automated

- [x] 1.1 `pnpm build` passes — 49a9fc4
- [x] 1.2 `pnpm lint` passes — 49a9fc4

#### Manual

- [x] 1.3 `pnpm db:seed` runs without errors — 49a9fc4
- [x] 1.4 Prisma Studio shows 13 questions with correct labels and sortOrders — 49a9fc4
- [x] 1.5 Insulation modifiers use `[PERCENT:N]` pattern on 4 stages — 49a9fc4
- [x] 1.6 Terrace/balcony modifiers use `[PER_UNIT:slug]` pattern — 49a9fc4

### Phase 2: Form UI Updates

#### Automated

- [x] 2.1 `pnpm build` passes — 898ad87
- [x] 2.2 `pnpm lint` passes — 898ad87

#### Manual

- [x] 2.3 Step 1 shows 4 questions including starting_state with cross-validation — 898ad87
- [x] 2.4 Step 2 shows 5 questions including balcony_count — 898ad87
- [x] 2.5 Step 3 shows terrace_door_count replacing boolean — 898ad87
- [x] 2.6 Summary shows all 13 answers correctly — 898ad87
- [x] 2.7 Submit creates 13 QuestionnaireResponse rows in DB — 898ad87
