---
change_id: questionnaire-hints
title: Questionnaire hints
status: implemented
updated: 2026-05-29
archived_at: null
---

## Notes

Roadmap **S-07**. Outcome: hint przy pytaniach ankiety + podsumowanie; copy **front-only** (`src/lib/questionnaire/hints/`) pod przyszłe tłumaczenia (FR-003, FR-004).

**Dostarczone (2026-05-29):**
- Mapa 13 hintów PL + hinty opcji (`investment_state`, `starting_state`, `build_standard`, `insulation_level`) w `src/lib/questionnaire/hints/pl.ts`
- UI: ikonka `i` + tooltip przy pytaniu; opcje SINGLE_CHOICE — podkreślenie + tooltip, instrukcja, podgląd wybranej opcji; podsumowanie — jeden tooltip łączący pytanie i wybór
- `TooltipProvider` w `questionnaire-form.tsx`

**Odłożone (roadmap v3 / sesje z użytkownikami):** dalsze dopracowanie discoverability, copy, mobile (tap vs hover), ewentualne uproszczenie panelu podglądu wybranej opcji.

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->
