# CMN Designs · PSA Pokémon — photo drop folder

Add your slab photos here in VS Code (drag and drop into this folder).

## Folder layout

```
public/assets/cmn-designs/pokemon/
├── registry-card.webp     ← Explorer + verify card thumbnail (required first)
├── registry-card.jpg      ← OK instead of .webp if you prefer
└── gallery/
    ├── 01.webp
    ├── 02.webp
    ├── …
    └── 30.webp
```

Paths are served as `/assets/cmn-designs/pokemon/...` on the site.

## Naming rules

| File | Purpose |
|------|---------|
| `registry-card.webp` | Hero + registry grid image. Pick your strongest slab or group shot. |
| `gallery/01.webp` … `gallery/30.webp` | Individual cards, front of slab. Two-digit numbers only (`01`, not `1`). |

`.jpg` / `.jpeg` also work if you use the same names.

## Size / “4MB limit”

- Abraxas **document uploads** cap at **10MB** per file (onboarding forms). This folder is **static hosting** — no per-file 4MB rule in the app.
- If something (Git, email, cloud sync) complains about size, compress before adding:
  - Target **200–500 KB** per photo (WebP or JPEG, ~1200–1600px wide).
  - [squoosh.app](https://squoosh.app) or Photoshop “Save for Web” work well.
- **30 photos × 500 KB ≈ 15 MB total** — fine for the repo if compressed.

## After you add photos

1. Save files in this folder.
2. Run `npm run dev` and open `/case-studies/cmn-pokemon-collection`.
3. Missing files are skipped automatically — you do not need all 30 on day one.

## Optional: card manifest

Edit `lib/cmnPokemonCaseStudy.ts` → `CMN_POKEMON_CARDS` to list each card name, PSA grade, and cert number when ready.
