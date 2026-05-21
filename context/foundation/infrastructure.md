---
project: home-build-planner
researched_at: 2026-05-21T12:00:00Z
recommended_platform: Vercel
runner_up: Fly.io
context_type: mvp
tech_stack:
  language: JavaScript / TypeScript
  framework: Next.js 16
  runtime: Node.js
---

## Recommendation

**Deploy on Vercel.**

For a solo, three-week after-hours MVP on Next.js 16 with external Supabase (Postgres + Auth) and Prisma in-repo, Vercel is the fastest path: it matches `tech-stack.md` (`deployment_target: vercel`), leverages strong team familiarity, provides global CDN/edge delivery, and Hobby ($0) is sufficient while traffic is small. WebSockets and always-on workers were ruled out for MVP: plan generation will be synchronous HTTP (target ≤100s per PRD) with a disabled UI during generation—no mid-flow user clicks. Voivodeship cost baselines will be **seeded locally** for MVP; optional daily cron can be added later on Vercel Hobby (max once/day) or via GitHub Actions if refresh automation is needed before Pro.

## Platform Comparison

Hard filter (revised after interview): persistent WebSockets / always-on processes are **not required for MVP**. Platforms were scored for agent-friendly MVP ops with Next.js + external Supabase.

| Platform | CLI-first | Managed | Agent docs | Deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| **Vercel** (Recommended) | Pass | Pass | Pass | Pass | Pass (MCP Public Beta, Aug 2025) | 5P |
| Fly.io (Runner-up) | Pass | Pass | Pass | Pass | Partial | 4P + 1 Partial |
| Railway | Pass | Pass | Pass | Pass | Partial | 4P + 1 Partial |
| Cloudflare (OpenNext) | Pass | Pass | Pass | Pass | Pass | 5P*, Prisma on Workers = Partial (edge/WASM friction) |
| Render | Pass | Pass | Pass | Pass | Partial | 4P; free tier spin-down fails always-on use cases |
| Netlify | Pass | Pass | Pass | Pass | Pass | 4P; weaker Next.js DX vs Vercel for this stack |

### Interview constraints applied

| Question | Answer | Effect on scoring |
|---|---|---|
| Q1 Persistent connections | Initially **Yes** → revised to **No for MVP** (sync generation + cache; no WS) | Vercel retained; Fly remains runner-up for future always-on/cron-heavy paths |
| Q2 Cost vs DX | Minimize cost, upgrade DX later | Hobby first → Pro when cron/build limits bite |
| Q3 Familiarity | Strong Vercel, some Netlify | Tie-break toward Vercel |
| Q4 Geography | Global | Edge/CDN weights Vercel, Cloudflare, Fly multi-region |
| Q5 Data co-location | External OK (Supabase) | No penalty for Vercel lacking managed Postgres |

### Shortlisted Platforms

#### 1. Vercel (Recommended)

Best fit for Next.js 16 App Router, GitHub auto-deploy, preview URLs per branch, and zero platform migration cost given existing `tech-stack.md` and operator experience. MVP generation stays in Route Handlers (Node runtime) with Prisma → Supabase via connection pooler. Fluid Compute (default for new projects, 2025) supports background work via `waitUntil` if needed later; native WebSockets are not supported on-platform (external provider only if ever required).

#### 2. Fly.io

Strong when you need a single long-lived Node process, native WebSockets, or sub-daily cron without Vercel Pro. Trade-off: Dockerfile/`fly.toml` ops, ~$2–5+/month per always-on small VM, no Vercel-grade Next.js preview ergonomics. Revisit if generation exceeds Hobby function duration regularly or you want one VM for scraping + API.

#### 3. Railway

Predictable ~$5/month Hobby, straightforward `output: "standalone"` Next deploy, documented background workers. WebSocket connections capped at 15 minutes. Less alignment with current stack doc than Vercel; good alternative if Vercel billing or cron limits become painful before adopting Fly.

## Anti-Bias Cross-Check: Vercel

### Devil's Advocate — Weaknesses

1. **No native WebSockets** — any future live progress stream needs SSE, polling, Supabase Realtime, or a separate host (e.g. Fly).
2. **Hobby cron limited to once per day** with ±59 minute precision — insufficient for hourly cost scraping; use local/GitHub Actions seed for MVP instead.
3. **Cost can spike** with preview deploy volume, Fluid Compute usage, and egress before Pro caps/visibility improve.
4. **Prisma on serverless** requires Supabase pooler (transaction mode) to avoid connection exhaustion under concurrent invocations.
5. **Vendor affinity for Next.js** — deepest features on Vercel; migration to Fly/Railway means owning container build and edge config.

### Pre-Mortem — How This Could Fail

The team shipped on Vercel for speed. FR-009 “internet browsing” enrichment was implemented as long synchronous fetches inside a single function, blowing past comfortable latency and Hobby duration limits. They skipped the pooler; production hit `too many connections` during demos. Preview deployments leaked staging secrets into public URLs. When they added “live” generation progress, they assumed WebSockets on Vercel and lost a week to workarounds. Monthly bills jumped after enabling Pro-less frequent cron attempts on Hobby. Six months in, they migrated scraping to Fly while keeping Vercel for the UI— workable, but later than planning a cache + local seed from day one.

### Unknown Unknowns

- **Fluid Compute** changes billing and concurrency semantics vs classic serverless—monitor the Functions usage dashboard after first deploy.
- **WebSockets are explicitly out of scope on Vercel** — not a temporary limitation; plan SSE or external realtime from the start if UX demands it.
- **ISR / `revalidatePath`** behavior interacts with Fluid-backed routes—test cache invalidation after mutations.
- **Vercel MCP (Public Beta)** uses OAuth project scopes—treat agent tokens like production secrets.
- **Database migrations do not roll back** when using Vercel instant rollback—pair `prisma migrate deploy` with release discipline.

## Operational Story

- **Preview deploys**: Every push to a linked Git branch gets a unique `*.vercel.app` URL; PRs from the same repo get preview comments when Git integration is enabled. Protect sensitive previews with Vercel Authentication or Deployment Protection on Pro if staging data is realistic.
- **Secrets**: Production/preview/development env vars in Project Settings → Environment Variables, or `vercel env pull .env.local` for local dev. Supabase URL, publishable key, database URL (pooled), and cron secrets stay out of git. GitHub Actions (if used for seed/cron) stores `CRON_SECRET` in GitHub Secrets.
- **Rollback**: Dashboard → Deployments → … → **Rollback** on a prior production deployment, or `vercel rollback` (CLI). Typical revert is minutes; Prisma schema/data migrations are not reversed automatically.
- **Approval**: Agent may deploy previews and run read-only `vercel ls`, `vercel inspect`, `vercel logs` with scoped token. Human approval required for production promote, deleting projects, rotating production `DATABASE_URL`, and first-time custom domain/DNS changes.
- **Logs**: `vercel logs <deployment-url>` or `vercel logs --follow` for runtime; build logs in dashboard or `vercel inspect <url>`. GitHub Actions logs for optional scheduled jobs. Supabase logs remain in Supabase dashboard for DB/Auth.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Generation exceeds 100s NFR | PRD / Research | Medium | High | Pre-seed voivodeship costs locally; read cache in Postgres; cap FR-009 scope in MVP; add `maxDuration` only where needed |
| No WebSockets if live progress added later | Devil's advocate | Low (MVP) / Medium (later) | Medium | Use blocking UI + spinner for MVP; SSE or Supabase Realtime before committing to WS |
| Prisma connection exhaustion | Devil's advocate | Medium | High | Use Supabase pooler URL; singleton Prisma client; avoid long transactions in serverless handlers |
| Hobby cron too coarse for automated refresh | Unknown unknowns / Interview | Low (MVP uses local seed) | Low | MVP: `pnpm` seed script from laptop CI; later: GitHub Actions schedule or Vercel Pro cron |
| Vercel cost surprise on previews/Fluid | Pre-mortem | Medium | Medium | Stay on Hobby until limits hit; disable unused preview branches; watch Usage tab before Pro |
| FR-009 web enrichment flaky/slow | PRD | Medium | Medium | Treat as async enrichment post-MVP or bounded timeout with cached fallbacks |
| Instant rollback vs DB migrate | Unknown unknowns | Low | High | Forward-only migrations; test migrate on preview before production |
| Agent over-permissioned via Vercel MCP beta | Unknown unknowns | Low | Medium | OAuth least privilege; separate preview project for agent experiments |

## Getting Started

1. **Link the repo**: From project root, `pnpm dlx vercel link` (or connect GitHub in Vercel dashboard). Framework preset: Next.js; build: `pnpm build`; output: default Next.js.
2. **Environment variables** (Vercel dashboard + `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` (Supabase **pooled** connection string for Prisma), `DIRECT_URL` (direct, migrations only). Add `CRON_SECRET` when exposing `/api/cron/*`.
3. **Local dev** (Next 16 — no separate `vercel dev` required for daily work): `pnpm dev`. Use `vercel env pull .env.local` to sync remote envs. Optional: `pnpm dlx vercel dev` only when debugging Vercel-specific runtime behavior.
4. **Seed voivodeship cost baselines (MVP)**: Implement `pnpm db:seed` (Prisma seed or script) run locally against Supabase dev/staging—document in README. Do not block MVP on Vercel Cron.
5. **Production deploy**: Push to `main` with Git integration, or `pnpm dlx vercel --prod` after env vars are set. Confirm first deploy builds with Node 20.x and Next 16.2.x from `package.json`.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup (beyond noting GitHub Actions as optional cron/seed runner)
- Production-scale architecture (multi-region HA, DR, dedicated support tiers)
- Fly.io/Railway cutover runbooks (captured only as runner-up path)
