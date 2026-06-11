/**
 * FR-007 / S-03 — Stage notes on timeline
 * Proves: notatka etapu zapisuje się w UI i przetrwa reload; pin utrzymuje stan.
 *
 * Setup jak risk-04: generate-user storageState + POST /api/plans.
 * Integration complement: stage-notes-route-handlers.test.ts.
 */

import { expect, test } from "@playwright/test";

import { goldenQuestionnairePayload } from "./fixtures/golden-questionnaire-payload";

const TEST_RUN_ID = process.env.TEST_RUN_ID ?? `${Date.now()}`;

test.describe("FR-007 — Notatki etapów harmonogramu", () => {
  test("zapis notatki i pinu na etapie przetrwa odświeżenie strony planu", async ({
    page,
    request,
  }) => {
    const noteText = `Kontakt e2e-${TEST_RUN_ID}`;

    const createResponse = await request.post("/api/plans", {
      data: goldenQuestionnairePayload,
    });

    const createStatus = createResponse.status();
    expect([201, 409]).toContain(createStatus);

    const { planId } = (await createResponse.json()) as { planId: string };
    expect(planId).toBeTruthy();

    await page.goto(`/moj-plan/${planId}`);

    await expect(
      page.getByRole("heading", { name: "Twój plan budowy" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Harmonogram prac")).toBeVisible();

    const noteOpenButton = page
      .getByRole("button", { name: "Otwórz notatkę do etapu" })
      .first();
    await noteOpenButton.click();

    const noteTextarea = page.getByRole("textbox", {
      name: "Otwórz notatkę do etapu",
    });
    await expect(noteTextarea).toBeVisible();
    await noteTextarea.fill(noteText);
    await page.getByRole("button", { name: "Zapisz notatkę" }).click();
    await expect(noteTextarea).not.toBeVisible();

    const pinButton = page
      .getByRole("button", { name: "Oznacz jako ważny etap" })
      .first();
    await pinButton.click();
    await expect(pinButton).toHaveAttribute("aria-pressed", "true");

    await page.reload();

    await expect(page.getByText("Harmonogram prac")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: "Oznacz jako ważny etap" }).first(),
    ).toHaveAttribute("aria-pressed", "true");

    await page
      .getByRole("button", { name: "Otwórz notatkę do etapu" })
      .first()
      .click();
    await expect(
      page.getByRole("textbox", { name: "Otwórz notatkę do etapu" }),
    ).toHaveValue(noteText);
  });
});
