// FILE: lib/idv/types.ts

export interface VeriffDecisionInput {
  id: string;
  status: string;
  vendorData?: string;
  person?: {
    firstName?: string;
    lastName?: string;
    nationality?: string;
    /** Authoritative document DOB (YYYY-MM-DD) — internal IDV only, never exposed to partners. */
    dateOfBirth?: string;
  };
  document?: {
    type?: string;
    country?: string;
    state?: string;
  };
}
