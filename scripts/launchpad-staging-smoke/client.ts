// FILE: scripts/launchpad-staging-smoke/client.ts
// HTTP client for Launchpad staging smoke tests with secret redaction.

import type { StagingTargetConfig } from "./guards";
import { redactSensitiveText } from "./redact";

export interface SmokeResponse {
  status: number;
  ok: boolean;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  rawText: string;
}

export class LaunchpadStagingClient {
  readonly baseUrl: string;
  private readonly bypass?: string;
  private cookieJar = new Map<string, string>();

  constructor(private readonly config: StagingTargetConfig) {
    this.baseUrl = config.targetUrl;
    this.bypass = config.vercelProtectionBypass;
  }

  get cookies(): string {
    return [...this.cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  setCookieFromResponse(setCookie: string | null): void {
    if (!setCookie) return;
    const parts = setCookie.split(";")[0]?.trim();
    if (!parts) return;
    const eq = parts.indexOf("=");
    if (eq <= 0) return;
    this.cookieJar.set(parts.slice(0, eq), parts.slice(eq + 1));
  }

  async request(
    path: string,
    init: RequestInit & { headers?: Record<string, string> } = {},
  ): Promise<SmokeResponse> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(init.headers ?? {}),
    };

    if (this.bypass) {
      headers["x-vercel-protection-bypass"] = this.bypass;
    }
    if (this.cookieJar.size > 0) {
      headers.cookie = this.cookies;
    }

    const res = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
    });

    const setCookie = res.headers.get("set-cookie");
    this.setCookieFromResponse(setCookie);

    const rawText = await res.text();
    let body: unknown = rawText;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = rawText;
    }

    const headerObj: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headerObj[key] = value;
    });

    return {
      status: res.status,
      ok: res.ok,
      url: res.url || url,
      headers: headerObj,
      body,
      rawText: redactSensitiveText(rawText),
    };
  }

  async getJson(path: string, headers: Record<string, string> = {}): Promise<SmokeResponse> {
    return this.request(path, { method: "GET", headers });
  }

  async postJson(path: string, body: unknown, headers: Record<string, string> = {}): Promise<SmokeResponse> {
    return this.request(path, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }

  async delete(path: string): Promise<SmokeResponse> {
    return this.request(path, { method: "DELETE" });
  }
}
