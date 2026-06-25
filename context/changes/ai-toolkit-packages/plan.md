# Plan — ai-toolkit-packages

Implementacja szkieletu paczki dystrybucyjnej M5L4 (Model 1: GitHub Packages).

**Target repo:** `/Users/emil.buszylo/Repositories/ai-toolkit` (osobne od home-build-planner).

## Phase 1: Repo scaffold + package manifest

- Utworzyć repo `ai-toolkit` z `package.json`, `README.md`, `.gitignore`
- `publishConfig.registry`, skrypty `postinstall` / `uninstall`, `files` field
- `.github/workflows/publish-ai-toolkit.yml`

**Verify:** `node --check install.js uninstall.js`; struktura katalogów zgodna z lekcją.

## Phase 2: Install / uninstall + manifest

- `install.js`: profile narzędzi, kopiowanie skilli, sentinel w `AGENTS.md`/`CLAUDE.md`, manifest `.cursor/.ai-toolkit-manifest.json`
- `uninstall.js`: odczyt manifestu, usunięcie plików, wyczyszczenie bloku sentinel

**Verify:** lokalnie `node install.js` z cwd home-build-planner (dry path) lub test w ai-toolkit z `AI_TOOLKIT_PROJECT_ROOT`.

## Phase 3: Artefakty AI + git + workspace

- `skills/code-review/SKILL.md`, `rules/team-rules.md`
- `git init` w ai-toolkit, initial commit
- `10-dev-app.code-workspace` — multi-root (home-build-planner + ai-toolkit)

**Verify:** oba foldery w workspace; manifest zapisuje się po install.

## Progress

### Phase 1

- [x] Repo scaffold + package manifest

### Phase 2

- [x] Install / uninstall + manifest

### Phase 3

- [x] Artefakty AI + git + workspace
