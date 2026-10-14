# Abraxas self-hosted fonts

WOFF2 files are copied from [@fontsource](https://fontsource.org/) packages (OFL-licensed, same families as prior `next/font/google` setup):

- Plus Jakarta Sans (400–800)
- DM Sans (400–700)
- JetBrains Mono (400–600)

Regenerate after bumping `@fontsource/*` in `package.json`:

```bash
npm run sync:fonts
```
