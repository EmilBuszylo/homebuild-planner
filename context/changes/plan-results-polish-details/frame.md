# Frame Brief: Plan results polish (S-11)

> Framing step before /10x-plan. Separates roadmap bundle from the problem worth planning first.

## Reported Observation

Roadmap **S-11** (faza 3, `parked`) states that after S-08 (horizontal timeline + coaching) and S-10 (MVP polish capstone), the **plan results screen** still needs work: users should have a **more polished** presentation of the orientacyjny kosztorys and harmonogram — with open product questions about merged vs separate views and cost-table scope (`context/foundation/roadmap.md` §S-11, §Parked).

## Initial Framing (preserved)

- **User's stated cause or approach**: The slice was framed as “polish details” — possibly **scalony kosztorys + timeline**, **kosmetyka kosztorysu** (grupowanie, wykresy, mobile), and **drobne UX timeline** (gęstość osi, mobile, kolizje markerów) — treated as one backlog item.
- **User's proposed direction**: Implement **S-11** as the next post-MVP slice (`plan-results-polish-details`).
- **Pre-dispatch narrowing**: **Several distinct observations** bundled in roadmap; owner had not separated them at `/10x-new`. **Leading concern (owner, 2026-06-02): timeline on mobile** — scroll, density, coaching discoverability.

## Dimension Map

The observation could originate at any of these dimensions:

1. **Timeline mobile / horizontal scroll / density** — Fixed label column (`9.5rem`), chart `overflow-x-auto`, `minWidth = totalSpanDays × 12px` (`plan-timeline.tsx`, `layout-timeline-stages.ts`); roadmap S-08 already flagged mobile scroll risk (`roadmap.md` §S-08 Risk).
2. **Merged cost + timeline view** — Roadmap unknown + Parked item; S-08/S-09/S-10 explicitly kept **separate** `PlanCostTable` + `PlanTimeline` Cards (`horizontal-timeline-coaching` plan, `mvp-polish-finish` out-of-scope).
3. **Stage order / cross-widget scan** — API returns stages `sortOrder asc` (`results/route.ts`); timeline re-sorts by `startDay` (`layout-timeline-stages.ts:112-117`); cost table uses API order (`plan-cost-table.tsx:56`). Row index ≠ chronological index without linking.
4. **Cost table cosmetics** — Plain 3-column table; functional with `overflow-x-auto`; S-10 capstone accepted table scroll as OK (`mvp-polish-finish` research).

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| Timeline mobile / scroll / coaching discoverability | `plan-timeline.tsx:33,161-214,180` — dual-pane, horizontal scroll, truncated labels; coaching via **hover** `Tooltip` (`124-149`); CardDescription says “najedź” (`171-173`); questionnaire-hints archive noted tooltips weak on touch | **STRONG** |
| Merged view is the primary gap | Deferred in S-08, S-10, roadmap Parked; no `stageSlug` linking between widgets; intentional two-Card layout in `plan/[planId]/page.tsx:103-106` | **NONE** as default problem |
| Order mismatch hurts scanning | `results/route.ts:32` vs `layout-timeline-stages.ts:112-117` vs `plan-cost-table.tsx:56` | **STRONG** (secondary; fixable without merge) |
| Cost table needs charts/grouping first | Weak UX bug signal; FR-006 needs clarity not charts; owner did **not** pick this as leading concern | **WEAK** |

## Narrowing Signals

- Owner selected **timeline mobile** as leading concern (frame Step 4).
- Code + roadmap align: S-08 delivered horizontal timeline; **remaining pain is presentation on narrow viewports**, not missing Gantt feature.
- PRD open question #2 (“tabela + timeline vs jeden widok”) remains **owner decision** — not required to solve mobile timeline polish (`prd.md` Success Criteria / Open Questions).
- Coaching hints are **code-defined** (`coaching-hints.ts`); DB `coachingNote` unused — out of scope unless polish needs copy source change (not blocking mobile UX).

## Cross-System Convention

| Prior change | Convention |
| --- | --- |
| S-08 `horizontal-timeline-coaching` | Kosztorys **above** timeline; no chart library; coaching in TS |
| S-09 `app-panel-polish` | Plan page hierarchy via shell + KPI strip; timeline logic untouched |
| S-10 `mvp-polish-finish` | Copy/disclaimers/mobile shell; **explicitly excluded** merge, charts, timeline density |
| Roadmap §Parked | Merged view + marker collisions → **S-11**, not MVP blockers |

Leading hypothesis **matches** convention: S-11 continues S-08’s timeline surface, not a new results paradigm.

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: Make the **horizontal plan timeline** understandable and usable on **mobile and narrow viewports** — horizontal scroll affordance, readable stage labels/dates, and **coaching hints discoverable without hover-only** — while keeping cost table and timeline as **separate** sections unless the owner later opts into a merge experiment.

The initial roadmap bundle mixed three threads. Evidence and owner input show **timeline mobile UX** is the leading gap; **merged view** is a separate product bet with no code pressure yet; **cost table** polish is deferrable; **row-order mismatch** is a worthwhile secondary fix (align sort or slug-based focus) but not the capstone of S-11.

## Confidence

**HIGH** — strong file evidence, matches archived scope boundaries, owner confirmed leading concern.

If `/10x-plan` expands into merged view or cost charts, re-run frame or explicit scope gate — that would violate S-10 non-goals and PRD “polishing details” risk (`roadmap.md` §S-11 Risk).

## What Changes for /10x-plan

Plan **timeline presentation polish** first (mobile scroll UX, label/date readability, coaching on touch). Optionally one small **consistency** task: same chronological order in table and timeline, or highlight-by-`stageSlug` — **not** a full merged layout. **Do not** lead with scalony widok or wykresy unless owner reopens that decision.

## References

- `src/app/(app)/plan/[planId]/page.tsx`
- `src/components/plan/plan-timeline.tsx`
- `src/components/plan/plan-cost-table.tsx`
- `src/lib/plan/layout-timeline-stages.ts`
- `src/app/api/plans/[planId]/results/route.ts`
- `context/foundation/roadmap.md` (S-08, S-11, Parked)
- `context/foundation/prd.md` (FR-006, open question #2)
- `context/archive/2026-05-28-horizontal-timeline-coaching/plan.md`
- `context/archive/2026-06-01-mvp-polish-finish/plan.md`
