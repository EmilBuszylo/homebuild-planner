# Calendar Export (S-04) — Plan Brief

> Full plan: `context/changes/calendar-export/plan.md`
> Research: — (plan grounded in roadmap + codebase exploration)

## What & Why

Użytkownik planujący budowę chce mieć etapy harmonogramu w swoim kalendarzu — żeby koordynować terminy z wykonawcami i codziennym życiem. FR-010 (nice-to-have) domyka roadmapę v3: po kalibracji, ankiecie, notatkach i harmonogramie zostaje eksport do **Google Calendar** przez OAuth.

## Starting Point

Strona `/moj-plan/:id` pokazuje harmonogram z datami wyliczonymi z `keyDate` + `startDay`/`durationDays`. API `GET .../results` zwraca pełny DTO. **Brak** integracji Google, tabel tokenów, biblioteki `googleapis`. Logowanie to wyłącznie Supabase email/password.

## Desired End State

Użytkownik jednorazowo łączy konto Google (osobno od logowania do aplikacji), wybiera etapy harmonogramu i tworzy wydarzenia all-day w kalendarzu **primary**. Rozłączenie usuwa credential z bazy. Vitest pokrywa ownership i happy path z mockiem Google API.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Protokół | Google Calendar API (OAuth) | Zgodne z decyzją ownera i FR-010 „external calendar service” | Roadmap |
| Kalendarz docelowy | `primary` | Najprostszy MVP; wybór z listy API → później | Plan |
| Wybór etapów | Dialog checkboxów; domyślnie wszystkie | Spełnia FR-010 „selected or all” bez osobnego slice’a | Plan |
| Tokeny | Prisma 1:1 User, szyfrowane at rest | Zgodne z lessons.md — domena w Prisma, nie Supabase | Plan |
| Ponowny export | Zawsze nowe wydarzenia | Unika skomplikowanego dedup / `googleEventId` w MVP | Plan |
| iCal `.ics` | Out of scope | Roadmap Parked jako fallback bez OAuth | Roadmap |

## Scope

**In scope:** `GoogleCalendarCredential` schema, OAuth authorize/callback/status/disconnect, `POST .../calendar-export`, UI w `PlanTimeline`, Vitest, opcjonalny E2E risk-08 (przycisk widoczny).

**Out of scope:** iCal download, Google Sign-In (FR-011), wybór kalendarza z listy, auto-sync przy recalculate, deduplikacja wydarzeń, pełny OAuth E2E w CI.

## Architecture / Approach

```
PlanTimeline UI → POST /api/plans/:id/calendar-export
                      ↓ (ownership + slug validation)
              export-stages-to-google-calendar
                      ↓ (refresh token if needed)
              googleapis calendar.events.insert → primary

Pierwsze użycie: GET /api/integrations/google/authorize → Google consent
                  → GET .../callback → encrypt & save credential → redirect plan
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Schema | `GoogleCalendarCredential` + env docs | Owner migrate + Google Cloud setup |
| 2. OAuth | Connect / disconnect / token refresh | Redirect URI mismatch localhost vs Vercel |
| 3. Export API | POST calendar-export + event builder | All-day date edge cases (DST) |
| 4. UI | Dialog wyboru etapów w harmonogramie | OAuth UX (return query param) |
| 5. Tests | Vitest + build:ci + risk-08 | Mock googleapis surface |

**Prerequisites:** F-01 done; owner: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, encryption key, Google Cloud OAuth client.
**Estimated effort:** ~3–4 sesje after-hours (5 faz, OAuth + external setup).

## Open Risks & Assumptions

- Google OAuth consent screen w trybie **Testing** ogranicza liczbę testowych użytkowników — owner musi dodać swoje konto.
- Produkcja może wymagać weryfikacji Google (jeśli app „External” i szeroki dostęp).
- Ponowny export tworzy duplikaty — użytkownik musi ręcznie usuwać stare wydarzenia w Google Calendar.

## Success Criteria (Summary)

- Połączenie Google Calendar działa lokalnie i na Vercel (z poprawnym redirect URI).
- Export wybranych etapów tworzy wydarzenia all-day z datami zgodnymi z harmonogramem.
- IDOR i brak credential zwracają 404 / 412; `pnpm test` i `pnpm build:ci` zielone.
