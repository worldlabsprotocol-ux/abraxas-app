// FILE: lib/sui/zklogin/testJwt.ts
// Minimal JWT fixtures for zkLogin address derivation tests (unsigned, not for verification).

export function fakeGoogleIdToken(payload: {
  sub: string;
  aud: string;
  iss?: string;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: payload.sub,
      aud: payload.aud,
      iss: payload.iss ?? "https://accounts.google.com",
    }),
  ).toString("base64url");
  return `${header}.${body}.test-signature`;
}
