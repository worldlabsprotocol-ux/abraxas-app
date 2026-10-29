#!/usr/bin/env npx tsx
/**
 * Minimal external partner app — HTTPS to Abraxas, verify with @abraxas/independent-verifier.
 */
import { createServer } from "node:http";
import { URL } from "node:url";
import { loadConfig, loadTrustAnchorJson } from "./config.js";
import { createHostedHandoff, fetchPortableVerificationBundle } from "./abraxasHttp.js";
import { parseCallbackQuery } from "./callback.js";
import { getPending, putPending } from "./pendingStore.js";
import { loadPinnedTrustAnchor, verifyPortableBundle } from "./verifyPortable.js";

function html(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Abraxas external partner</title></head><body>${body}</body></html>`;
}

async function main() {
  const config = loadConfig();
  const pin = loadPinnedTrustAnchor(loadTrustAnchorJson(config.trustAnchorPath));

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", config.callbackBaseUrl);

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      });
      res.end(JSON.stringify({ ok: true, service: "external-node-partner" }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        html(
          `<h1>Abraxas wallet-control gate (external example)</h1>
<p><a href="/verify">Create verification request</a> — redirects holder to Abraxas hosted UI.</p>
<p>Callback: <code>${config.callbackBaseUrl}/callback</code> (must be allowlisted on your sandbox app).</p>`,
        ),
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/verify") {
      const returnUrl = `${config.callbackBaseUrl}/callback`;
      const created = await createHostedHandoff({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        applicationId: config.applicationId,
        bindingId: config.bindingId,
      });
      if (!created.ok) {
        res.writeHead(502, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: created.error, status: created.status }, null, 2));
        return;
      }
      await putPending({
        verify_request: created.verify_request,
        handoff_ref: created.handoff_ref,
        created_at: new Date().toISOString(),
      });
      res.writeHead(302, { location: created.hosted_url });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/callback") {
      const parsed = parseCallbackQuery(url.searchParams);
      if (!parsed.ok) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, errors: parsed.errors }, null, 2));
        return;
      }

      if (parsed.params.request_id) {
        const pending = await getPending(parsed.params.request_id);
        if (!pending) {
          res.writeHead(403, { "content-type": "application/json" });
          res.end(
            JSON.stringify(
              {
                ok: false,
                error: "callback_request_not_correlated",
                detail: "Persist verify_request before redirect; reject unknown request_id.",
              },
              null,
              2,
            ),
          );
          return;
        }
      }

      const portable = await fetchPortableVerificationBundle({
        baseUrl: config.baseUrl,
        receiptId: parsed.params.receipt_id,
      });
      if (!portable.ok) {
        res.writeHead(503, { "content-type": "application/json" });
        res.end(
          JSON.stringify(
            {
              ok: false,
              action: "indeterminate",
              error: portable.error,
              receipt_id: parsed.params.receipt_id,
            },
            null,
            2,
          ),
        );
        return;
      }

      const { verification, enforcement } = verifyPortableBundle({
        bundle: portable.bundle,
        pinnedTrustAnchor: pin,
        expectedPartnerId: config.expectedPartnerId,
        expectedPolicyId: config.expectedPolicyId,
        environment: config.verifyEnvironment,
      });

      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify(
          {
            ok: true,
            receipt_id: parsed.params.receipt_id,
            enforcement,
            cryptographically_authentic: verification.cryptographically_authentic,
            status_evidence_authentic: verification.status_evidence_authentic,
            currently_acceptable: verification.currently_acceptable,
            failure_codes: verification.failure_codes,
            callback_trusted: false,
            note: "Grant access only when enforcement.action === permit",
          },
          null,
          2,
        ),
      );
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(config.port, () => {
    console.log(`External partner example listening on ${config.callbackBaseUrl}`);
    console.log("Open / then /verify to start hosted handoff.");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
