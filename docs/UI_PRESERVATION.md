# Homepage UI Preservation — Repository Enforcement

**The repository enforces the homepage baseline. You do not need to remember a merge process.**

**Approved reference:** https://abraxas-app-git-cursor-ph-f13dce-worldlabsprotocol-uxs-projects.vercel.app/  
**Single source of truth:** `scripts/homepage-guard/manifest.json`  
**Baseline snapshots:** `scripts/homepage-guard/baseline/`

---

## How it works

Every PR runs `npm run check:homepage-guard` in CI. The guard:

1. Compares protected files to committed baseline snapshots (byte-for-byte hashes).
2. Verifies critical markers (hero centering, Protocol in Action media, CSS tokens).
3. Verifies protected assets exist and match baseline.
4. **Fails** if anything regressed — with a report of exactly what changed.
5. **Fails** if protected paths were edited in the PR without `[ui-change]` in the title or description.

There is **no silent bypass**. Accidental homepage edits cannot merge.

---

## Intentional redesign (only path to change the homepage)

1. Add **`[ui-change]`** to the PR title or description.
2. Make design edits to protected files.
3. Run **`npm run homepage:baseline:refresh`** and commit updated snapshots under `scripts/homepage-guard/baseline/`.
4. CI passes when working tree matches the new baseline.

Local refresh uses the npm script (includes `--approved`). In automation, set `UI_APPROVED=true`.

---

## Protected surface (manifest-driven)

See `scripts/homepage-guard/manifest.json` for the canonical list:

- All `components/home/*` homepage sections
- `components/redesign/RedesignHome.tsx`, `AbraxasBootScreen.tsx`
- `lib/home/protocolProof*.ts`, `ecosystemContent.ts`
- `app/globals.css` → `abx-home-*` block only (extracted to baseline)
- Referenced public assets (e.g. `/icon-48.png`)

**Do not edit the manifest without `[ui-change]`.**

---

## Commands

```bash
npm run check:homepage-guard      # CI + pre-push — fails on any drift
npm run check:homepage            # structural invariant tests
npm run homepage:baseline:refresh # after approved [ui-change] redesign
```

---

## Root cause (why enforcement exists)

| Cause | Enforcement |
|-------|-------------|
| Feature branches from stale `main` | Baseline snapshots in repo; CI fails on drift |
| Agents drop "unused" image imports | Marker checks for `ProofMediaMark`, `PROTOCOL_PROOF_LOGOS` |
| Partial merges | Full-file baseline comparison |
| No CI guard | `check:homepage-guard` required in `.github/workflows/ci.yml` |

---

## Design invariants (human-readable summary)

1. **Hero** — centered (`abx-home-hero`, shell `textAlign` / `alignItems` center).
2. **Protocol in Action** — all partner media via `ProofMediaMark` + `PROTOCOL_PROOF_LOGOS`.
3. **Typography / spacing** — `abx-home-*` CSS block unchanged unless `[ui-change]` + baseline refresh.

---

## Restore from regression

If CI reports drift and the change was accidental:

```bash
git checkout HEAD -- components/home/HomeProtocolInAction.tsx  # example
npm run check:homepage-guard
```

Or restore entire baseline from last good commit:

```bash
git checkout HEAD -- scripts/homepage-guard/baseline/
npm run homepage:baseline:refresh  # only if working tree is the approved design
```
