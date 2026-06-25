import { readFileSync, writeFileSync } from "node:fs";

const npmrcPath = ".npmrc";
const registryLine = "@emilbuszylo:registry=https://npm.pkg.github.com";
const isAutomatedBuild =
  process.env.VERCEL === "1" ||
  process.env.CI === "true" ||
  process.env.GITHUB_ACTIONS === "true";

function readNpmrc() {
  try {
    return readFileSync(npmrcPath, "utf8");
  } catch {
    return "";
  }
}

function hasGithubPackagesAuth(content) {
  return content.split("\n").some((line) => {
    const match = line.match(/^\/\/npm\.pkg\.github\.com\/:_authToken=(.+)$/);
    return Boolean(match?.[1]?.trim());
  });
}

const existing = readNpmrc();
if (hasGithubPackagesAuth(existing)) {
  process.exit(0);
}

const token =
  process.env.GH_PKG_TOKEN?.trim() || process.env.NODE_AUTH_TOKEN?.trim();

if (!token) {
  if (isAutomatedBuild) {
    console.error(
      "GitHub Packages auth is missing. Set GH_PKG_TOKEN (Vercel / GitHub Actions) or configure setup-node NODE_AUTH_TOKEN before pnpm install.",
    );
    process.exit(1);
  }
  process.exit(0);
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
