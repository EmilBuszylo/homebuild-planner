# Opportunity Map

## Context

- **Project / context:** home-build-planner (MVP solo) — sesja robocza 2026-06-13: ankieta, wyniki planu, timeline/notatki, dokumentacja architektury (moduł 4 / 10xArchitect)
- **Data constraint:** mock / lokalne / read-only / niewrażliwe
- **Date:** 2026-06-13

## Map

| Signal | Existing / default response | Thin complement | First useful version | Data risk | Direction if valuable |
|---|---|---|---|---|---|
| Pola liczbowe ankiety: „-”, puste pole, czerwona walidacja w trakcie wpisywania | Zod + RHF + `type="number"`; limity tylko w schema | Wzorzec `NumberFieldInput`: draft przy focus, `min`/`max` z seed, blokada scroll | **Zrobione w sesji** — regresja: krótki Vitest + manual smoke kroków 2–3 | mock | Feature (ankieta) — utrwalić w checklist QA |
| Niejasny zakres planu (brak fundamentów mimo „deweloperskiego”) | Hinty przy stanach; domyślne wartości formularza | Etykieta **Zakres planu** na wynikach + kolejność pól start→cel | **Częściowo zrobione** — brak podglądu *przed* submit | mock | Feature — podgląd liczby etapów na podsumowaniu |
| Sukces ankiety (201) → strona planu bez etapów / błąd 404 | GET results odrzuca pusty wynik *po fakcie*; INV-GEN-01 udokumentowany, nieegzekwowany | Klient liczy etapy (`filterStages`) na kroku podsumowania; ostrzeżenie jeśli 0 | Podsumowanie: „Plan obejmie **N** etapów” + blokada submit przy N=0 (read-only, bez zmian API) | mock / lokalny katalog etapów | Feature — potem strażnik serwerowy INV-GEN-01 |
| Gwiazdka / pin na timeline — efekt niewidoczny | `isPinned` + cienki border; aria-label | Tooltip + wyraźniejsze wyróżnienie wiersza | Ikona gwiazdki (sesja); opcjonalnie tooltip „Ważny etap” | non-sensitive | Feature (FR-007) — polish UX |
| Dług strukturalny: DTO drift, dual read RSC/API, Prisma w UI | Dokumenty C1–C4, plan refactor-opportunities; depcruise lokalnie | Skrypt „health”: grep assemblera, lista plików z `@prisma/client` poza infra | Jednorazowy raport markdown z `pnpm depcruise` + checklist C1 | read-only repo | Internal tool / CI gate — po walidacji wartości |
| Rozjazd dokumentacja (context/domain) vs kod produkcyjny | AGENTS.md, plany domenowe, architect-report | Etykieta „zaimplementowane / plan / idea” w change.md | Tabela statusu 5 planów z sesji vs grep w `src/` | read-only | Wait / proces — nie budować nowego produktu |

## Recommended First Candidate

```text
Candidate:
Podgląd zakresu planu przed zatwierdzeniem ankiety („ile etapów”)

Reads:
- Bieżące odpowiedzi formularza (starting_state, investment_state, garage_spots, water_supply)
- Statyczny snapshot katalogu etapów (export z seed / fixtures — bez DB w v0)

Returns:
- Na kroku podsumowania: linia „Plan obejmie ok. N etapów” + ostrzeżenie PL gdy N=0
- Przy N=0: wyłączony „Zatwierdź” / komunikat zamiast redirectu na pusty plan

Does not do:
- Zmiana persist / API / freeze-on-write
- Pełny refaktor INV-GEN-01 po stronie serwera
- Merge widoków koszt/timeline
- Wymiana Prisma / ACL

Data risk:
mock / lokalne — katalog etapów z fixtures (`full-stages-calibration` lub wycinek seed); brak PII

Direction if it proves valuable:
Feature w home-build-planner → następnie serwerowy strażnik INV-GEN-01 (plan domenowy 02-invariant-aggregate-refactor.md)
```

## Why This Candidate

1. **Powtarza się** — każdy nowy użytkownik przechodzi ankietę; puste lub wąskie plany psują zaufanie (sesja: „brak fundamentów”, później okazało się kolejnością pól; INV-GEN-01 to ten sam wzorzec na poziomie API).
2. **Łączy źródła** — odpowiedzi ankiety + reguły `filterStages` + oczekiwania z hintów PL + wynik GET/UI.
3. **Czytelny ból manualny** — redirect sukcesu, potem „brak wyników” / pusty kosztorys.
4. **Testowalne read-only** — Vitest na `filterStages` + jeden test UI podsumowania; bez migracji DB.
5. **Nie zastępuje platformy** — uzupełnia istniejący formularz; `planScopeLabel` na stronie planu zostaje jako potwierdzenie po submit.
6. **Kierunek jasny** — jeśli podgląd ratuje konwersję, warto domknąć invariant po stronie `persist-plan-version` (już opisane w L5).

**Dlaczego nie inne sygnały teraz:**

- Pola liczbowe — **już naprawione** w sesji; wystarczy regresja, nie nowy produkt.
- Refactor C1–C4 — wysoka wartość dla maintainera, ale **nie adresuje** bezpośrednio bólu użytkownika z tej sesji; lepiej po Mom Test / gdy podgląd etapów potwierdzi problem produktowy.
- Depcruise/health script — dobry **drugi** kandydat dla agentów CI, nie pierwszy dla użytkownika.
- Dokumentacja vs kod — procesowe; **Wait** do czasu priorytetyzacji implementacji planów.

## Next Direction If Valuable

**Wybrany następny krok:** Validate → `/10x-mom-test` → `/10x-shape` → `/10x-prd` → `/10x-roadmap`

**Mom Test (propozycja pytań):**

- „Kiedy ostatnio wyszedłeś z ankiety i plan wyglądał inaczej niż oczekiwałeś — co zrobiłeś?”
- „Czy przed kliknięciem Zatwierdź sprawdzałeś stan startowy vs docelowy? Gdzie?”
- „Czy komunikat «brak wyników» po sukcesie ankiety zdarzył się u Ciebie / testerów?”

Jeśli odpowiedzi potwierdzą **zaskoczenie zakresem** lub **pusty plan po sukcesie** → shape jako feature „podgląd N etapów + guard submit”. Jeśli problem był jednorazowy (pomyłka kolejności pól, już poprawiona) → **Wait** na implementację serwerowego guarda bez rozbudowy UI.

**Nie uruchamiać w tej sesji:** `/10x-implement` ani pełnego INV-GEN-01 — dopiero po walidacji.

## Sources (sesja)

- `context/architect-report.md`, `context/domain/02-invariant-aggregate-refactor.md` (INV-GEN-01)
- `context/changes/refactor-opportunities/research.md` (C1–C4)
- Doświadczenie użytkownika: stan deweloperski bez etapów; pola liczbowe „-”; niezrozumiała pinezka (→ gwiazdka)
- Poprawki sesji: `planScopeLabel`, domyślny DEVELOPER, `parse-number-input.ts`, ikona Star
