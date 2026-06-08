/**
 * Risk #2 — Auth / session (test-plan.md §2)
 * Proves: chroniona trasa bez sesji → redirect/login (middleware + cookies).
 *
 * Seed exemplar: e2e/seed.spec.ts
 * Integration complement: plans-route-handlers.test.ts (401 — API only).
 */

import { expect, test } from "@playwright/test";

test.describe("Ryzyko #2 — Auth: anonim na chronionej trasie", () => {
  test("niezalogowany użytkownik otwiera /panel → przekierowanie na /logowanie", async ({
    page,
  }) => {
    // Brak storageState = brak cookies sesji.
    await page.goto("/panel");

    await page.waitForURL("/logowanie", { timeout: 8_000 });

    await expect(
      page.getByRole("heading", { name: "Zaloguj się" }),
    ).toBeVisible();

    await expect(page.getByText("Twój plan budowy")).not.toBeVisible();
  });

  test("niezalogowany użytkownik otwiera /ankieta → przekierowanie na /logowanie", async ({
    page,
  }) => {
    await page.goto("/ankieta");

    await page.waitForURL("/logowanie", { timeout: 8_000 });

    await expect(
      page.getByRole("heading", { name: "Zaloguj się" }),
    ).toBeVisible();
  });
});
