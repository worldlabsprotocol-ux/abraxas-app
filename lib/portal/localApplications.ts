// FILE: lib/portal/localApplications.ts
// Client-side persistence when Supabase is not configured (local dev / demo).

export interface LocalPortalApplication {
  application_id: string;
  contact_email: string;
  asset_name: string;
  asset_class: string;
  jurisdiction?: string;
  evidence_scope?: string;
  description?: string;
  status: string;
  created_at: string;
  linked_wallet?: string;
  deal_status?: string;
  settlement_amount_usdc?: number;
  settlement_tx_digest?: string;
}

const STORAGE_KEY = "abraxas_portal_applications";

export function saveLocalPortalApplication(app: LocalPortalApplication): void {
  if (typeof window === "undefined") return;
  const existing = loadLocalPortalApplications();
  const next = existing.filter(a => a.application_id !== app.application_id);
  next.unshift(app);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 20)));
}

export function updateLocalPortalApplication(
  applicationId: string,
  patch: Partial<LocalPortalApplication>,
): LocalPortalApplication | null {
  if (typeof window === "undefined") return null;
  const apps = loadLocalPortalApplications();
  const idx = apps.findIndex(a => a.application_id === applicationId);
  if (idx < 0) return null;
  const updated = { ...apps[idx]!, ...patch };
  apps[idx] = updated;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  return updated;
}

export function loadLocalPortalApplications(): LocalPortalApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalPortalApplication[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findLocalPortalApplication(
  applicationId: string,
  email: string,
): LocalPortalApplication | null {
  const normalized = email.trim().toLowerCase();
  return loadLocalPortalApplications().find(
    a => a.application_id === applicationId && a.contact_email.trim().toLowerCase() === normalized,
  ) ?? null;
}
