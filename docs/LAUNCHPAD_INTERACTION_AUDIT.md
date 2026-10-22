# Abraxas action-workflow interaction audit

## Standard

**One active task. One central workspace. One clear next action.**

Applies to sequential trust-sensitive operations (Launchpad, Integration Studio stages, holder verify, wallet sign-in). Does not apply to docs, long tables, or read-only dashboards.

## Launchpad — root cause (pre–focused workspace)

| Layer | Source | Problem |
|-------|--------|-----------|
| 8-stage lifecycle | `PartnerLifecycleControlRoomVisual` above shell | Competes with user task flow; reads as primary navigation |
| 5-step merchant journey | `PartnerLaunchpadMerchantJourney` inside `PartnerApplicationOverview` | Second progress system in canvas |
| Step pills | `PartnerLaunchpadClient` when `!journey` | Third navigator when journey loading |
| Mode C rail | `ModeCCommandRail` | Status duplicated in inspector |
| Overview + activity | `PartnerApplicationOverview`, activity table | Pushes sign-in and step actions below fold |
| Advanced stack | Developer details accordion | Correct pattern; must stay below active step only |

## Reusable primitives

| Primitive | Location | Reuse |
|-----------|----------|--------|
| Institutional workspace shell | `AbxInstitutionalWorkspaceShell` | Launchpad, Integration Studio |
| Horizontal stage nav | `IntegrationStudioWorkspace`, `LaunchpadFocusedStepNav` | Same visual language |
| Stage footer | `IntegrationStudioStageFooter`, `LaunchpadStageFooter` | Back / continue |
| Inspector rail | `LaunchpadOperationalInspector`, Integration Studio inspector | Milestones, telemetry, activity |
| Journey resolution | `journeyState.ts` | Authoritative 5-step machine (unchanged) |

## Safe migration boundaries

- Do **not** merge sandbox/production security states.
- Do **not** auto-advance consent or wallet authorization.
- Keep hosted handoff, harness, and production review APIs unchanged.
- Institutional template (`institutionalFocus`) keeps task onboarding; gains same nav/footer where applicable.

## Other workflows (ranked for later)

1. **Holder `/partner/verify`** — wallet steps already staged; align copy and single active panel.
2. **Developer Workspace** — handoff to Launchpad/Studio; avoid third progress model.
3. **Account native onboarding** — sequential; reuse stage footer pattern.
4. **Receipt `/verify`** — inspection mode; scrolling OK.

## Integration Studio (#780–#783)

Stage-scoped canvas, hash navigation, inspector for ops — **reference implementation**. Launchpad focused workspace aligns to this model without removing Launchpad-specific steps (`verify` … `go_live`).

## Launchpad reference implementation (this PR)

| Change | Detail |
|--------|--------|
| Primary canvas | `LaunchpadFocusedStepNav`, `LaunchpadStageGuide`, stage-scoped panels, `LaunchpadStageFooter` |
| Removed from canvas | `PartnerLifecycleControlRoomVisual`, `PartnerApplicationOverview`, `ModeCCommandRail`, duplicate step pills, activity table |
| Inspector | Context rail, collapsible 8-stage milestones, integration activity table, timeline diagnostics |
| Journey | `journeyState.ts` unchanged; navigation still uses `navigateToStage` / URL `view` param |

## Ranked follow-ups

1. Holder `/partner/verify` wallet step chrome (same footer/nav pattern).
2. Developer Workspace entry — deep-link into Launchpad stage without a third progress model.
3. Native account onboarding sequential flows.
4. Receipt `/verify` inspection (scroll-first; no wizard).
