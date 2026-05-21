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

A solo builder shipping a 3-week after-hours web MVP needs a mainstream, agent-friendly full-stack path with login, questionnaire flows, and generated cost/timeline output under 100 seconds. Next.js was chosen over the registry default (Astro+Supabase starter) because shape-notes already target Next.js, Vercel, and Supabase — matching the user's stated preference and PRD auth requirements. **Data layer:** PostgreSQL hosted on Supabase, with **Prisma ORM** as the schema source of truth in-repo (`prisma/schema.prisma`, versioned migrations under `prisma/migrations/`). Domain reads/writes go through Prisma Client inside Next.js API Route Handlers — not ad-hoc Supabase table APIs or dashboard-only schema changes. **Auth:** Supabase Auth via Server Actions (Publishable/Secret keys per current Supabase docs). UI: Tailwind from scaffold; shadcn/ui post-init. Vercel deploy; GitHub Actions auto-deploy-on-merge. Auth in scope; payments, realtime, explicit LLM features not. Calendar integration nice-to-have per PRD.
