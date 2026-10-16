# Demo ↔ Production visual parity baseline

Read-only audit captured **2026-10-16** after merge of PR #715 (Build #588) and PR #716 (homepage integrity + cinematic hero).

## 1. Demo source of truth

| Question | Finding |
|----------|---------|
| **Repository** | Same monorepo: `worldlabsprotocol-ux/abraxas-app` (this repository). |
| **Demo is not a fork** | `docs/demo/DEMO_ENVIRONMENT.md` states DEMO is the **same public Abraxas product** with isolated data and env vars. |
| **Not `/judge-demo`** | Judge demo routes are retired/404; demo host uses `/`, `/passport`, `/developers`, `/verify`, etc. |
| **Runtime separation** | `ABRAXAS_RUNTIME_ENV=demo`, `NEXT_PUBLIC_APP_URL=https://demo.abraxasworld.xyz`, separate Supabase project (see demo docs). |
| **Client UI fork** | No separate demo component tree. Demo-only chrome: `DemoEnvironmentBanner` (`components/judgeDemo/JudgeDemoSandboxBanner.tsx`) when `isPublicDemoClientSurface()` is true. |
| **Vercel project** | Both hosts served from Vercel project **`abraxas-app`** (inferred from HTML deployment markers and docs). |
| **Deployment IDs (HTML marker, 2026-10-16)** | Production `abraxasworld.xyz`: `dpl_Fd2SFKJ8ngt9DjjKhkAMkz6xxYz2`. Demo `demo.abraxasworld.xyz`: `dpl_CjQCZhmyQTv8jRsR6rjut4yymdF6`. **Commit SHA for each deployment was not accessible** from this agent (Vercel API 403; CLI unavailable). |

## 2. Rendered comparison (1440 desktop / 390 mobile)

Captured with Playwright against live origins. Artifacts: `/opt/cursor/artifacts/parity/`.

| Surface | Production | Demo | Notes |
|---------|------------|------|-------|
| **Homepage** | Enhanced premium hero, emblem environment, trust pipeline tabs | Same layout and copy | Demo adds top **DEMO environment** banner only. |
| **Passport** | Holder flow visual, tabs, wallet sign-in | Same | Demo banner only. |
| **Verify** | Public verifier + simulated receipt panel (labeled simulated) | Same | Simulations explicitly labeled on both. |
| **Integration Studio** | Developer workspace shell | Same | No visual fork observed. |
| **Launchpad** | Partner operations pipeline + sign-in | Same | Demo banner only. |
| **Navigation** | Connect + Launch App on both captures | Connect + Launch App | Production nav is **cleaner** (no demo banner). |

### Production strengths (keep)

- No demo banner on canonical product URL.
- Compact sign-in messaging on homepage when OAuth unavailable (PR #716).
- Functional trust pipeline tabs with institutional copy (not dead controls).

### Demo strengths already on Production (post #716)

- Dimensional hero emblem and atmosphere.
- Verification composition storytelling strip.
- Institutional homepage sections below the fold (shared codebase).

## 3. Five highest-value gaps (actionable)

1. **Shared atmospheric depth on holder/partner shells** — Homepage has grid/atmosphere; Passport and Launchpad use flat black shells. Extend **calm-tier** atmosphere via shared primitives (not hero clone).
2. **Motion consistency** — `lib/design/abraxasMotion.ts` defines tiers; passport protocol visuals are static. Apply **Reveal** stagger to holder flow steps (respect `prefers-reduced-motion`).
3. **Deployment drift discipline** — Different deployment IDs imply independent promote cadence; parity is **release process**, not a second UI codebase.
4. **Environment labeling** — Demo banner must remain demo-only; Production should never show simulated/demo labels except on explicitly labeled simulation components (already true on verify panels).
5. **Cross-route visual continuity** — Reuse emblem/brand tokens and panel depth from `globals.defi-cinematic.css` / premium hero on product journeys without changing IA.

## 4. Proposed milestone 1 (this PR)

**Scope:** Shared visual foundation + Passport calm atmosphere + staggered holder-flow motion.

**Out of scope:** Backend, Supabase, Vercel env, Good Trouble, new dashboards, homepage layout changes, mock data in Production.

**Success:** Production (and demo, same build) feel visually continuous from homepage → Passport without duplicating demo banner or simulation data.
