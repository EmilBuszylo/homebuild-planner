/**
 * Risk #1 — Plan IDOR (test-plan.md §2)
 * Proves: zalogowany użytkownik A otwiera plan użytkownika B → błąd, bez cudzych kosztów.
 *
 * Seed exemplar: e2e/seed.spec.ts
 * Integration complement: plans-route-handlers.test.ts (404 JSON, no stages/totalCost).
 */

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const FOREIGN_PLAN_FILE = path.join(
  __dirname,
  ".fixtures",
  "foreign-plan.json",
);

function readForeignPlanId(): string {
  if (!fs.existsSync(FOREIGN_PLAN_FILE)) {
    throw new Error(
      "Missing e2e/.fixtures/foreign-plan.json — run foreign-plan.setup first.",
    );
  }
  const { planId } = JSON.parse(
    fs.readFileSync(FOREIGN_PLAN_FILE, "utf8"),
  ) as { planId: string };
  return planId;
}

test.describe("Ryzyko #1 — Plan IDOR: izolacja planów", () => {
  test("zalogowany użytkownik otwiera URL cudzego planu → błąd bez tabeli kosztów", async ({
    page,
  }) => {
    const foreignPlanId = readForeignPlanId();

    // Sesja user A (storageState) — nie właściciel planu B.
    await page.goto(`/moj-plan/${foreignPlanId}`);

    await expect(
      page.getByText("Nie znaleziono planu"),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("table")).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: "Wróć do panelu" }),
    ).toBeVisible();
    await expect(page.getByText("Kosztorys etapów")).not.toBeVisible();
  });
});
