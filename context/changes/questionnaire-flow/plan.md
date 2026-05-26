# Questionnaire Flow — Implementation Plan

## Overview

Build a multi-step questionnaire form where a logged-in user answers 11 dynamically-rendered questions grouped into 3 themed steps + a summary, then submits to create a Plan with persisted responses via a single atomic API call. After submission, the user is redirected to a plan results page (stub for S-02). If the user already has a Plan, they are redirected to their existing plan results.

## Current State Analysis

Auth and domain foundations are in place. The Prisma schema defines `QuestionDefinition` (11 seeded rows), `Plan`, `PlanVersion`, and `QuestionnaireResponse` models. Zod schemas for all 11 questionnaire inputs exist in `src/lib/validations/questionnaire.ts`. The auth form pattern (RHF + `createZodResolver` + shadcn Field/Input/Button) is established. Route protection via middleware covers `/dashboard` and `/panel`. No questionnaire UI, API endpoint, or plan page exists yet.

## Desired End State

After this plan is complete:

- A logged-in user navigates to `/ankieta` and sees a multi-step questionnaire with 3 themed steps + summary.
- Each step renders the appropriate question types (SINGLE_CHOICE → radio group or select, NUMBER → numeric input, DATE → date input, BOOLEAN → checkbox/switch) with Polish labels, validation, and units from the database.
- The user navigates forward (with per-step validation) and backward freely. A progress bar shows current position.
- On the summary step, the user reviews all answers and submits. A single `POST /api/plans` call creates the Plan + PlanVersion + all QuestionnaireResponses atomically.
- After submission, the user is redirected to `/plan/[planId]` (stub page showing "plan created" until S-02 fills it).
- If the user already has a Plan and visits `/ankieta`, they are redirected to `/plan/[planId]`.
- `pnpm build` passes with all new files. No schema changes needed.

### Key Discoveries:

- `src/components/auth/auth-form-layout.tsx` — RHF `Controller` + shadcn `Field`/`FieldLabel`/`FieldError` pattern for form fields. Questionnaire renderers will follow this pattern.
- `src/components/ui/field.tsx` — Rich `FieldSet`, `FieldGroup`, `FieldLegend` primitives available; `FieldSet` designed for radio/checkbox groups (has gap variants for `radio-group` and `checkbox-group` slots).
- `src/lib/validations/zod-resolver.ts` — `createZodResolver` shim for Zod 4 + RHF compatibility.
- `prisma/seed.ts:13-138` — 11 questions with types, options, validation constraints, sort order. Three SINGLE_CHOICE questions have explicit option arrays.
- `src/middleware.ts:5-6` — `PROTECTED_PREFIXES` and `AUTH_PATHS` arrays need questionnaire and plan routes added.
- `next.config.ts:4-9` — Polish rewrite pattern: `{ source: "/ankieta", destination: "/questionnaire" }`.
- `src/lib/routes.ts` — Polish path constants for UI links.
- Lesson: "Route non-auth Supabase access through Next.js API routes" — plan creation uses a Route Handler with Prisma, not a Server Action.
- shadcn components available: button, card, input, label, field, separator. Missing: `radio-group`, `select`, `progress` — need to install.

## What We're NOT Doing

- **No edit/recalculate flow** — that's S-05. If user has a plan, redirect to results; no re-fill or versioning.
- **No cost estimate or timeline generation** — that's S-02. Plan results page is a stub.
- **No internet data refinement** — that's S-04.
- **No schema migrations** — all models exist from F-02.
- **No test suite** — no test runner configured.
- **No per-step persistence or localStorage drafts** — submit all at once.

## Implementation Approach

Three phases:

1. **Routing & scaffolding** — set up page routes (questionnaire + plan stub), install shadcn components, configure Polish rewrites and middleware protection.
2. **Questionnaire form UI** — server component that fetches questions from DB, client component with multi-step form (3 steps + summary), question type renderers, step navigation with progress bar.
3. **API & persistence** — `POST /api/plans` endpoint, Prisma transaction, form submission wiring, existing-plan redirect logic.

## Critical Implementation Details

### Question grouping into steps

The 11 questions are grouped into 3 content steps + 1 summary:

| Step | Title | Questions | Fields |
|---|---|---|---|
| 1 | Stan i standard budowy | investment_state, build_standard, insulation_level | 3 SINGLE_CHOICE (all required) |
| 2 | Parametry budynku | area, floors, has_attic, garage_spots | 2 NUMBER required, 1 BOOLEAN optional, 1 NUMBER optional |
| 3 | Okna, drzwi i termin | window_count, exterior_door_count, has_terrace_doors, key_date | 2 NUMBER required, 1 BOOLEAN optional, 1 DATE required |
| 4 | Podsumowanie | — | Review all answers, submit button |

### Optional field handling

Optional fields (`has_attic`, `garage_spots`, `has_terrace_doors`) render with sensible defaults (`false` for booleans, `0` for garage_spots) and an "(opcjonalne)" label suffix. They don't block forward navigation.

---

## Phase 1: Routing & Shadcn Scaffolding

### Overview

Set up the page routes, install missing shadcn primitives, configure Polish URL rewrites, and add route protection. Creates the skeleton pages that Phase 2 fills with content.

### Changes Required:

#### 1. Install shadcn components

**Intent**: Add `radio-group`, `select`, and `progress` primitives needed by the questionnaire form's question type renderers and step indicator.

**Contract**: Run `pnpm dlx shadcn@latest add radio-group select progress`. Files land in `src/components/ui/`.

#### 2. Questionnaire page route

**File**: `src/app/(app)/questionnaire/page.tsx`

**Intent**: Create the questionnaire page as a React Server Component. For now, render a placeholder. Phase 2 adds the actual form.

**Contract**: Default export async RSC. Protected by middleware (logged-in users only).

#### 3. Plan results stub page

**File**: `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: Create a stub results page that S-02 will fill with cost estimate and timeline. For S-01, shows plan ID and a "plan created" confirmation with a link back to the dashboard.

**Contract**: Default export async RSC. Reads `planId` from params. Fetches Plan via Prisma to verify ownership (userId matches session user). If not found or not owned, redirect to dashboard.

#### 4. Polish URL rewrites

**File**: `next.config.ts`

**Intent**: Add Polish path rewrites for the questionnaire and plan pages so users see `/ankieta` and `/moj-plan/[planId]` in the browser bar.

**Contract**: Add two rewrite rules: `{ source: "/ankieta", destination: "/questionnaire" }` and `{ source: "/moj-plan/:planId", destination: "/plan/:planId" }`.

#### 5. Route protection

**File**: `src/middleware.ts`

**Intent**: Protect the new routes so only authenticated users can access the questionnaire and plan pages.

**Contract**: Add `/questionnaire`, `/ankieta`, `/plan`, `/moj-plan` to `PROTECTED_PREFIXES`.

#### 6. Routes constant

**File**: `src/lib/routes.ts`

**Intent**: Add Polish path constants for the new pages so UI links use Polish URLs.

**Contract**: Add `questionnaire: "/ankieta"` and a `plan` function `(planId: string) => \`/moj-plan/${planId}\`` to the `routes` object.

### Success Criteria:

#### Automated Verification:

- `pnpm build` passes with new pages rendering placeholder content
- `pnpm lint` passes

#### Manual Verification:

- Visiting `/ankieta` while logged in shows placeholder questionnaire page
- Visiting `/ankieta` while logged out redirects to `/logowanie`
- Visiting `/moj-plan/test-id` while logged in shows stub page (or redirects to dashboard if plan not found)
- shadcn components installed: `radio-group.tsx`, `select.tsx`, `progress.tsx` exist in `src/components/ui/`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to Phase 2.

---

## Phase 2: Questionnaire Form UI

### Overview

Build the multi-step questionnaire form: server component fetches question definitions from DB, client component renders them in themed steps with type-appropriate inputs, back/next navigation, progress bar, and a summary step.

### Changes Required:

#### 1. Server-side question fetching

**File**: `src/app/(app)/questionnaire/page.tsx`

**Intent**: Replace Phase 1 placeholder. Fetch all `QuestionDefinition` rows from the database via Prisma, ordered by `sortOrder`. Pass them as serialized props to the client form component. Also check if the user already has a Plan — if so, redirect to the plan results page.

**Contract**: RSC reads session user via Supabase `getUser()`. Queries `prisma.plan.findFirst({ where: { userId } })` — if found, `redirect(\`/plan/${plan.id}\`)`. Queries `prisma.questionDefinition.findMany({ orderBy: { sortOrder: "asc" } })`. Renders the `QuestionnaireForm` client component with questions as props.

#### 2. Multi-step form container

**File**: `src/components/questionnaire/questionnaire-form.tsx`

**Intent**: Client component that manages multi-step form state. Owns a single RHF form instance with the full `questionnaireInputsSchema`. Renders the current step's fields, handles per-step validation on "next", and shows the summary on the final step.

**Contract**: Accepts `questions: QuestionDefinition[]` as props. Uses `useForm<QuestionnaireInputs>` with `createZodResolver`. Maintains `currentStep` state (0–3). On "next", validates only the current step's fields via `trigger()`. On "back", decrements step. On final submit, posts to `POST /api/plans`. Renders `StepProgress`, the current step's question fields, `StepNavigation`, and (on step 3) `QuestionnaireSummary`.

#### 3. Step progress indicator

**File**: `src/components/questionnaire/step-progress.tsx`

**Intent**: Visual progress bar showing the user which step they're on and how many remain. Uses shadcn `Progress` component.

**Contract**: Accepts `currentStep: number` and `totalSteps: number`. Renders step labels and a progress bar. Polish step names: "Stan i standard", "Parametry budynku", "Okna, drzwi i termin", "Podsumowanie".

#### 4. Question type renderers

**File**: `src/components/questionnaire/question-renderers.tsx`

**Intent**: Reusable field components for each `QuestionType`, following the RHF Controller + shadcn Field pattern from `auth-form-layout.tsx`. Each renderer reads the `QuestionDefinition` metadata (label, options, validation, unit, required) and renders the appropriate input.

**Contract**: Export components:
- `SingleChoiceField` — renders shadcn `RadioGroup` with `RadioGroupItem` for each option from `QuestionDefinition.options`. Uses RHF `Controller`.
- `NumberField` — renders shadcn `Input` with `type="number"` and unit suffix (e.g., "m²", "szt."). Uses RHF `Controller`.
- `DateField` — renders shadcn `Input` with `type="date"`. Uses RHF `Controller`.
- `BooleanField` — renders a labeled checkbox or switch. Uses RHF `Controller`.
- `QuestionField` — dispatcher that picks the right renderer based on `QuestionDefinition.type`.

All renderers: show `FieldLabel` with Polish label + "(opcjonalne)" suffix when `required === false`. Show `FieldError` for validation errors. Show `FieldDescription` with unit when present.

#### 5. Step content components

**File**: `src/components/questionnaire/step-content.tsx`

**Intent**: Render the questions for each step. Maps step index to question slugs and renders the appropriate `QuestionField` for each.

**Contract**: Accepts `stepIndex: number`, `questions: QuestionDefinition[]`, and `control` (RHF). Step-to-slug mapping:
- Step 0: `["investment_state", "build_standard", "insulation_level"]`
- Step 1: `["area", "floors", "has_attic", "garage_spots"]`
- Step 2: `["window_count", "exterior_door_count", "has_terrace_doors", "key_date"]`

Filters `questions` by the current step's slugs, renders each via `QuestionField`.

#### 6. Step navigation

**File**: `src/components/questionnaire/step-navigation.tsx`

**Intent**: Back and Next/Submit buttons at the bottom of each step.

**Contract**: Accepts `currentStep`, `totalSteps`, `onBack`, `onNext`, `isSubmitting`. Shows "Wstecz" button (hidden on step 0), "Dalej" button (steps 0–2), and "Zatwierdź" button on the summary step. Disables submit button while `isSubmitting`.

#### 7. Summary step

**File**: `src/components/questionnaire/questionnaire-summary.tsx`

**Intent**: Render a read-only review of all answers before submission. User can go back to edit or submit.

**Contract**: Accepts `questions: QuestionDefinition[]` and RHF `getValues()` result. For each question, displays the label and the human-readable answer (for SINGLE_CHOICE: the option label, not the raw value). Groups by step theme.

### Success Criteria:

#### Automated Verification:

- `pnpm build` passes with the new components
- `pnpm lint` passes

#### Manual Verification:

- Questionnaire page renders step 1 with three radio groups (stan inwestycji, standard, ocieplenie)
- Clicking "Dalej" without selecting required fields shows Polish validation errors
- Clicking "Dalej" with valid selections advances to step 2
- "Wstecz" navigates back preserving previous answers
- Progress bar reflects current step
- Step 3 renders number inputs with units, date input, and boolean toggle
- Summary step shows all answers with human-readable labels
- Optional fields show "(opcjonalne)" and have sensible defaults

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to Phase 3.

---

## Phase 3: API & Persistence

### Overview

Wire the form submission to a Route Handler that creates the Plan, PlanVersion, and QuestionnaireResponses in a single Prisma transaction. Handle the existing-plan redirect and error states.

### Changes Required:

#### 1. Plans API endpoint

**File**: `src/app/api/plans/route.ts`

**Intent**: Create a `POST` Route Handler that receives questionnaire responses and creates a Plan with its first PlanVersion and all QuestionnaireResponses atomically. Per the lesson, domain data goes through API routes with Prisma Client.

**Contract**: `POST` handler:
1. Read session user via Supabase `getUser()` — 401 if not authenticated.
2. Parse request body with `questionnaireInputsSchema.safeParse()` — 400 if invalid.
3. Check `prisma.plan.findFirst({ where: { userId } })` — if plan exists, return 409 with existing `planId`.
4. Create in a `prisma.$transaction`: `plan.create` with userId, `planVersion.create` with planId + versionNumber 1, `questionnaireResponse.createMany` for all parsed inputs (each as `{ planVersionId, questionSlug, value: String(value) }`).
5. Return 201 with `{ planId }`.

#### 2. Wire form submission

**File**: `src/components/questionnaire/questionnaire-form.tsx`

**Intent**: Connect the form's `onSubmit` to the `POST /api/plans` endpoint. Handle success (redirect to plan page), conflict (redirect to existing plan), and error states.

**Contract**: On submit: `fetch("/api/plans", { method: "POST", body })`. On 201: `router.push(routes.plan(planId))`. On 409: `router.push(routes.plan(existingPlanId))`. On 4xx/5xx: show server error message in the form.

#### 3. Existing-plan redirect on page load

**File**: `src/app/(app)/questionnaire/page.tsx`

**Intent**: Phase 2 added the redirect logic in the RSC. Verify it works end-to-end now that the API and plan page are wired.

**Contract**: No code changes expected — this is verification that the RSC `prisma.plan.findFirst` check redirects correctly.

### Success Criteria:

#### Automated Verification:

- `pnpm build` passes
- `pnpm lint` passes

#### Manual Verification:

- Submit the questionnaire with valid answers → plan is created in DB (visible in `pnpm db:studio`)
- After submit, user is redirected to `/moj-plan/[planId]` showing the stub plan page
- Visiting `/ankieta` again redirects to `/moj-plan/[planId]` (existing plan)
- Submitting with missing required fields shows validation errors (client + server-side)
- API returns 401 when called without auth session

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful. This completes S-01.

---

## Testing Strategy

### Unit Tests:

- No test runner configured — no unit tests in this change.

### Integration Tests:

- Not in scope. API correctness verified manually.

### Manual Testing Steps:

1. Log in, navigate to `/ankieta`
2. Walk through all 3 steps, fill in all required fields, leave optional fields at defaults
3. Verify progress bar advances, back button preserves state
4. On summary, verify all answers display correctly with Polish labels
5. Submit — verify redirect to `/moj-plan/[planId]`
6. Visit `/ankieta` again — verify redirect to existing plan
7. Open `pnpm db:studio` — verify Plan, PlanVersion (v1), and 11 QuestionnaireResponse rows
8. Log out and visit `/ankieta` — verify redirect to `/logowanie`

## Performance Considerations

- Question definitions (11 rows) fetched server-side in RSC — no client-side waterfall.
- Single API call on submit — no per-step network overhead.
- Form state is client-side only (no localStorage, no server drafts).
- Plan ownership check is a single `findFirst` query with userId index (from F-02 schema).

## Migration Notes

- No schema changes. All models exist from F-02.
- Seed data (11 questions) must be present in the DB for the questionnaire to render.
- New shadcn components added via CLI — no manual configuration beyond install.

## References

- PRD: `context/foundation/prd.md` (FR-003, FR-004, US-01)
- Roadmap S-01: `context/foundation/roadmap.md` (lines 106-117)
- Zod schemas: `src/lib/validations/questionnaire.ts`
- Domain types: `src/lib/types/domain.ts`
- Auth form pattern: `src/components/auth/login-form.tsx`, `src/components/auth/auth-form-layout.tsx`
- Zod resolver shim: `src/lib/validations/zod-resolver.ts`
- Lesson — API routes for domain data: `context/foundation/lessons.md` (lines 5-10)
- Prisma seed questions: `prisma/seed.ts` (lines 13-138)
- Prisma schema: `prisma/schema.prisma` (lines 54-64 QuestionDefinition, 112-123 Plan, 125-136 PlanVersion, 138-147 QuestionnaireResponse)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Routing & Shadcn Scaffolding

#### Automated

- [x] 1.1 `pnpm build` passes with new pages — 99a57b3
- [x] 1.2 `pnpm lint` passes — 99a57b3

#### Manual

- [x] 1.3 `/ankieta` renders placeholder while logged in — 99a57b3
- [x] 1.4 `/ankieta` redirects to `/logowanie` while logged out — 99a57b3
- [x] 1.5 `/moj-plan/test-id` shows stub or redirects to dashboard — 99a57b3
- [x] 1.6 shadcn components installed: radio-group, select, progress — 99a57b3

### Phase 2: Questionnaire Form UI

#### Automated

- [x] 2.1 `pnpm build` passes with new components
- [x] 2.2 `pnpm lint` passes

#### Manual

- [x] 2.3 Step 1 renders three radio groups with validation
- [x] 2.4 Step navigation works (forward with validation, backward preserving state)
- [x] 2.5 Progress bar reflects current step
- [x] 2.6 Summary step shows all answers with human-readable labels
- [x] 2.7 Optional fields show "(opcjonalne)" with defaults

### Phase 3: API & Persistence

#### Automated

- [ ] 3.1 `pnpm build` passes
- [ ] 3.2 `pnpm lint` passes

#### Manual

- [ ] 3.3 Submit creates Plan + PlanVersion + 11 Responses in DB
- [ ] 3.4 Redirect to `/moj-plan/[planId]` after submit
- [ ] 3.5 `/ankieta` redirects to existing plan on revisit
- [ ] 3.6 API returns 401 without auth session
