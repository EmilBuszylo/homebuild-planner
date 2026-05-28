---
change_id: rate-limit-enforcement
title: Rate limit enforcement
status: archived
created: 2026-05-28
updated: 2026-05-28
archived_at: 2026-05-28T10:48:19Z
---

## Notes

S-06: limit przeliceń na użytkownika (rate limiting dla generowania i przeliczeń planu), żeby utrzymać koszt operacyjny MVP.

Plan: `context/changes/rate-limit-enforcement/plan.md`

### Ustalona polityka (MVP)

- **Zakres**: limit dotyczy tylko przeliczeń (`POST /api/plans/[planId]/recalculate`), czyli `PlanVersion.versionNumber > 1`.
- **Limit**: max **3** przeliczenia na użytkownika w oknie **24h** (rolling window).
- **Konfiguracja**:
  - `PLAN_RECALC_LIMIT` (domyślnie 3)
  - `PLAN_RECALC_WINDOW_HOURS` (domyślnie 24)

