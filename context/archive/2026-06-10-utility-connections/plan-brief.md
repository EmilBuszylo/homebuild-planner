# Utility Connections (S-05) — Plan Brief

> Full plan: `context/changes/utility-connections/plan.md`
> Research: `context/changes/utility-connections/research.md`

## What & Why

Użytkownik wskazuje sposób odprowadzenia ścieków i źródło wody oraz odległość od sieci — i widzi **osobne pozycje kosztorysu** za przyłącza zewnętrzne, oddzielone od wewnętrznej instalacji wod-kan (`plumbing`, S-01). Bez tego kosztorys miesza roboty w budynku z pracami na działce i zaniża/zawyża wiarygodność SDW.

## Starting Point

S-01 skalibrował 18 etapów i obniżył `plumbing` (−10%) jako instalację wewnętrzną; golden **599 650 PLN** nie zawiera przyłączy. Engine obsługuje flat modifiers (`garage_gate`); ankieta ma 3 kroki + podsumowanie, bez pytań o media zewnętrzne.

## Desired End State

Ankieta ma krok „Przyłącza mediów” (ścieki, woda, odległość). Kosztorys pokazuje `sewage_connection` i `water_connection` jako osobne wiersze z flat PLN z workbooku. Golden payload (MUNICIPAL/MUNICIPAL/≤50 m) daje ~**619 650 PLN**. CI zielone.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Scope | **B — full utilities** | Ścieki + woda + distance band w jednym vertical slice | User / Plan |
| Schema | **Seed-only (Path A)** | Zgodne z S-01 i lessons; KV responses bez migracji | Research |
| Cost model | **Flat modifiers, base 0** | Przyłącza to ryczałty, nie PLN/m² — wzorzec `garage_gate` | Research |
| Distance band | **Add-on flat, gated** | Osobne modyfikatory + `isModifierActive` — unika błędnego add-onu przy szambo/studni | Plan |
| Ankieta UX | **Nowy krok 3** | Czytelny blok „Przyłącza mediów”; distance warunkowe w UI | Plan |
| Timeline | **sortOrder 1–2, renumber +2** | Przyłącza na początku harmonogramu (prace ziemne) | Research / Plan |
| Golden default | MUNICIPAL + MUNICIPAL + UP_TO_50M | Typowy dom podłączony do sieci blisko granicy | Plan |
| Prisma enums | **Tylko Zod** | Wartości w seed JSON; bez owner `db:migrate` | Research |

## Scope

**In scope:** `sewage_disposal`, `water_supply`, `utility_distance_band`; etapy `sewage_connection`, `water_connection`; workbook `utility-rates.md`; seed + ankieta + `stage-filter` + `compute-costs` gating; testy 20-etapowe + E2E.

**Out of scope:** opłaty administracyjne gminy, eksploatacja, odpowietrzenie (S-05b), zmiana stawek `plumbing`, migracja schema, recalc starych planów.

## Architecture / Approach

```
Ankieta (3 nowe pola) → API Zod refine (distance iff MUNICIPAL)
  → persist KV responses → filterStages (hide water if NONE)
  → computeStageCost (flat per disposal/supply + gated distance add-on)
  → PlanStageResult (+2 wiersze)
```

Dane w `prisma/seed.ts` (pytania, etapy, modyfikatory). Engine: minimalna zmiana `compute-costs.ts` + `stage-filter.ts`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Workbook | `utility-rates.md` + golden sanity | Złe flat PLN → błędny oracle |
| 2. Ankieta | Krok UI + Zod + seed pytań | Cross-field refine vs RHF lesson |
| 3. Seed + engine | 20 etapów, modyfikatory, gating | sortOrder renumber psuje DAG |
| 4. Testy | Oracle 619k, stage-filter, parity | Fixture drift od seed |
| 5. E2E | risk-04 + owner smoke | Owner seed przed manual |

**Prerequisites:** S-01 archived; lokalny DB + Supabase jak w dev  
**Estimated effort:** ~3–4 sesje after-hours, 5 faz

## Open Risks & Assumptions

- Renumeracja `sortOrder` wymaga spójnego seed + fixture — parity test łapie drift.
- Użytkownicy z istniejącymi planami muszą przejść ankieta ponownie przy recalculate.
- Widełki rynkowe są ogólnopolskie; bez opłat urzędowych (świadomie).

## Success Criteria (Summary)

- Osobne linie kosztorysu za przyłącze ścieków i wody przy scope B payload.
- Golden total ~619 650 PLN (Std, 120 m², DEVELOPER).
- `pnpm test`, `pnpm test:e2e`, `pnpm build:ci` zielone po implementacji.
