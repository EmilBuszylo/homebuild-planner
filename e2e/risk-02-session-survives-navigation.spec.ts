/**
 * Risk #2 — Auth / session (test-plan.md §2)
 * Proves: poprawna sesja nie ginie po typowej nawigacji (public → panel).
 *
 * Auth: storageState from e2e/auth.setup.ts (no UI login in this spec).
 * Seed exemplar: e2e/seed.spec.ts
 */

import { expect, test } from "@playwright/test";

test.describe("Ryzyko #2 — Auth: trwałość sesji", () => {
  test("zalogowany użytkownik nie jest wylogowywany po wizycie na stronie głównej", async ({
    page,
  }) => {
    // storageState from setup project — already authenticated.
    await page.goto("/panel");
    await expect(
      page.getByRole("heading", { name: /Twój plan budowy|Witaj/ }),
    ).toBeVisible();

    await page.goto("/");
    await page.goto("/panel");

    await page.waitForURL("/panel", { timeout: 8_000 });
    await expect(
      page.getByRole("heading", { name: /Twój plan budowy|Witaj/ }),
    ).toBeVisible();

    await expect(page.getByRole("heading", { name: "Zaloguj się" })).not.toBeVisible();
  });
});
