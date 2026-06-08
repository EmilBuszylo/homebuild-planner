import { expect, test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = path.join(__dirname, ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "user.json");

const TEST_RUN_ID = process.env.TEST_RUN_ID ?? `${Date.now()}`;
const E2E_EMAIL =
  process.env.E2E_USER_EMAIL ?? `e2e-risk02-${TEST_RUN_ID}@example.com`;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? "ValidP@ss1!";

/**
 * Authenticate once via UI; persist storageState for authenticated projects.
 * Requires: Supabase env, Postgres (pnpm db:docker:up), migrated schema.
 */
setup("authenticate E2E session user", async ({ page }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  await page.goto("/logowanie");
  await page.getByRole("textbox", { name: "E-mail" }).fill(E2E_EMAIL);
  await page.getByRole("textbox", { name: "Hasło" }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Zaloguj" }).click();

  const loggedIn = await page
    .waitForURL("/panel", { timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  if (!loggedIn) {
    await page.goto("/rejestracja");
    await page.getByRole("textbox", { name: "E-mail" }).fill(E2E_EMAIL);
    await page.getByRole("textbox", { name: "Hasło", exact: true }).fill(
      E2E_PASSWORD,
    );
    await page.getByRole("textbox", { name: "Powtórz hasło" }).fill(
      E2E_PASSWORD,
    );
    await page.getByRole("button", { name: "Załóż konto" }).click();
  }

  const reachedPanel = await page
    .waitForURL("/panel", { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!reachedPanel) {
    const serverError = await page
      .getByRole("alert")
      .textContent()
      .catch(() => null);
    throw new Error(
      [
        "E2E auth setup failed — could not reach /panel.",
        "Provide E2E_USER_EMAIL + E2E_USER_PASSWORD for an existing account,",
        "or configure .env.local (Supabase + DATABASE_URL) and run pnpm db:docker:up.",
        serverError ? `Server error: ${serverError}` : "No server error shown.",
      ].join(" "),
    );
  }

  await expect(
    page.getByRole("heading", { name: /Twój plan budowy|Witaj/ }),
  ).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
