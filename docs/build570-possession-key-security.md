# Possession key browser security (Build #570)

## What Abraxas stores

- Server: possession **public** key only.
- Browser: private signing material in session storage and, if the holder opts in, IndexedDB on the same origin.

## IndexedDB limitations

IndexedDB persistence is **not** hardware backed protection. Any script running on the origin with storage access, or a compromised browser profile, could read stored secret key bytes. It improves convenience across refresh on the same browser profile, not security against device theft or malware.

Abraxas does not describe IndexedDB as a secure enclave or HSM equivalent.

## Registration ordering

Private key material is committed to session or IndexedDB **only after** the server confirms public key registration. Failed rotation or network errors keep the prior usable key unless reconciliation proves the new public key is already registered.

## Web Crypto nonextractable keys

The current possession proof uses Ed25519 detached signatures compatible with server verification (tweetnacl layout). Browser Web Crypto Ed25519 support does not yet provide a drop in nonextractable signing path that matches this protocol without additional custody or export steps. Build #570 keeps the existing cryptographic contract and documents limitations rather than introducing a parallel key format.

## Account recovery

Exported credentials and device possession keys are not account recovery. Holders must register a possession key again on a new device after authorized sign in.
