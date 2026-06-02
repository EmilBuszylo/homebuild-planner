# Manual smoke — access control & ownership (Phase 1)

Run once after automated tests land (`pnpm test`). Sign off in the PR or in
`change.md` Notes when done.

Prerequisites: local app running (`pnpm dev`), test accounts or two browsers,
at least one plan with results for the logged-in user.

## Panel and session (Risk #2)

- [ ] **Wylogowany:** otwórz `/panel` → przekierowanie na `/logowanie` (bez treści panelu).
- [ ] **Zalogowany:** otwórz `/panel` → panel się ładuje (bez pętli redirectów).
- [ ] **Zalogowany:** otwórz `/ankieta` → ankieta się ładuje.

## Plan po ID (Risk #1)

- [ ] **Własny plan:** wejdź na `/moj-plan/<twoje-planId>` (z panelu lub po utworzeniu planu) → widać kosztorys i harmonogram (nie sam komunikat błędu).
- [ ] **Cudzy plan (jeśli masz drugie konto):** zaloguj się jako użytkownik A, wklej w pasku adresu `/moj-plan/<planId-użytkownika-B>` → strona błędu lub brak wyników (**nie** pełny cudzy kosztorys).

## API bez sesji (Risk #2)

W DevTools → Network (lub terminal, bez nagłówka `Cookie`):

- [ ] `GET http://localhost:3000/api/plans/<dowolne-uuid>/results` → **401**, body zawiera `"Brak autoryzacji"`.
- [ ] `POST http://localhost:3000/api/plans` z `Content-Type: application/json` i minimalnym JSON → **401**.

## API z sesją — izolacja (Risk #1, opcjonalnie z dwoma kontami)

Zalogowany jako A, w konsoli (zachowaj cookies sesji):

```javascript
fetch("/api/plans/<planId-należący-do-B>/results").then((r) =>
  r.json().then((b) => console.log(r.status, b)),
);
```

- [ ] Status **404**, brak pola `stages` z danymi cudzego planu.

## Notatki

Data / wykonawca / wynik:
