---
change_id: mvp-polish-finish
title: MVP polish capstone
status: archived
created: 2026-06-01
updated: 2026-06-01
archived_at: 2026-06-01T10:53:08Z
---

## Notes

### Phase 5 automated (2026-05-28)

- `pnpm lint` — OK
- `pnpm test` — 7 tests passed (Vitest 3.2.4)
- `pnpm build:ci` — OK (Next.js 16.2.6)

### Code-level capstone checks (agent; owner browser pass still required for 5.4)

| Check | Status |
| --- | --- |
| Shared copy (`orientational.ts`, `site.ts`) wired on landing, panel, ankieta, plan | OK |
| `OrientationalDisclaimer` on questionnaire summary + plan (single full paragraph) | OK |
| Plan page: no duplicate subtitle disclaimer; cost table has short footer only | OK |
| `KPI_LABELS` on `plan-snapshot-card` and `plan-summary-strip` | OK |
| Polish `PAGE_METADATA` on `/`, auth, `/panel`, `/ankieta`, plan | OK |
| `signOut` → `routes.login` (`/logowanie`) | OK |
| Banned strings (`Zarejestruj`, `wstępny plan`, `cache bazy`) absent from `src/` | OK |
| Mobile: `AppPageShell` `px-4 sm:px-6`, questionnaire step nav full-width buttons | OK (code) |

### Owner manual (mark plan 2.4–5.4 after browser pass)

1. Landing → rejestracja → ankieta (summary disclaimer) → plan — orientacyjny ton
2. Plan: ≤1 full disclaimer paragraph + short table footer
3. Dashboard snapshot vs plan strip — same KPI labels
4. Mobile ~375px: panel, ankieta, plan usable
5. Tab titles PL; wyloguj → `/logowanie`
6. No English UI strings on happy path
