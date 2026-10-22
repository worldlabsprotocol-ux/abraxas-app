"use client";

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { humanizeHolderRequestedOutcome } from "@/lib/partner/holderExperience/presentation";
import { WALLET_CONTROL_RESULT_FAMILY } from "@/lib/walletControl/contract";

const FONT = ABRAXAS_FONT_SANS;

export function HolderWalletControlReviewPanel({
  partnerName,
  environment,
  onContinue,
}: {
  partnerName: string;
  environment: "sandbox" | "production";
  onContinue: () => void;
}) {
  const outcome = humanizeHolderRequestedOutcome(WALLET_CONTROL_RESULT_FAMILY);

  return (
    <section className="abx-holder-wallet-review" aria-labelledby="holder-wallet-review-heading">
      <h2 id="holder-wallet-review-heading" className="abx-holder-wallet-review__title">
        Confirm wallet control
      </h2>
      <p className="abx-holder-wallet-review__lead">
        Sign a message to prove you control this wallet. No funds will move, and no spending permission is requested.
      </p>

      <dl className="abx-holder-wallet-review__facts">
        <div>
          <dt>Requested by</dt>
          <dd>{partnerName}</dd>
        </div>
        <div>
          <dt>Environment</dt>
          <dd>{environment === "production" ? "Production" : "Sandbox"}</dd>
        </div>
        <div>
          <dt>If you approve later</dt>
          <dd>{outcome}</dd>
        </div>
        <div>
          <dt>Signing does not</dt>
          <dd>Share results with the application, authorize transactions, or grant spending access.</dd>
        </div>
      </dl>

      <p className="abx-holder-wallet-review__note" style={{ fontFamily: FONT }}>
        Only the approved verification result is shared after your explicit consent.
      </p>

      <Btn size="sm" onClick={onContinue}>
        Continue to verify wallet
      </Btn>
    </section>
  );
}
