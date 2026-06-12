# Calendar Export (S-04) Implementation Plan

## Overview

Zrealizować **FR-010** — eksport etapów harmonogramu planu do **Google Calendar** przez OAuth 2.0 i Calendar API (`calendar.events`). Użytkownik łączy konto Google (osobno od logowania Supabase), wybiera etapy (domyślnie wszystkie) i tworzy wydarzenia all-day na podstawie `keyDate` + `startDay` / `durationDays`. Ostatni slice roadmapy v3.

## Current State Analysis

- **Plan page** (`src/app/(app)/plan/[planId]/page.tsx`): RSC → `fetchPlanResults` → `PlanTimeline` z pełnym `PlanResultsDto`.
- **`PlanResultsDto`** (`src/lib/plan-results.ts`): `keyDate`, `stages[]` (`stageSlug`, `name`, `startDay`, `durationDays`), `stageNotes` — wystarcza do budowy wydarzeń.
- **Daty etapów:** `dateFromKeyAndOffset` w `src/lib/format/plan-date.ts` (prywatna) — dzień 0 = `keyDate`; koniec wyłączny = `startDay + durationDays` (jak `formatStageRange` w `plan-timeline.tsx`).
- **Auth:** Supabase email/password tylko (`src/app/(auth)/actions.ts`); **brak** Google OAuth, `googleapis`, tabel tokenów.
- **Wzorzec API:** `GET /api/plans/[planId]/results` — `getUser()` → ownership `plan.userId` → Prisma (`lessons.md`).
- **Middleware:** chroni `/moj-plan`, `/panel` itd.; **`/api/*` nie jest na liście** — callback OAuth działa bez redirectu na login (sesja Supabase nadal wymagana przy starcie OAuth).
- **Roadmap (locked 2026-06-11):** Google Calendar API, nie iCal w tym slice.

### Key Discoveries:

- Integracja Google to **OAuth integracyjny**, nie FR-011 (logowanie Google — Parked).
- Tokeny **w Prisma** na `User`, nie w Supabase (`lessons.md`).
- Agent edytuje tylko `schema.prisma`; **stop** po Phase 1 do owner `pnpm db:migrate`.
- Brak wzorca szyfrowania secretów w DB — trzeba dodać helper AES-256-GCM + `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- E2E z prawdziwym Google OAuth w CI jest nierealistyczne — Vitest z mockiem `googleapis`; E2E cienki (UI disconnected) + manual smoke z kontem Google.

## Desired End State

1. Model `GoogleCalendarCredential` (1:1 z `User`) — zaszyfrowany `refreshToken`, `accessToken`, `expiresAt`.
2. OAuth: połączenie / rozłączenie Google Calendar; status `connected` dla UI.
3. `POST /api/plans/[planId]/calendar-export` — tworzy wydarzenia all-day w kalendarzu **primary** użytkownika; body: opcjonalna lista `stageSlugs` (pusta = wszystkie etapy bieżącej wersji).
4. UI w `PlanTimeline`: CTA „Eksportuj do Google Calendar” + dialog wyboru etapów; stan „Połącz konto Google” gdy brak credential.
5. Vitest: 401/404 ownership, 400 invalid slug, 412 not connected, happy path z mockiem Google API.
6. `pnpm test`, `pnpm lint`, `pnpm build:ci` zielone; owner: manual smoke z Google Cloud OAuth + export 2+ etapów.

## What We're NOT Doing

- Pobieranie pliku **iCal (.ics)** — Parked w roadmapie jako fallback.
- **Google Sign-In** (FR-011) — osobny OAuth, nie mieszać z Supabase Auth.
- Wybór kalendarza docelowego z listy API — MVP: tylko **`primary`**.
- Idempotentny upsert / deduplikacja wydarzeń przy ponownym eksporcie — każdy export **tworzy nowe** wydarzenia (komunikat PL ostrzega przed duplikatami).
- Zapisywanie `googleEventId` per etap w DB.
- Eksport z dashboardu / kosztorysu — tylko harmonogram (jak S-03).
- Automatyczna synchronizacja przy recalculate — jednorazowy export na żądanie.
- E2E pełnego OAuth w CI (wymaga sekretów Google testowych).

## Implementation Approach

1. **Schema** — credential per user; owner migrate.
2. **OAuth + crypto** — authorize/callback/status/disconnect; `googleapis` OAuth2 client.
3. **Export API** — walidacja slugów, builder wydarzeń, batch `events.insert`.
4. **UI** — `CalendarExportControls` w nagłówku `PlanTimeline`.
5. **Testy** — handler tests + opcjonalny cienki E2E UI.

## Critical Implementation Details

OAuth `state` musi być **podpisany** (HMAC z `GOOGLE_TOKEN_ENCRYPTION_KEY` lub osobnym `GOOGLE_OAUTH_STATE_SECRET`) i zawierać `userId` + `returnPlanId` + nonce — callback weryfikuje podpis zanim zapisze tokeny. Redirect URI: `{origin}/api/integrations/google/callback` gdzie `origin` = `VERCEL_URL` / `NEXT_PUBLIC_SITE_URL` / `http://localhost:3000` (ten sam wzorzec co `fetch-plan-results.ts`).

Wydarzenia Google Calendar **all-day**: `start.date` = `YYYY-MM-DD` dla `keyDate + startDay`; `end.date` = `YYYY-MM-DD` dla `keyDate + startDay + durationDays` (wyłączny koniec, zgodny z UI). Gdy `durationDays <= 0`: wydarzenie jednodniowe (`end.date` = następny dzień po `start` per Google all-day rules).

### Decyzje zamknięte (roadmap + plan)

| # | Decyzja | Wybór |
|---|---------|-------|
| 1 | Protokół | **Google Calendar API** (OAuth 2.0, scope `calendar.events`) |
| 2 | Kalendarz docelowy | **`primary`** |
| 3 | Wybór etapów | Dialog z checkboxami; domyślnie **wszystkie**; API przyjmuje `stageSlugs[]` |
| 4 | Persystencja tokenów | **Prisma** `GoogleCalendarCredential` 1:1 `User`; refresh token **szyfrowany** at rest |
| 5 | Ponowny export | **Nowe wydarzenia** za każdym razem (bez deduplikacji) |
| 6 | Opis wydarzenia | Nazwa etapu + orientacyjny koszt + notatka użytkownika (jeśli jest) + krótka stopka disclaimera |
| 7 | Biblioteka | **`googleapis`** (oficjalny SDK Node) |

## Phase 1: Schema Prisma (`GoogleCalendarCredential`)

### Overview

Tabela credential pod OAuth Google Calendar; zatrzymać do owner migrate.

### Changes Required:

#### 1. Prisma schema

**File**: `prisma/schema.prisma`

**Intent**: Model `GoogleCalendarCredential` z relacją `User` (1:1, `userId` unique); pola na zaszyfrowane tokeny i `expiresAt`.

**Contract**: `onDelete: Cascade` z `User`; `@@index([userId])`; FK pod relacją (`lessons.md`). Pola: `accessTokenEnc`, `refreshTokenEnc` (String), `expiresAt` (DateTime), `scope` (String).

#### 2. Env documentation

**File**: `.env.example`

**Intent**: Sekcja Google Calendar (server-only): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_ENCRYPTION_KEY` (32 bajty, base64); komentarz o redirect URI w Google Cloud Console.

### Success Criteria:

#### Automated Verification:

- `pnpm db:generate` passes

#### Manual Verification:

- Owner: `pnpm db:migrate` applies cleanly
- Owner: Google Cloud OAuth client created; redirect URI `http://localhost:3000/api/integrations/google/callback` (+ Vercel URL po deploy)

**Implementation Note**: Agent **STOP** po Phase 1 do potwierdzenia ownera. **Nie** tworzyć plików w `prisma/migrations/`.

---

## Phase 2: OAuth Google Calendar

### Overview

Flow połączenia konta Google: authorize → callback → zapis credential; status i disconnect.

### Changes Required:

#### 1. Token encryption helpers

**File**: `src/lib/google-calendar/encrypt-token.ts` (new)

**Intent**: `encryptToken(plain)` / `decryptToken(cipher)` — AES-256-GCM, klucz z `GOOGLE_TOKEN_ENCRYPTION_KEY`; fail fast gdy env brak w runtime export/OAuth.

#### 2. OAuth client factory

**File**: `src/lib/google-calendar/google-oauth.ts` (new)

**Intent**: Budowa `google.auth.OAuth2` z env; `getGoogleCalendarClient(userId)` ładuje credential z DB, odświeża access token gdy wygasł, zapisuje nowy access token.

#### 3. Signed OAuth state

**File**: `src/lib/google-calendar/oauth-state.ts` (new)

**Intent**: `createOAuthState({ userId, returnPlanId })` / `verifyOAuthState(token)` — HMAC-signed payload, max age 10 min.

#### 4. Authorize route

**File**: `src/app/api/integrations/google/authorize/route.ts` (new)

**Intent**: `GET`: auth Supabase → redirect URL Google z scope `calendar.events` + signed `state` (`returnPlanId` z query `?planId=`).

#### 5. Callback route

**File**: `src/app/api/integrations/google/callback/route.ts` (new)

**Intent**: `GET`: weryfikacja `state`, exchange `code` → tokeny, upsert `GoogleCalendarCredential`, redirect na `routes.plan(returnPlanId)` z query `?googleCalendar=connected`.

#### 6. Status + disconnect routes

**Files**: `src/app/api/integrations/google/status/route.ts`, `.../disconnect/route.ts` (new)

**Intent**: `GET status` → `{ connected: boolean }`; `POST disconnect` → usuń credential (auth required).

#### 7. Dependency

**File**: `package.json`

**Intent**: Dodać `googleapis` przez `pnpm add googleapis`.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm typecheck` passes

#### Manual Verification:

- Owner: klik „Połącz z Google” (po Phase 4 UI lub curl) → consent Google → powrót na plan z `connected`
- Owner: `GET /api/integrations/google/status` zwraca `{ connected: true }` po połączeniu

**Implementation Note**: Wymaga owner `pnpm db:migrate` z Phase 1 + skonfigurowanych env Google.

---

## Phase 3: Export API i builder wydarzeń

### Overview

Endpoint tworzący wydarzenia Calendar z etapów planu.

### Changes Required:

#### 1. Stage date → Calendar event builder

**File**: `src/lib/google-calendar/build-stage-events.ts` (new)

**Intent**: `buildGoogleCalendarEvents({ keyDate, stages, stageNotes, stageSlugs })` → tablica `{ summary, description, start, end }` all-day; eksportować helper dat ISO z logiki `dateFromKeyAndOffset`.

**File**: `src/lib/format/plan-date.ts`

**Intent**: Wyeksportować `isoDateFromKeyAndOffset(keyDate, dayOffset): string` (`YYYY-MM-DD`) do użycia server-side.

#### 2. Export orchestration

**File**: `src/lib/google-calendar/export-stages-to-calendar.ts` (new)

**Intent**: `exportStagesToGoogleCalendar({ userId, planId, stageSlugs? })` — assert plan owner, load stages z latest version, walidacja slugów, `calendar.events.insert` na `primary` dla każdego etapu; zwraca `{ createdCount, calendarId: 'primary' }`.

#### 3. Zod validation

**File**: `src/lib/validations/calendar-export.ts` (new)

**Intent**: `calendarExportSchema` — `stageSlugs: z.array(z.string().min(1)).optional()` (brak = wszystkie).

#### 4. POST route

**File**: `src/app/api/plans/[planId]/calendar-export/route.ts` (new)

**Intent**: `POST`: auth → ownership → parse body → sprawdź credential (412 gdy brak) → export → JSON `{ createdCount }`.

**Contract**: 401 / 404 / 400 (invalid slug) / 412 (not connected) / 500; 200 z `{ createdCount, calendarId }`.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm typecheck` passes

#### Manual Verification:

- — (testy w Phase 5)

---

## Phase 4: UI harmonogramu

### Overview

Kontrolki eksportu w `PlanTimeline`; polski copy; flow połączenia Google.

### Changes Required:

#### 1. Calendar export controls

**File**: `src/components/plan/calendar-export-controls.tsx` (new, client)

**Intent**: Przycisk w nagłówku karty harmonogramu; jeśli `!connected` → link do `/api/integrations/google/authorize?planId=`; jeśli `connected` → dialog z checkboxami etapów (domyślnie wszystkie zaznaczone) + „Eksportuj”; `POST calendar-export`; toast/komunikat sukcesu PL.

#### 2. Plan timeline integration

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: Render `CalendarExportControls` w `CardHeader` (obok tytułu / pod opisem); przekazać `planId`, `stages`, `keyDate`, `stageNotes`.

#### 3. Copy PL

**File**: `src/lib/copy/orientational.ts`

**Intent**: Etykiety: „Eksportuj do Google Calendar”, „Połącz konto Google”, „Wybierz etapy”, „Eksportuj wybrane”, komunikaty błędu/sukcesu, disclaimer o duplikatach przy ponownym eksporcie.

#### 4. Connected toast on return

**File**: `src/components/plan/plan-timeline.tsx` lub `calendar-export-controls.tsx`

**Intent**: Odczyt `?googleCalendar=connected` po OAuth redirect → krótki komunikat sukcesu (jednorazowo, `replaceState`).

### Success Criteria:

#### Automated Verification:

- `pnpm lint` / `pnpm typecheck` pass

#### Manual Verification:

- Niepołączone konto → CTA prowadzi do Google OAuth
- Połączone → dialog, export 2 etapów → widoczne w Google Calendar (primary)
- Ponowny export tworzy kolejne wydarzenia (duplikat oczekiwany)

**Implementation Note**: Pauza na manual UI przed Phase 5.

---

## Phase 5: Testy i domknięcie

### Overview

Vitest handler tests; opcjonalny cienki E2E; `change.md` → `implemented`.

### Changes Required:

#### 1. Route handler tests

**File**: `src/lib/api/calendar-export-route-handlers.test.ts` (new)

**Intent**: Wzorzec `stage-notes-route-handlers.test.ts`:
- 401 anonymous POST export
- 404 foreign plan
- 400 `stageSlug` spoza planu
- 412 brak Google credential
- 200 happy path (mock `googleapis` + Prisma credential)

#### 2. Builder unit test

**File**: `src/lib/google-calendar/build-stage-events.test.ts` (new)

**Intent**: `keyDate` + `startDay`/`durationDays` → poprawne `start.date` / `end.date`; milestone `durationDays=0`.

#### 3. Validation unit test

**File**: `src/lib/validations/calendar-export.test.ts` (new)

**Intent**: Pusty `stageSlugs` OK; pusty string w tablicy odrzucony.

#### 4. E2E (opcjonalny, cienki)

**File**: `e2e/risk-08-calendar-export-ui.spec.ts` (new)

**Intent**: Jak risk-04 setup; plan page → przycisk „Eksportuj do Google Calendar” lub „Połącz konto Google” widoczny w sekcji harmonogramu (bez pełnego OAuth).

**File**: `package.json`, `playwright.config.ts`

**Intent**: Skrypt `test:e2e:risk-08` + project `risk-08` (generate-user setup).

#### 5. Dokumentacja

**File**: `context/foundation/test-plan.md` (minimal)

**Intent**: Linia w §6.0 Other automated: calendar export handlers + risk-08.

### Success Criteria:

#### Automated Verification:

- `pnpm test` passes
- `pnpm build:ci` passes
- `pnpm test:e2e:risk-08` passes (jeśli spec dodany)

#### Manual Verification:

- Owner: export wszystkich etapów → N wydarzeń w Google Calendar
- Owner: rozłączenie Google → export zwraca 412 / UI pokazuje connect

**Implementation Note**: Zaktualizować `change.md` → `implemented` po Phase 5.

---

## Testing Strategy

### Unit Tests:

- `build-stage-events` — daty all-day, milestone
- `calendar-export` Zod — slug validation
- `encrypt-token` round-trip (opcjonalnie, env test key w vitest)

### Integration Tests:

- `calendar-export-route-handlers.test.ts` — IDOR, 412, slug validation
- Mock `googleapis` — nie wołać prawdziwego Google w CI

### Manual Testing Steps:

1. Połącz Google Calendar z kontem testowym
2. Export wszystkich etapów — daty zgodne z harmonogramem na `/moj-plan/:id`
3. Export podzbioru (2 etapy) — tylko te w kalendarzu
4. Rozłącz → brak możliwości exportu
5. User B nie może POST export do planu user A

## Performance Considerations

- Etapów ≤ ~20 — sekwencyjne `events.insert` w MVP akceptowalne (<100s NFR).
- Odświeżanie access tokena tylko gdy `expiresAt` minął.

## Migration Notes

- **Owner:** `pnpm db:migrate` po merge Phase 1.
- Istniejący użytkownicy: brak credential → UI „Połącz konto Google”.
- Google Cloud: osobny OAuth client (nie ten sam co ewentualne FR-011 w przyszłości).

## References

- PRD FR-010: `context/foundation/prd.md`
- Roadmap S-04: `context/foundation/roadmap.md`
- Lessons: `context/foundation/lessons.md`
- Wzorzec API ownership: `src/app/api/plans/[planId]/stage-notes/route.ts`
- Wzorzec planu: `context/archive/2026-06-11-timeline-notes/plan.md`
- Date math: `src/lib/format/plan-date.ts`, `src/components/plan/plan-timeline.tsx`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Schema Prisma (`GoogleCalendarCredential`)

#### Automated

- [x] 1.1 `pnpm db:generate` passes after schema change

#### Manual

- [x] 1.2 Owner: `pnpm db:migrate` applies cleanly
- [x] 1.3 Owner: Google Cloud OAuth client + redirect URI configured

### Phase 2: OAuth Google Calendar

#### Automated

- [x] 2.1 `pnpm lint` passes
- [x] 2.2 `pnpm typecheck` passes

#### Manual

- [ ] 2.3 Owner: OAuth connect flow completes and status returns connected

### Phase 3: Export API i builder wydarzeń

#### Automated

- [x] 3.1 `pnpm lint` passes
- [x] 3.2 `pnpm typecheck` passes

#### Manual

- [ ] 3.3 — (none)

### Phase 4: UI harmonogramu

#### Automated

- [x] 4.1 `pnpm lint` and `pnpm typecheck` pass after UI changes

#### Manual

- [ ] 4.2 Export from timeline creates visible events in Google Calendar

### Phase 5: Testy i domknięcie

#### Automated

- [x] 5.1 `pnpm test` passes (calendar-export handlers + builder + validation)
- [x] 5.2 `pnpm build:ci` passes
- [x] 5.3 `pnpm test:e2e:risk-08` passes (if spec added)

#### Manual

- [ ] 5.4 Owner smoke: connect, export subset, disconnect
