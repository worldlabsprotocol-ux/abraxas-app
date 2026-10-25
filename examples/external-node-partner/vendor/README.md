# Verifier package (self-contained)

Place **`abraxas-independent-verifier-0.1.1.tgz`** and **`.sha256`** in this folder before `npm install`.

## Obtain the archive (do not use monorepo paths)

**First design partner (typical):** Abraxas sends the `.tgz` and `.sha256` through a secure channel under a written evaluation agreement. Verify checksum, then place both files in this folder.

**Optional — after founder-approved public GitHub Release:**

```bash
curl -LO https://github.com/worldlabsprotocol-ux/abraxas-app/releases/download/independent-verifier-v0.1.1/abraxas-independent-verifier-0.1.1.tgz
curl -LO https://github.com/worldlabsprotocol-ux/abraxas-app/releases/download/independent-verifier-v0.1.1/abraxas-independent-verifier-0.1.1.tgz.sha256
mv abraxas-independent-verifier-0.1.1.tgz* ./
shasum -a 256 -c abraxas-independent-verifier-0.1.1.tgz.sha256
```

**From Abraxas secure handoff:** copy the same two files into this directory.

Trust anchor JSON is **separate** — see `../trust-anchor.demo.json` (out-of-band issuer trust, not bundled here).
