// FILE: lib/partner/webhooks/webhookEndpointFormValidation.ts
// Client-safe structural HTTPS endpoint checks (no DNS).

export function isWebhookHttpsEndpointWellFormed(raw: string): { ok: true } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter the partner HTTPS webhook URL." };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid URL starting with https://." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Webhook URL must use HTTPS." };
  }
  if (url.search) {
    return { ok: false, error: "Query strings are not allowed in webhook URLs." };
  }
  if (url.hash) {
    return { ok: false, error: "URL fragments (#) are not allowed." };
  }
  if (!url.hostname.trim()) {
    return { ok: false, error: "Hostname is required." };
  }

  return { ok: true };
}

export function webhookEndpointFormErrorMessage(error: string): string {
  switch (error) {
    case "partner_id_required": return "Enter an onboarded partner ID.";
    case "partner_not_found": return "That partner ID is not registered. Use a real onboarded partner.";
    case "invalid_url": return "Enter a valid URL starting with https://.";
    case "https_required": return "Webhook URL must use HTTPS.";
    case "endpoint_not_allowed": return "That endpoint URL is not allowed.";
    case "webhook_endpoint_private_ip": return "Private or local IP addresses are not allowed.";
    case "webhook_endpoint_resolves_private": return "Hostname resolves to a private or unsafe address.";
    case "webhook_disabled": return "Enable webhook delivery for this partner before retrying.";
    case "event_not_failed": return "Only failed deliveries can be manually retried.";
    case "event_not_found": return "Delivery record not found.";
    default: return error.replace(/_/g, " ");
  }
}
