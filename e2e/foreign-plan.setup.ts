import { expect, test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { goldenQuestionnairePayload } from "./fixtures/golden-questionnaire-payload";

const FIXTURES_DIR = path.join(__dirname, ".fixtures");
const FOREIGN_PLAN_FILE = path.join(FIXTURES_DIR, "foreign-plan.json");

const TEST_RUN_ID = process.env.TEST_RUN_ID ?? `${Date.now()}`;
const VICTIM_EMAIL = `e2e-victim-${TEST_RUN_ID}@example.com`;
const VICTIM_PASSWORD = process.env.E2E_VICTIM_PASSWORD ?? "ValidP@ss1!";

/**
 * Creates a second user (victim) with a real plan in DB for Risk #1 IDOR tests.
 * Session user A (auth.setup.ts) must differ from this victim.
 */
setup("seed foreign plan owned by victim user", async ({ page }) => {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  await page.goto("/rejestracja");
  await page.getByRole("textbox", { name: "E-mail" }).fill(VICTIM_EMAIL);
  await page.getByRole("textbox", { name: "Hasło", exact: true }).fill(
    VICTIM_PASSWORD,
  );
  await page.getByRole("textbox", { name: "Powtórz hasło" }).fill(
    VICTIM_PASSWORD,
  );
  await page.getByRole("button", { name: "Załóż konto" }).click();

  const reachedPanel = await page
    .waitForURL("/panel", { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!reachedPanel) {
    await page.goto("/logowanie");
    await page.getByRole("textbox", { name: "E-mail" }).fill(VICTIM_EMAIL);
    await page.getByRole("textbox", { name: "Hasło" }).fill(VICTIM_PASSWORD);
    await page.getByRole("button", { name: "Zaloguj" }).click();

    const loggedIn = await page
      .waitForURL("/panel", { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!loggedIn) {
      const serverError = await page
        .getByRole("alert")
        .textContent()
        .catch(() => null);
      throw new Error(
        [
          "Foreign-plan setup failed — victim user could not reach /panel.",
          "Configure .env.local (Supabase + DATABASE_URL) and run pnpm db:docker:up.",
          serverError ? `Server error: ${serverError}` : "No server error shown.",
        ].join(" "),
      );
    }
  }

  await expect(
    page.getByRole("heading", { name: /Twój plan budowy|Witaj/ }),
  ).toBeVisible();

  const createResponse = await page.request.post("/api/plans", {
    data: goldenQuestionnairePayload,
  });

  if (createResponse.status() === 409) {
    const body = (await createResponse.json()) as { planId?: string };
    if (!body.planId) {
      throw new Error(
        "Victim user already has a plan but 409 response lacked planId.",
      );
    }
    fs.writeFileSync(
      FOREIGN_PLAN_FILE,
      JSON.stringify({ planId: body.planId, victimEmail: VICTIM_EMAIL }),
    );
    return;
  }

  if (createResponse.status() !== 201) {
    const body = await createResponse.text();
    throw new Error(
      `Failed to create victim plan: HTTP ${createResponse.status()} — ${body}`,
    );
  }

  const { planId } = (await createResponse.json()) as { planId: string };
  if (!planId) {
    throw new Error("POST /api/plans returned 201 without planId.");
  }

  fs.writeFileSync(
    FOREIGN_PLAN_FILE,
    JSON.stringify({ planId, victimEmail: VICTIM_EMAIL }),
  );
});
