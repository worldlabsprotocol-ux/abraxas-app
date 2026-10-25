# Verifier npm pack artifacts (Build #831)

| File | Purpose |
|------|---------|
| `abraxas-independent-verifier-0.1.1.tgz` | Installable package (no monorepo paths) |
| `abraxas-independent-verifier-0.1.1.tgz.sha256` | Integrity check |

Regenerate:

```bash
npm run build831:pack-verifier
```

Verify:

```bash
cd artifacts/npm && shasum -a 256 -c abraxas-independent-verifier-0.1.1.tgz.sha256
```

Install in your app:

```bash
npm install /path/to/abraxas-independent-verifier-0.1.1.tgz
```
