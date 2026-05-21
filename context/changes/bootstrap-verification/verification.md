---
bootstrapped_at: 2026-05-21T08:30:00Z
starter_id: next
starter_name: Next.js
project_name: home-build-planner
language_family: js
package_manager: pnpm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: next
package_manager: pnpm  # session override from npm in original hand-off
project_name: home-build-planner
hints:
  language_family: js
  team_size: solo
  deployment_target: vercel
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

## Why this stack

A solo builder shipping a 3-week after-hours web MVP needs a mainstream, agent-friendly full-stack path with login, questionnaire flows, and generated cost/timeline output under 100 seconds. Next.js was chosen over the registry default (Astro+Supabase starter) because shape-notes already target Next.js, Vercel, and Supabase — matching the user's stated preference and PRD auth requirements. UI styling: Tailwind CSS ships with the Next.js scaffold (`create-next-app --tailwind`); shadcn/ui is a required post-init step (`shadcn init` + components) for the MVP interface — not encoded in frontmatter, but load-bearing for implementation. Next.js clears all four agent-friendly gates with verified bootstrapper confidence. Vercel is the starter's default deploy target; GitHub Actions with auto-deploy-on-merge fits a solo workflow. Auth is in scope; payments, realtime, and explicit LLM features are not. Calendar integration and timeline notes remain nice-to-have per PRD.

## Pre-scaffold verification

| Signal             | Value                              | Severity | Notes                              |
| ------------------ | ---------------------------------- | -------- | ---------------------------------- |
| npm package        | create-next-app v16.2.6 published 2026-05-21 | fresh    | resolved from cmd_template         |
| GitHub repo        | not run                            | —        | docs_url is nextjs.org/docs, not GitHub |

## Scaffold log

**Resolved invocation**: `npx create-next-app@latest bootstrap-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes`

**Strategy**: subdir-then-move (temp dir `bootstrap-scaffold` — `create-next-app` rejects `.bootstrap-scaffold` as project name per npm naming rules)

**Exit code**: 0

**Files moved**: ~20572 (includes node_modules tree)

**Conflicts (.scaffold siblings)**: none

**.gitignore handling**: moved silently (no pre-existing .gitignore in cwd)

**bootstrap-scaffold cleanup**: deleted after move-up; upstream `.git/` removed before merge

**Post-merge fix**: `package.json` `name` updated from `bootstrap-scaffold` to `home-build-planner`

## Post-scaffold audit

**Tool**: pnpm audit (project uses pnpm; registry default is `npm audit --json`)

**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW (pnpm audit completed with no reported vulnerabilities)

**Direct vs transitive**: not distinguished in summary output

#### CRITICAL findings

none

#### HIGH findings

none

## Hints recorded but not acted on in v1

- `deployment_target: vercel` — no Vercel project link or deploy config generated
- `ci_provider: github-actions`, `ci_default_flow: auto-deploy-on-merge` — no workflow files generated
- `has_auth: true` — no Supabase/auth wiring (add per PRD)
- `team_size: solo`, `path_taken: standard`, `self_check_answers: null`, `quality_override: false`
- `has_payments`, `has_realtime`, `has_ai`, `has_background_jobs`: false
- Hand-off body notes: shadcn/ui post-init required; Supabase per shape-notes — manual next steps

## Next steps

1. Run `pnpm dev` to verify the app locally.
2. Add Supabase (auth + DB) per PRD FR-001/002.
3. Run `pnpm dlx shadcn@latest init` for UI components (per tech-stack hand-off).
4. Future skill will add `AGENTS.md` / `CLAUDE.md` and CI workflows — not in bootstrapper v1.
