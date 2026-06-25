/**
 * FR-010 / S-04 — Calendar export UI
 * Proves: kontrolka eksportu widoczna w sekcji harmonogramu (bez pełnego OAuth w CI).
 */

import { expect, test } from "@playwright/test";

import { goldenQuestionnairePayload } from "./fixtures/golden-questionnaire-payload";

test.describe("FR-010 — Eksport do Google Calendar (UI)", () => {
  test("harmonogram pokazuje przycisk połączenia lub eksportu do Google Calendar", async ({
    page,
    request,
  }) => {
    const createResponse = await request.post("/api/plans", {
      data: goldenQuestionnairePayload,
    });

    const createStatus = createResponse.status();
    expect([201, 409]).toContain(createStatus);

    const { planId } = (await createResponse.json()) as { planId: string };
    expect(planId).toBeTruthy();

    await page.goto(`/moj-plan/${planId}`);

    await expect(page.getByText("Harmonogram prac")).toBeVisible({
      timeout: 10_000,
    });

    const connectButton = page.getByRole("link", {
      name: "Połącz konto Google",
    });
    const exportButton = page.getByRole("button", {
      name: "Eksportuj do Google Calendar",
    });

    await expect(connectButton.or(exportButton)).toBeVisible();
  });
});
