# Manual smoke — questionnaire hot-spot (Phase 3)

Run once after automated tests land (`pnpm test`). Sign off in the PR or in
`change.md` Notes when done.

Prerequisites: local app (`pnpm dev`), logged-in user. For edit-mode checks,
an existing plan with saved questionnaire answers.

## Step 1 — state filtering and auto-correct (Risk #6, `lessons.md`)

- [ ] **Start „Od zera”:** w kroku 1 wybierz start *Od zera (działka)* → w stanie docelowym widać tylko etapy **po** starcie (np. *Stan deweloperski*); nie ma *Od zera* jako celu.
- [ ] **Happy path:** start *Od zera*, cel *Stan deweloperski* → przejdź kroki 2–3, podsumowanie → **Zatwierdź** → plan z etapami i kosztami (nie pusty komunikat „brak wyników” od razu po sukcesie).
- [ ] **Niemożliwa para w UI:** ustaw start *Stan surowy zamknięty* → w celu **nie** da się wybrać *Stan surowy otwarty* ani wcześniejszych (opcje odfiltrowane).
- [ ] **Auto-korekta celu:** wybierz start *Fundamenty gotowe*, potem ręcznie ustaw cel na wcześniejszy etap jeśli UI na chwilę pozwoli — po zmianie startu cel powinien skorygować się do pierwszego dozwolonego (bez wiszącego błędu na kroku 1).
- [ ] **Ten sam enum, różne etykiety:** upewnij się, że nie da się ustawić pary, gdzie oba pola pokazują „fundamenty” w różnym znaczeniu (start ≠ cel przy tej samej wartości enum — reguła *strict `<`*).

## Edit mode (stored answers)

- [ ] **Edycja planu:** z `/moj-plan/<planId>` wejdź w edycję ankiety → pola kroku 1 są spójne (start < cel); **Przelicz ponownie** kończy się sukcesem (200/redirect), wynik planu się odświeża.

## API — invalid body (Risk #6, complements automated tests)

Zalogowany, DevTools → Network lub konsola z cookies:

```javascript
fetch("/api/plans/<twoje-planId>/recalculate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    investment_state: "FOUNDATIONS",
    starting_state: "CLOSED_SHELL",
    build_standard: "STANDARD",
    insulation_level: "STANDARD",
    area: 120,
    key_date: "2026-09-01",
    floors: 2,
    window_count: 12,
    exterior_door_count: 2,
  }),
}).then((r) => r.json().then((b) => console.log(r.status, b)));
```

- [ ] Status **400**, `error`: *Nieprawidłowe dane ankiety*, pole `details` obecne.

## Notatki

Data / wykonawca / wynik:
