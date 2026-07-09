// FILE: lib/idv/types.ts

export interface VeriffDecisionInput {
  id: string;
  status: string;
  vendorData?: string;
  person?: {
    firstName?: string;
    lastName?: string;
    nationality?: string;
  };
  document?: {
    type?: string;
    country?: string;
    state?: string;
  };
}
