# Homepage UI Preservation (Standing Rule)

**Approved baseline reference:**  
https://abraxas-app-git-cursor-ph-f13dce-worldlabsprotocol-uxs-projects.vercel.app/

**Baseline commit:** `9e5db2f` (`fix(home): restore centered typography and Protocol in Action images`)  
**Included in:** PR #89 (`cursor/phase0-security-fixes-d541`) — merge to `main` restores production homepage.

This is a **protected surface**. Functional engineering PRs must not change homepage visuals unless a redesign is explicitly requested.

---

## Design invariants (do not change without explicit redesign PR)

### 1. Hero layout

- Centered column alignment (`textAlign: center`, `alignItems: center` on `RedesignHome` shell).
- `abx-home-hero` and `abx-home-hero-actions` classes on hero section.
- Do **not** recenter the entire viewport differently or flatten visual hierarchy.

### 2. Protocol in Action

- All partner media assets must render via `PROTOCOL_PROOF_LOGOS` + `ProofMediaMark`.
- Cielo, Chickasaw, and Good Trouble images/logos must remain visible.
- Do **not** remove, replace, or hide assets because they appear "unused" in a refactor.

### 3. Homepage visual design

- Do **not** modify typography, spacing, image placement, cards, or section order during unrelated work.
- `abx-home-*` CSS in `app/globals.css` is part of the approved baseline.

---

## Protected files

Changes to these paths require homepage visual review (see checklist below):

```
app/globals.css                          (abx-home-* rules only)
components/redesign/RedesignHome.tsx
components/redesign/AbraxasBootScreen.tsx
components/home/HomeSharpHero.tsx
components/home/HomeProtocolInAction.tsx
components/home/HomeWhyAbraxas.tsx
components/home/HomeVerifyOnceDiagram.tsx
components/home/HomeVerificationPipeline.tsx
components/home/HomeTrustPillars.tsx
components/home/HomeRegulatedIndustries.tsx
components/home/HomeLiveStats.tsx
components/home/HomeDocsBrief.tsx
components/home/HomeRoadmapBrief.tsx
components/home/HomeRegistrySlideshow.tsx
lib/home/protocolProofLogos.ts
lib/home/protocolProofMedia.ts
lib/home/ecosystemContent.ts
public/assets/**                         (homepage proof media)
```

---

## PR guardrails

1. **Treat the homepage as protected** — unrelated PRs should not touch protected paths.
2. **Before merge:** run `npm run check:homepage` (static baseline tests).
3. **If a PR changes protected files unintentionally:** restore from baseline commit `9e5db2f` before merge.
4. **Never mix** visual redesigns with security, partner flow, or protocol hardening PRs.
5. **Optional visual evidence:** `SCREENSHOT_BASE=<preview-url> node scripts/capture-homepage-screenshots.mjs`

---

## UI regression checklist (per PR)

| Check | Pass? |
|-------|-------|
| `npm run check:homepage` | |
| PR does not modify protected paths (or redesign is intentional) | |
| Hero centered; CTAs visible | |
| Protocol in Action shows 3 proof cards **with images** | |
| Passport connector card shows media strip | |
| Section order unchanged in `RedesignHome.tsx` | |
| No deleted files under `lib/home/protocolProof*` | |

---

## Root cause: why this keeps happening

| Cause | What happens | Fix |
|-------|--------------|-----|
| **`main` behind feature branches** | Homepage restore landed on `cursor/homepage-ui-restore-d541` / Phase 0 branch but **not** on `main`. Production and new branches from `main` show the old text-only Protocol in Action cards. | Merge PR #89; branch new work from updated `main`. |
| **Agents optimize for the task given** | Security/partner PRs don't mention homepage → agent refactors nearby components or drops "unused" image imports. | Standing rule + protected paths + `check:homepage` in CI. |
| **False "unused asset" deletion** | `HomeProtocolInAction` lost `PROTOCOL_PROOF_LOGOS` import → images disappeared while cards still rendered. | Baseline tests assert `ProofMediaMark` + logo module imports. |
| **Multiple homepage branches** | `homepage-visual-refresh`, `homepage-trust-ux`, `robinhood-homepage`, etc. diverge and conflict at merge. | One approved baseline; redesigns get their own PR; no drive-by edits. |
| **Inline style → class migration partial** | Centering lived in `abx-home-*` CSS on one branch and inline styles on another; merges kept the wrong half. | Freeze baseline commit; restore full file set from `9e5db2f`, not piecemeal. |
| **No automated guard** | Regressions merged because nothing failed CI when images were removed. | `lib/home/homepageBaseline.test.ts` + PR checklist. |

**Not the cause:** Vercel, Next.js, ONNX, or security changes inherently breaking the homepage. Regressions are **merge discipline + missing guards**, not platform issues.

---

## Restore procedure (if regression detected)

```bash
git show 9e5db2f --stat   # verify file list
git checkout 9e5db2f -- \
  app/globals.css \
  components/home/ \
  components/redesign/RedesignHome.tsx \
  components/redesign/AbraxasBootScreen.tsx \
  lib/home/protocolProofLogos.ts \
  lib/home/protocolProofMedia.ts \
  lib/home/ecosystemContent.ts \
  lib/home/protocolProofLogos.test.ts \
  lib/home/ecosystemContent.test.ts

npm run check:homepage
```

Do not alter restored files beyond what is needed to resolve merge conflicts with legitimate functional changes.

---

## Related

- `docs/ENGINEERING_ROADMAP.md` — PR process includes homepage check
- `scripts/capture-homepage-screenshots.mjs` — visual evidence capture
- `lib/home/protocolProofLogos.test.ts` — asset path assertions
