/**
 * seed.spec.ts — wzorcowy test E2E demonstrujący konwencje projektu.
 *
 * Uruchamiać przez Playwright (pnpm exec playwright test).
 * Ten plik NIE jest częścią suite `pnpm test` (Vitest) — żyje w e2e/.
 * Playwright nie jest zainstalowany bez explicit user request (AGENTS.md §Build).
 *
 * Ryzyko z test-plan.md §2:
 *   #2 — Zmiana warstwy auth powoduje masowe wylogowanie lub brak dostępu
 *         do chronionych tras mimo poprawnej sesji.
 *   #1 — Zalogowany użytkownik otwiera URL z cudzym planId i widzi cudzy plan.
 *
 * Testy w tym pliku są SMOKE na poziomie przeglądarki — pokrywają tylko to,
 * czego integration tests (Vitest) nie mogą: cookies, middleware redirect, UI.
 *
 * Produkcyjne specy per ryzyko (uruchamiane przez playwright.config.ts):
 *   #2 → e2e/risk-02-anonymous-panel-redirect.spec.ts
 *        e2e/risk-02-session-survives-navigation.spec.ts
 */

import { expect, type Page, test } from "@playwright/test";

// ─── Dane testowe ────────────────────────────────────────────────────────────
// Unikalne prefiksy gwarantują izolację między przebiegami; seed trasy są
// nieosiągalne przez real-user w normalnym przepływie (brak UI do ich tworzenia).

const TEST_ID = `e2e-${process.env.TEST_RUN_ID ?? Date.now()}`;

/** Konto z sesją istniejącą przed testami — dostarczane przez fixtures lub env. */
const SESSION_USER = {
  email: process.env.E2E_USER_EMAIL ?? `${TEST_ID}@playwright.invalid`,
  password: process.env.E2E_USER_PASSWORD ?? "ValidP@ss1!",
};

/** Cudzego planu użyjemy w teście IDOR — rzeczywisty ID z seedu bazy danych. */
const FOREIGN_PLAN_ID = process.env.E2E_FOREIGN_PLAN_ID ?? "plan-does-not-belong-to-session-user";

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Zaloguj przez formularz i poczekaj na stan nawigacji (nie setTimeout!).
 * Zwraca zalogowaną stronę na /panel.
 */
async function loginAsSessionUser(page: Page): Promise<void> {
  await page.goto("/logowanie");

  // getByRole jest domyślnym selektorem — odporny na zmianę class/id/atrybutu.
  await page.getByRole("textbox", { name: "E-mail" }).fill(SESSION_USER.email);
  await page.getByRole("textbox", { name: "Hasło" }).fill(SESSION_USER.password);
  await page.getByRole("button", { name: "Zaloguj" }).click();

  // Czekaj na stan URL, nie na arbitralny timeout.
  await page.waitForURL("/panel", { timeout: 10_000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Ryzyko #2 — Auth i dostęp do chronionych tras", () => {
  /**
   * Chroni przed regresją: middleware musi redirectować anonimowego użytkownika.
   * Odpowiednik tego w integration: plans-route-handlers.test.ts (401 cases).
   * Tutaj sprawdzamy COOKIES + MIDDLEWARE na poziomie przeglądarki.
   */
  test("niezalogowany użytkownik otwiera /panel → przekierowanie na /logowanie", async ({
    page,
  }) => {
    // Brak setupu sesji = brak cookies = anonimowy.
    await page.goto("/panel");

    // Czekaj na redirect; nie zakładaj czasu renderowania.
    await page.waitForURL("/logowanie", { timeout: 5_000 });

    // Potwierdź, że strona jest faktycznie logowaniem (nie tylko URL).
    await expect(
      page.getByRole("heading", { name: "Zaloguj się" }),
    ).toBeVisible();

    // Nie powinno być żadnych fragmentów zastrzeżonych UI (np. "Twój plan budowy").
    await expect(page.getByText("Twój plan budowy")).not.toBeVisible();
  });

  /**
   * Sesja istniejąca przed testem NIE ginie po nawigacji do publicznej strony
   * i powrocie do panelu.
   *
   * Wykrywa: flush cookie przy SSR, brakujące odświeżenie tokenu.
   */
  test("zalogowany użytkownik nie jest wylogowywany po wizycie na stronie głównej", async ({
    page,
  }) => {
    await loginAsSessionUser(page);

    // Wyjdź na stronę publiczną.
    await page.goto("/");

    // Wróć do panelu — strona musi się załadować BEZ redirectu na logowanie.
    await page.goto("/panel");
    await page.waitForURL("/panel", { timeout: 8_000 });

    // Zakotwiczymy o nagłówek panelu — jest widoczny tylko dla zalogowanych.
    await expect(
      page.getByRole("heading", { name: /Twój plan budowy|Witaj/ }),
    ).toBeVisible();
  });
});

test.describe("Ryzyko #1 — Plan IDOR: izolacja planów między użytkownikami", () => {
  /**
   * Zalogowany user otwiera URL z cudzym planId → musi zobaczyć 404/błąd,
   * NIE cudze dane.
   *
   * Testy integration (Vitest) weryfikują to na poziomie handlera API (404 JSON).
   * Ten test sprawdza, że strona /moj-plan/[planId] nie renderuje cudzych danych
   * nawet gdy handler zwraca 404 — czyli że UI poprawnie obsługuje błąd.
   */
  test(
    "zalogowany użytkownik otwiera URL cudzego planu → strona pokazuje błąd, bez cudzych kosztów",
    async ({ page }) => {
      await loginAsSessionUser(page);

      // Wejdź bezpośrednio na URL z cudzym ID (poza normalnym przepływem UI).
      await page.goto(`/moj-plan/${FOREIGN_PLAN_ID}`);

      // Czekaj na wyrenderowanie błędu — nie na brak elementu (zbyt kruche).
      // Strona wyświetla komunikat "Nie znaleziono planu..." (plan/[planId]/page.tsx).
      await expect(
        page.getByText("Nie znaleziono planu"),
      ).toBeVisible({ timeout: 8_000 });

      // Kluczowa asercja: tabela kosztów NIE może być widoczna.
      // getByRole 'table' jest semantycznie odporny na zmianę klas.
      await expect(page.getByRole("table")).not.toBeVisible();

      // Dostępny przycisk powrotu — UX zgodny z projektem.
      await expect(
        page.getByRole("link", { name: "Wróć do panelu" }),
      ).toBeVisible();
    },
  );
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────
// afterAll — gdyby testy tworzyły dane testowe w DB, tu byłby ich cleanup.
// Obecne smoke testy nie mutują stanu (tylko odczyt i nawigacja), więc
// cleanup jest no-op; sekcja pozostaje jako wzorzec do rozbudowy.

test.afterAll(async () => {
  // Placeholder: DELETE /api/test-fixtures/${TEST_ID} jeśli fixtures tworzą dane.
  // Nie używamy tu page/browser — afterAll nie ma dostępu do page fixture.
  // Zamiast tego fixture konfiguruje osobne cleanup request w globalSetup.
});
