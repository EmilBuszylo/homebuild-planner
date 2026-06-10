---
change_id: cost-calibration
title: Kalibracja kosztów rynkowych (S-01)
status: impl_reviewed
created: 2026-06-09
updated: 2026-06-08
archived_at: null
---

## Notes

Roadmap v3 S-01 (north star): zweryfikować i skalibrować stawki w `prisma/seed.ts`, w szczególności ścieżkę **stan deweloperski** (`investment_state: DEVELOPER`). Research: `research.md`.

**Phase 4 (2026-06-08):** `pnpm test:e2e` — 8/8 green (risk-04 golden path OK po kalibracji).

**Archive blocker (impl-review F7):** plan Progress **2.4** + **4.2** muszą być `[x]` przed `/10x-archive` — owner: drop DB → `pnpm db:seed` → golden plan ~599 650 PLN w UI.
