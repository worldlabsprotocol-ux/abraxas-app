// FILE: lib/partner/hostedHandoff/examples.ts
// Copyable HTTPS examples. No SDK required for the canonical route.

export function hostedHandoffHttpExamples(): Record<string, string> {
  return {
    universal_https: `POST https://abraxasworld.xyz/api/v1/partner-handoff
Authorization: Bearer YOUR_SANDBOX_API_KEY
Content-Type: application/json
X-Abraxas-Application-Id: YOUR_APP_ID

{"runtime":"universal_https"}

# Response hosted_url contains only verify_request.
# GET /api/v1/partner-handoff/{ref} then kit.verifyReceiptId(public_receipt_id).
`,
    nextjs: `// app/api/handoff/route.ts — server only
export async function POST() {
  const res = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/partner-handoff", {
    method: "POST",
    headers: {
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
      "content-type": "application/json",
      "x-abraxas-application-id": process.env.ABRAXAS_APP_ID,
    },
    body: JSON.stringify({ runtime: "nextjs" }),
  });
  return Response.json(await res.json());
}
`,
    express: `app.post("/handoff", async (_req, res) => {
  const created = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/partner-handoff", {
    method: "POST",
    headers: {
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
      "content-type": "application/json",
      "x-abraxas-application-id": process.env.ABRAXAS_APP_ID,
    },
    body: JSON.stringify({ runtime: "express" }),
  });
  res.json(await created.json());
});
`,
    wix_velo: `// backend/handoff.web.js — Wix frontend must call this module only
import { fetch } from "wix-fetch";
import { getSecret } from "wix-secrets-backend";

export async function createHandoff() {
  const res = await fetch((await getSecret("ABRAXAS_BASE_URL")) + "/api/v1/partner-handoff", {
    method: "post",
    headers: {
      authorization: "Bearer " + (await getSecret("ABRAXAS_SANDBOX_API_KEY")),
      "content-type": "application/json",
      "x-abraxas-application-id": await getSecret("ABRAXAS_APP_ID"),
    },
    body: JSON.stringify({ runtime: "wix_velo" }),
  });
  return res.json();
}
`,
    serverless: `export default async function handler() {
  const res = await fetch(process.env.ABRAXAS_BASE_URL + "/api/v1/partner-handoff", {
    method: "POST",
    headers: {
      authorization: "Bearer " + process.env.ABRAXAS_SANDBOX_API_KEY,
      "content-type": "application/json",
      "x-abraxas-application-id": process.env.ABRAXAS_APP_ID,
    },
    body: JSON.stringify({ runtime: "serverless" }),
  });
  return new Response(JSON.stringify(await res.json()), { headers: { "content-type": "application/json" } });
}
`,
    mobile_https: `# Mobile / deep-link return
# 1. Backend creates the handoff (never the app binary).
# 2. Open hosted_url in the system browser.
# 3. Allowlisted HTTPS/deep-link return is a completion signal only.
# 4. App asks your backend to GET /api/v1/partner-handoff/{ref} and verifyReceiptId.
# Query parameters must not carry partner, policy, callback, receipt, or wallet fields.
`,
  };
}
