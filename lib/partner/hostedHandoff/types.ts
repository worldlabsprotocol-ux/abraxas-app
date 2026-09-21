// FILE: lib/partner/hostedHandoff/types.ts

import type { PartnerFlowAction } from "@/lib/partner/launchpad/partnerFlowRequest/contract";
import type { HostedHandoffRuntime, HostedHandoffStatus } from "./contract";

export interface HostedHandoffRecord {
  id: string;
  handoff_ref: string;
  verify_request: string;
  application_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  action: PartnerFlowAction;
  purpose: string;
  callback_ref: string;
  runtime: HostedHandoffRuntime;
  environment: "sandbox" | "production";
  status: HostedHandoffStatus;
  nonce_hash: string;
  issued_at: string;
  expires_at: string;
  consumed_at: string | null;
  public_receipt_id: string | null;
  fixture: boolean;
}

export interface HostedHandoffPublicView {
  version: string;
  notice: string;
  hosted_url: string;
  handoff_ref: string;
  verify_request: string;
  runtime: HostedHandoffRuntime;
  environment: "sandbox" | "production";
  status: HostedHandoffStatus;
  expires_at: string;
  checklist: readonly string[];
  callback_bound: true;
  must_reverify: true;
  is_grant: false;
  activates_production: false;
  activates_mainnet: false;
  issues_credentials: false;
}

export interface HostedHandoffPartnerView extends HostedHandoffPublicView {
  public_receipt_id: string | null;
  action: PartnerFlowAction;
  policy_version: number;
}
