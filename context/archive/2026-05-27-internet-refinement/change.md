---
change_id: internet-refinement
title: Internet refinement
status: archived
created: 2026-05-27
updated: 2026-05-28
archived_at: 2026-05-28T10:48:19Z
---

## Notes

S-04 (FR-009): doprecyzowanie kosztów mnożnikami rynkowymi z cache Postgres (`MarketBenchmark`), nie live fetch w POST/POST recalculate.

### MVP interpretation

- **Kotwica:** lokalna baza wiedzy (S-02) generuje koszty etapów.
- **Warstwa rynkowa:** po generacji `applyMarketBenchmarks` mnoży koszt per `ConstructionStage.category` (clamp 0.85–1.25), zapisuje w `PlanStageResult.estimatedCost`.
- **Brak live internetu** w ścieżce użytkownika (NFR / Vercel) — dane w `MarketBenchmark`, odświeżane poza requestem.
- **Timeline** bez zmian w tym slice.
- **UI:** banner + rozszerzony disclaimer gdy `refinementApplied` na najnowszej `PlanVersion`.

### Owner workflow

```bash
pnpm db:migrate          # po migracji Phase 1
pnpm db:seed             # domyślne benchmarki z JSON
pnpm benchmarks:import   # odświeżenie z prisma/data/market-benchmarks.json lub BENCHMARKS_JSON_URL
```

Opcjonalnie: ustaw `BENCHMARKS_JSON_URL` przed importem, aby pobrać snapshot JSON (timeout 10 s).
