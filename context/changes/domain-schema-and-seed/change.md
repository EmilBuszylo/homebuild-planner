---
change_id: domain-schema-and-seed
title: Schemat domenowy Prisma i seed bazy wiedzy o etapach budowy
status: implemented
created: 2026-05-25
updated: 2026-05-28
archived_at: null
---

## Notes

F-02: modele Prisma dla ankiety, planu, etapów budowy i wyników (`QuestionDefinition`, `ConstructionStage`, `StageCostModifier`, `Plan`, `PlanVersion`, `QuestionnaireResponse`, `PlanStageResult`). Seed: `pnpm db:seed` → `prisma/seed.ts` (baza wiedzy etapów i modyfikatory). Typy: `src/lib/types/domain.ts` re-eksportuje enumy i modele z `@prisma/client`.

Migracja: `prisma/migrations/20260526085624_create_models_from_f_02/`.

Odblokowuje S-01, S-02 i dalsze slice’y na tym fundamencie.
