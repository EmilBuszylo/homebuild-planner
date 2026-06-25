# Research — ai-toolkit-packages

## Goal

Minimalna paczka npm `@emilbuszylo/ai-toolkit` publikowana do GitHub Packages, instalowana w `home-build-planner` przez `pnpm add`, z `postinstall` układającym skille i reguły zespołowe.

## Decision (Task 1)

Model 1 — GitHub Packages. See `context/team/m5l4-distribution-decision.md`.

## Requirements (M5L4 lesson)

| Wymaganie | Rozwiązanie |
|---|---|
| Jedno źródło prawdy | Repo `ai-toolkit` |
| Wersjonowanie | semver w `package.json`, publish z CI |
| Uwierzytelnianie | `GITHUB_TOKEN` w CI publish; `GH_PKG_TOKEN` / `npm login` u konsumenta |
| Install / update / uninstall | `install.js` + `uninstall.js` + manifest |
| Multi-tool | Profile: `cursor`, `claude-code`, `codex` (env `AI_TOOLKIT_TOOL`) |

## Package identity

- **name:** `@emilbuszylo/ai-toolkit`
- **registry:** `https://npm.pkg.github.com`
- **GitHub owner:** `EmilBuszylo` (z remote homebuild-planner)

## Artefakty v0.1.0

| Artefakt | Zawartość |
|---|---|
| `skills/code-review/SKILL.md` | Review pod reguły modułu 4: INV-GEN-01, ACL, freeze-on-write, AGENTS.md |
| `rules/team-rules.md` | Skrót reguł projektu do wstrzyknięcia w `AGENTS.md` |

## Consumer setup (home-build-planner)

1. `.npmrc`: `@emilbuszylo:registry=https://npm.pkg.github.com`
2. `package.json`: dependency + opcjonalny `preinstall` dla `GH_PKG_TOKEN` w CI
3. `pnpm add @emilbuszylo/ai-toolkit` → postinstall kopiuje skille do `.cursor/skills/`

## Out of scope (v0.1)

- Pierwszy publish do GitHub Packages (wymaga utworzenia repo na GitHub + merge workflow)
- Podpięcie dependency w home-build-planner (faza weryfikacji po publish)
- semantic-release (ręczny semver w v0.1)

## References

- M5L4 lesson: GitHub Packages model, sentinel markers, manifest pattern
- `context/domain/02-invariant-aggregate-refactor.md` — INV-GEN-01
- `context/domain/03-anti-corruption-layer.md` — Prisma leak
- `AGENTS.md` — reguły projektu
