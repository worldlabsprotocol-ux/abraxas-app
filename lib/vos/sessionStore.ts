// FILE: lib/vos/sessionStore.ts
// Anonymous session identity. Persists across refresh via localStorage.
// Backend-ready: swap localStorage for Supabase auth later — same interface.

const KEY = "abraxas_session_v1";

export interface Session {
  id:        string;     // anonymous user id, e.g. "anon_a3f5..."
  createdAt: string;     // ISO timestamp
  label:     string;     // short display name, e.g. "ANON-A3F5"
}

function genId(): string {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += a[Math.floor(Math.random() * a.length)];
  return `anon_${s}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const sessionStore = {
  get(): Session {
    if (!isBrowser()) {
      return { id: "anon_server", createdAt: new Date().toISOString(), label: "SERVER" };
    }
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { return JSON.parse(raw) as Session; } catch { /* fall through */ }
    }
    const id = genId();
    const fresh: Session = {
      id,
      createdAt: new Date().toISOString(),
      label:     id.replace("anon_", "").slice(0, 4).toUpperCase(),
    };
    localStorage.setItem(KEY, JSON.stringify(fresh));
    return fresh;
  },

  reset(): Session {
    if (!isBrowser()) return this.get();
    localStorage.removeItem(KEY);
    return this.get();
  },
};
