---
starter_id: next
package_manager: pnpm
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
---

## Why this stack

A solo builder shipping a 3-week after-hours web MVP needs a mainstream, agent-friendly full-stack path with login, questionnaire flows, and generated cost/timeline output under 100 seconds. Next.js was chosen over the registry default (Astro+Supabase starter) because shape-notes already target Next.js, Vercel, and Supabase — matching the user's stated preference and PRD auth requirements. UI styling: Tailwind CSS ships with the Next.js scaffold (`create-next-app --tailwind`); shadcn/ui is a required post-init step (`shadcn init` + components) for the MVP interface — not encoded in frontmatter, but load-bearing for implementation. Next.js clears all four agent-friendly gates with verified bootstrapper confidence. Vercel is the starter's default deploy target; GitHub Actions with auto-deploy-on-merge fits a solo workflow. Auth is in scope; payments, realtime, and explicit LLM features are not. Calendar integration and timeline notes remain nice-to-have per PRD.
