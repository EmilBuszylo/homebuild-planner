import { readFileSync, writeFileSync } from "node:fs";

const npmrcPath = ".npmrc";
const registryLine = "@emilbuszylo:registry=https://npm.pkg.github.com";
const token = process.env.GH_PKG_TOKEN?.trim();
const isAutomatedBuild =
  process.env.VERCEL === "1" ||
  process.env.CI === "true" ||
  process.env.GITHUB_ACTIONS === "true";

if (!token) {
  if (isAutomatedBuild) {
    console.error(
      "GH_PKG_TOKEN is not set. Add a classic GitHub PAT with read:packages to Vercel (Preview + Production) and GitHub Actions secrets.",
    );
    process.exit(1);
  }
  process.exit(0);
}

let existing = "";
try {
  existing = readFileSync(npmrcPath, "utf8");
} catch {
  // no project .npmrc yet
}

const withoutAuth = existing
  .split("\n")
  .filter((line) => !line.includes("//npm.pkg.github.com/:_authToken="))
  .join("\n")
  .trimEnd();

const lines = [withoutAuth, registryLine, `//npm.pkg.github.com/:_authToken=${token}`]
  .filter(Boolean)
  .join("\n");

writeFileSync(npmrcPath, `${lines}\n`);
