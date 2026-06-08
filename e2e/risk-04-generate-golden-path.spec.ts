/**
 * Risk #4 — Generate path (test-plan.md §2)
 * Proves: minimalny poprawny payload tworzy niepusty kosztorys + timeline w UI.
 *
 * Cienki golden path: POST /api/plans (bez pełnej ankiety) → /moj-plan/:id.
 * Anti-pattern avoided: Playwright całego kwestionariusza.
 *
 * Integration complement: persist-plan-version.test.ts, plans-route-handlers.test.ts.
 */

import { expect, test } from "@playwright/test";

import { goldenQuestionnairePayload } from "./fixtures/golden-questionnaire-payload";

test.describe("Ryzyko #4 — Generate path: cienki golden path", () => {
  test("POST z minimalnym payloadem tworzy plan z kosztorysem i harmonogramem", async ({
    page,
    request,
  }) => {
    // Krok 1: generowanie przez API (real auth cookies z storageState).
    const createResponse = await request.post("/api/plans", {
      data: goldenQuestionnairePayload,
    });

    expect(createResponse.status()).toBe(201);
    const { planId } = (await createResponse.json()) as { planId: string };
    expect(planId).toBeTruthy();

    // Krok 2: strona wyników renderuje niepusty kosztorys i timeline.
    await page.goto(`/moj-plan/${planId}`);

    await expect(
      page.getByRole("heading", { name: "Twój plan budowy" }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole("heading", { name: "Kosztorys etapów" }),
    ).toBeVisible();

    const costTable = page.getByRole("table");
    await expect(costTable).toBeVisible();
    await expect(costTable.locator("tbody tr").first()).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Harmonogram prac" }),
    ).toBeVisible();
  });
});
