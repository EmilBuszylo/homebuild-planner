---
date: 2026-05-28T12:00:00+02:00
researcher: Auto
git_commit: e15a3acf5b79ce6d5d56e61d102e4fe521e33760
branch: master
repository: EmilBuszylo/homebuild-planner
topic: "S-08 horizontal timeline with coaching notes — codebase grounding for /10x-plan"
tags: [research, timeline, plan-ui, coaching-notes, construction-stage, s-08]
status: complete
last_updated: 2026-05-28
last_updated_by: Auto
last_updated_note: "Added coaching notes research (user practice + web sources, 7-note set)"
---

# Research: Poziomy harmonogram z notkami praktycznymi (S-08)

**Date**: 2026-05-28  
**Researcher**: Auto  
**Git Commit**: `e15a3acf5b79ce6d5d56e61d102e4fe521e33760`  
**Branch**: master  
**Repository**: EmilBuszylo/homebuild-planner

## Research Question

Co trzeba zmienić w kodzie i danych, żeby zastąpić pionowy `PlanTimeline` poziomą osią czasu z notkami coachingowymi (roadmap S-08, change-id `horizontal-timeline-coaching`), bez nowych funkcji spoza FR-006 / NFR prezentacji?

## Summary

- **UI dziś:** jedyny harmonogram to pionowa lista w `plan-timeline.tsx` (Card + `border-l` + kropki). Strona planu: tabela kosztów **nad** timelineem, `max-w-4xl`, bez poziomego scrolla na timeline.
- **Dane:** `PlanResultsDto` ma `keyDate`, `startDay`, `durationDays`, koszt, `name`, `category` — **bez** opisów ani notek. API `GET /api/plans/[planId]/results` joinuje tylko `name` + `category` z `ConstructionStage`.
- **Seed:** 18 etapów z `description` = zakres prac (nie porady). Harmonogram liczy `scheduleTimeline()` (DAG po `predecessorSlugs`, równoległość możliwa); kolejność w DTO = `sortOrder`, nie data.
- **Rekomendacja:** nowe pole `coachingNote` (nullable) na `ConstructionStage` + rozszerzenie DTO/API/UI; poziomy layout: Tailwind + ewent. `overflow-x-auto` (wzorzec jak `plan-cost-table`), bez biblioteki wykresów. Migracja Prisma — **owner-only** (`lessons.md`).
- **Notki MVP:** naturalne slugi: `foundations`, `windows_doors` (+ opcjonalnie `roof_covering`, `heating`) — zgodnie z roadmapą i przykładem użytkownika.

## Detailed Findings

### Obecny UI harmonogramu

`PlanTimeline` renderuje `results.stages` jako pionowy `<ol>` z datami z `addDaysToIsoDate(results.keyDate, stage.startDay)`:

```27:54:src/components/plan/plan-timeline.tsx
        <ol className="relative space-y-0 border-l border-border pl-6">
          {results.stages.map((stage) => {
            const startLabel = addDaysToIsoDate(
              results.keyDate,
              stage.startDay,
            );
            // ...
                <p className="font-medium">{stage.name}</p>
                <p className="text-muted-foreground text-sm">
                  {startLabel}
                  {stage.durationDays > 0 && (
                    <>
                      {" "}
                      — {endLabel} ({stage.durationDays}{" "}
```

Strona planu składa wyniki w kolumnie:

```54:71:src/app/(app)/plan/[planId]/page.tsx
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-4xl flex-col gap-8 p-6 py-10">
      ...
      <PlanCostTable results={result.data} />
      <PlanTimeline results={result.data} />
```

**Wzorzec poziomego scrolla w projekcie:** `plan-cost-table.tsx` używa `overflow-x-auto` na tabeli — najbliższy gotowy pattern dla S-08. Brak `scroll-area` / `carousel` w `src/components/ui/` (9 komponentów shadcn).

### Kontrakt danych wyników

```1:18:src/lib/plan-results.ts
export type PlanResultsStageDto = {
  stageSlug: string;
  name: string;
  category: string;
  estimatedCost: number;
  startDay: number;
  durationDays: number;
};
```

Route handler buduje stages z `PlanStageResult` + lookup `ConstructionStage` — **tylko** `name`, `category`:

```51:71:src/app/api/plans/[planId]/results/route.ts
  const stageDefs = await prisma.constructionStage.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, name: true, category: true },
  });
  // ...
      startDay: result.startDay,
      durationDays: result.durationDays,
```

Persystencja wersji planu zapisuje timing w `PlanStageResult` — notki nie muszą być duplikowane per plan, jeśli są statyczne w bazie wiedzy.

### Silnik harmonogramu (backend)

`scheduleTimeline()`:

- Sortuje po `sortOrder`.
- `startDay` = max końców poprzedników z `predecessorSlugs` (etapy równoległe, np. `electrical` / `plumbing` po `walls`).
- `durationDays` = średnia z min/max dni.

**Implikacja dla UI poziomego:** oś czasu powinna wizualizować **nakładanie się** etapów (ten sam `startDay`), nie tylko listę w `sortOrder`. Warto sortować do renderu po `(startDay, sortOrder)` lub skalować szerokość proporcjonalnie do `durationDays`.

### Baza wiedzy — etapy i opisy

`ConstructionStage` ma `description String?` — w seedzie wypełnione dla wszystkich 18 etapów jako **zakres robót** (np. fundamenty: wykopy, płyta…).

Przykładowe slugi pod notki coachingowe (roadmap + PRD):

| slug | Zastosowanie notki |
|------|-------------------|
| `foundations` | Wczesne zamówienia okien/drzwi (długi lead time) |
| `windows_doors` | Zamówienie vs montaż, zależność od stanu zamkniętego |
| `roof_covering` | Opcjonalnie: pogoda / sezon |
| `heating` | Opcjonalnie: decyzja o źródle ciepła przed tynkami |

**Nie mieszać** `description` z coachingiem — inna semantyka. Rekomendowane: `coachingNote String?` + seed 3–5 wartości; alternatywa bez migracji: mapa w `src/lib/...` (gorsze dla edycji treści).

### Lessons / architektura (ograniczenia planu)

- Domain data: Prisma + Route Handlers — rozszerzenie API results, nie Supabase client (`lessons.md`).
- Nowa migracja: agent przygotowuje SQL, **owner** uruchamia `pnpm db:migrate`.
- Brak chart library w archiwum `plan-generation` — Tailwind/shadcn wystarczy.

## Code References

- `src/components/plan/plan-timeline.tsx:15-61` — komponent do zastąpienia/przebudowy
- `src/components/plan/plan-cost-table.tsx:48+` — `overflow-x-auto` pattern
- `src/lib/plan-results.ts:1-18` — DTO do rozszerzenia (`coachingNote?`, opcjonalnie `description?`)
- `src/app/api/plans/[planId]/results/route.ts:51-85` — select + mapowanie stages
- `src/lib/plan-generation/schedule-timeline.ts:13-45` — algorytm timing (bez zmian na S-08)
- `src/lib/plan-generation/stage-filter.ts:16+` — które etapy wchodzą do planu
- `prisma/schema.prisma:66-82` — `ConstructionStage` (+ nowe pole)
- `prisma/seed.ts` — tablica `stages` (~linie 180–430) — dodać `coachingNote` dla wybranych slugów
- `src/lib/format/plan-date.ts` — format dat PL dla osi
- `context/foundation/roadmap.md:87-99` — S-08 outcome, unknowns, mobile risk

## Architecture Insights

1. **Warstwy zmiany (minimalny vertical slice):** migracja + seed → API/DTO → `PlanTimeline` (lub nowy `PlanTimelineHorizontal`) → ewentualnie loading skeleton w `loading.tsx`.
2. **Kosztorys:** roadmap domyślnie zostawia tabelę — S-08 nie musi dotykać `PlanCostTable`; opcjonalnie pokazać koszt na kafelku etapu na osi.
3. **Mobile:** poziomy scroll + czytelne karty etapów; na wąskim ekranie rozważyć skróconą oś (tylko nazwa + data startu) z rozwijaną notką.
4. **Dostępność:** oś powinna mieć sens bez wyłącznie wizualnej pozycji (tekst dat, `aria-label` na etapach z notką).
5. **Brak FR-007:** notki systemowe ≠ notatki użytkownika — nie implementować edycji notek w S-08.

## Historical Context (from prior changes)

- `context/foundation/archive/2026-05-28-roadmap-mvp.md` — MVP S-01…S-06 `done`; S-08 jako north star fazy polish.
- `context/archive/2026-05-27-plan-generation/` — pierwotna spec: oś z `key_date` + `startDay`, bez biblioteki wykresów.
- `context/foundation/health-check.md` — brak testów; F-07 (Vitest) równoległy, nie blokuje S-08 research.

## Related Research

- (brak wcześniejszego `research.md` dla tego change-id)

## Coaching notes — research (praktyka + internet)

**Cel:** Notki „umów już X, gdy trwasz Y” — nie definicja etapu (`description`), tylko **wyprzedzenie kolejnych ekip / zamówień**.

**Metoda:** Twoje 5 przykładów + krótki przegląd polskich poradników budowlanych (okna, instalacje, tynki/wylewki). To nie audyt norm — wystarczy spójność z typową kolejnością i z DAG w seedzie (`predecessorSlugs`, równoległe `electrical` / `plumbing` po `walls`).

### Konfrontacja: Twoje hinty vs sieć

| Twój hint (skrót) | Slug w aplikacji | Sieć (skrót) | Werdykt |
|-------------------|------------------|--------------|---------|
| Fundamenty → szukaj wykonawcy okien | `foundations` | Zamówienie okien **z wyprzedzeniem 6–10 tyg.**; decyzję warto podjąć już przy surowym otwartym, często wcześniej planować ([remtor-sd.pl](https://www.remtor-sd.pl/kiedy-zamowic-i-zamontowac-okna-podczas-budowy-domu-by-uniknac-opoznien-i-poprawek/), [wwokna.pl](https://wwokna.pl/kiedy-zamawiac-okna-zeby-nie-rozwalic-sobie-budowy-i-budzetu/)) | **Tak** — nawet wcześniej niż montaż; przy fundamentach = „rezerwuj termin”, nie „mierz otwory”. |
| Zaczynasz ściany → okna i drzwi | `walls` | Po ścianach + dachu można mierzyć; produkcja okien trwa tygodnie ([plastixal.pl](https://plastixal.pl/blog/kiedy-zamawiac-okna-do-domu-jak-dystrybutor-moze-edukowac/)) | **Tak** |
| Elektryka wkrótce → szukaj tynkarza | `electrical` | Instalacje podtynkowe **przed** tynkami; elektryka i hydraulika często równolegle ([murator.pl](https://muratordom.pl/przed-budowa/organizacja-budowy/kiedy-sie-wykonuje-instalacje-przed-czy-po-tynkowaniu-musisz-to-wiedziec-aa-injB-7Vvw-sBHv.html), [klejdotapet.pl](https://klejdotapet.pl/kolejnosc-wykonywania-instalacji-w-domu-kompletny-przewodnik-dla-inwestora/)) | **Tak** — rezerwacja tynkarza przed końcem bruzd |
| Dach / ściany działowe → elektryk i hydraulik | `roof_covering` | Po zamknięciu obrysu (dach + okna) sensowne instalacje wewnętrzne; stan zamknięty przed mokrymi pracami ([e-nabudowie.pl](https://e-nabudowie.pl/budowa-domu-kiedy-okna)) | **Tak** — w seedzie brak osobnego etapu „ścianki działowe”; notka przy domykaniu obrysu |
| Elektryka skończona, hydraulika start → wylewka | `plumbing` | Wylewki po instalacjach i często po tynkach; u nas `floor_screeds` po `interior_plaster` + `heating` — wyprzedzenie ekipy wylewkowej przy trwających instalacjach jest **praktyczne** ([domoweklimaty.pl](https://www.domoweklimaty.pl/czytelnia/kolejnosc-prac-wykonczeniowych-od-stanu-surowego-7-najwazniejszych-etapow/)) | **Tak** z dopiskiem „po zamknięciu instalacji w ścianach” |

### Zestaw rekomendowany na v1 (7 notek)

Notka pokazuje się na **karcie etapu na timelineie** (gdy etap jest w planie użytkownika). Ton: 2–3 zdania, „warto już…”, bez obietnic cen/terminów.

| # | slug | coachingNote (PL — do seeda) | Skąd |
|---|------|------------------------------|------|
| 1 | `foundations` | Trwają fundamenty — to dobry moment, żeby **porozmawiać z producentem okien i drzwi** (wybór, wstępna wycena). Produkcja często trwa **kilka–kilkanaście tygodni** — im wcześniej złożysz zamówienie, tym mniejsze ryzyko przestoju po dachu. | User + [wwokna.pl](https://wwokna.pl/kiedy-zamawiac-okna-zeby-nie-rozwalic-sobie-budowy-i-budzetu/) |
| 2 | `walls` | Wchodzisz w murowanie — **jeśli nie masz jeszcze zamówionych okien i drzwi**, zrób to teraz. Po wykonaniu otworów i dachu będzie można zmierzyć, ale kolejka u producenta i tak liczy się od dziś. | User + poradniki okienne |
| 3 | `roof_covering` | Dach i obrys budynku są na finiszu — **warto już umawiać elektryka i hydraulika** (bruzdy, podejścia). Dobre ekipy instalacyjne mają obłożenie kilka–kilkanaście tygodni do przodu. | User (dach + działówki) + domknięcie obrysu |
| 4 | `windows_doors` | Etap montażu stolarki — **jeśli okna nie są jeszcze w produkcji**, może być za późno bez opóźnienia kolejnych prac. Montaż zwykle po suchych ścianach i gotowym dachu, **przed** tynkami wewnątrz. | Sieć + domknięcie stanu |
| 5 | `electrical` | Zaraz startują (lub trwają) prace elektryczne podtynkowe — **poszukaj ekipy tynkarskiej** na termin po zakończeniu bruzd. Tynki przed instalacjami w ścianach to najczęstszy powód drogich poprawek. | User + [murator.pl](https://muratordom.pl/przed-budowa/organizacja-budowy/kiedy-sie-wykonuje-instalacje-przed-czy-po-tynkowaniu-musisz-to-wiedziec-aa-injB-7Vvw-sBHv.html) |
| 6 | `plumbing` | Hydraulika startuje równolegle z elektryką — **warto już pytać o wylewki** (termin po tynkach i ogrzewaniu w Twoim harmonogramie). Ekipy od jastrychu też bywają zarezerwowane z wyprzedzeniem. | User + kolejność w seedzie |
| 7 | `interior_plaster` | Przed tynkami upewnij się, że **instalacje w ścianach są domknięte** (przewody, puszki, podejścia). Po tynkach zaczynają się prace mokre na podłodze — bez sensu kucać świeże ściany. | Sieć (instalacje → tynk → wylewka) |

**Poza v1 (opcjonalnie później):** `heating` (decyzja o źródle ciepła przed wylewką), `floor_screeds` (schnięcie wylewki).

### Otwarte po tym researchu

- **Copy:** Zaakceptuj lub popraw 7 tekstów przed seedem (język „na Ty”).
- **Kolejność na osi / reszta planu** — bez zmian (patrz wcześniejsze ustalenia w `plan.md`).
