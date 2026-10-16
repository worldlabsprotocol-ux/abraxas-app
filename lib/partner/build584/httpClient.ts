// FILE: lib/partner/build584/httpClient.ts
// Cookie-aware Launchpad HTTP client for live institutional acceptance (no secret logging).

export type LiveHttpResponse = {
  status: number;
  ok: boolean;
  url: string;
  body: unknown;
};

export class LiveLaunchpadHttpClient {
  private readonly cookieJar = new Map<string, string>();

  constructor(readonly baseUrl: string) {}

  get cookieHeader(): string {
    return Array.from(this.cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private ingestSetCookie(setCookie: string | null): void {
    if (!setCookie) return;
    const first = setCookie.split(";")[0]?.trim();
    if (!first) return;
    const eq = first.indexOf("=");
    if (eq <= 0) return;
    this.cookieJar.set(first.slice(0, eq), first.slice(eq + 1));
  }

  async request(path: string, init: RequestInit = {}): Promise<LiveHttpResponse> {
    const url = path.startsWith("http") ? path : `${this.baseUrl.replace(/\/$/, "")}${path}`;
    const headers = new Headers(init.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");
    if (this.cookieJar.size > 0) headers.set("cookie", this.cookieHeader);

    const res = await fetch(url, { ...init, headers, redirect: "manual" });
    this.ingestSetCookie(res.headers.get("set-cookie"));

    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 500);
    }

    return { status: res.status, ok: res.ok, url, body };
  }
}
