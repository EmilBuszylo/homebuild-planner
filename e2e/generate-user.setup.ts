import { expect, test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = path.join(__dirname, ".auth");
const GENERATE_USER_FILE = path.join(AUTH_DIR, "generate-user.json");

const TEST_RUN_ID = process.env.TEST_RUN_ID ?? `${Date.now()}`;
const GENERATE_EMAIL = `e2e-gen-${TEST_RUN_ID}@example.com`;
const GENERATE_PASSWORD = process.env.E2E_GENERATE_PASSWORD ?? "ValidP@ss1!";

/**
 * Fresh user without an existing plan — for Risk #4 generate golden path.
 * Separate from auth.setup session user who may already own a plan.
 */
setup("authenticate generate-only E2E user", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/rejestracja");
  await page.getByRole("textbox", { name: "E-mail" }).fill(GENERATE_EMAIL);
  await page.getByRole("textbox", { name: "Hasło", exact: true }).fill(
    GENERATE_PASSWORD,
  );
  await page.getByRole("textbox", { name: "Powtórz hasło" }).fill(
    GENERATE_PASSWORD,
  );
  await page.getByRole("button", { name: "Załóż konto" }).click();

  const reachedPanel = await page
    .waitForURL("/panel", { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!reachedPanel) {
    throw new Error(
      "Generate-user setup failed — could not register and reach /panel.",
    );
  }

  await expect(page.getByRole("heading", { name: "Witaj" })).toBeVisible();

  await page.context().storageState({ path: GENERATE_USER_FILE });
});
