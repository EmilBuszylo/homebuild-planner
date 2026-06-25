import { appendFileSync, existsSync, readFileSync } from "node:fs";

const token = process.env.GH_PKG_TOKEN;
if (!token) {
  process.exit(0);
}

const npmrcPath = ".npmrc";
if (existsSync(npmrcPath) && readFileSync(npmrcPath, "utf8").includes("_authToken=")) {
  process.exit(0);
}

appendFileSync(npmrcPath, `\n//npm.pkg.github.com/:_authToken=${token}\n`);
