// FILE: lib/partner/webhooks/webhookEndpointValidation.ts
// SSRF-safe HTTPS webhook endpoint validation.

import { isIP } from "net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "metadata",
]);

const METADATA_IPV4 = "169.254.169.254";

export function parseWebhookEndpointUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

function isPrivateOrLocalIp(address: string): boolean {
  if (address === "::1" || address === "0:0:0:0:0:0:0:1") return true;
  if (address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;

  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    const parts = address.split(".").map(Number);
    if (parts[0] === 127) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (address === "0.0.0.0") return true;
    if (address === METADATA_IPV4) return true;
  }
  return false;
}

export function isWebhookEndpointStructurallyAllowed(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.search) return false;
  if (url.hash) return false;

  const hostname = url.hostname.trim().toLowerCase();
  if (!hostname) return false;
  if (BLOCKED_HOSTNAMES.has(hostname)) return false;
  if (hostname.endsWith(".localhost") || hostname.endsWith(".local")) return false;
  if (hostname === METADATA_IPV4) return false;
  if (isPrivateOrLocalIp(hostname)) return false;

  return true;
}

export async function resolveWebhookEndpointAddresses(hostname: string): Promise<string[]> {
  const dns = await import("dns").then(m => m.promises);
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map(entry => entry.address);
}

export async function assertWebhookEndpointResolvable(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase();
  if (isPrivateOrLocalIp(hostname)) {
    throw new Error("webhook_endpoint_private_ip");
  }

  const addresses = await resolveWebhookEndpointAddresses(hostname);
  if (!addresses.length) throw new Error("webhook_endpoint_dns_failed");
  for (const address of addresses) {
    if (isPrivateOrLocalIp(address)) {
      throw new Error("webhook_endpoint_resolves_private");
    }
  }
}

export async function validateWebhookEndpointUrl(raw: string): Promise<
  | { ok: true; url: URL }
  | { ok: false; error: string }
> {
  const url = parseWebhookEndpointUrl(raw);
  if (!url) return { ok: false, error: "invalid_url" };
  if (!isWebhookEndpointStructurallyAllowed(url)) {
    return { ok: false, error: "endpoint_not_allowed" };
  }

  try {
    await assertWebhookEndpointResolvable(url);
    return { ok: true, url };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "endpoint_resolution_failed";
    return { ok: false, error: msg };
  }
}

export function normalizeWebhookEndpointUrl(url: URL): string {
  const path = url.pathname.endsWith("/") && url.pathname !== "/"
    ? url.pathname.slice(0, -1)
    : url.pathname;
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${url.hostname}${port}${path || ""}`;
}
