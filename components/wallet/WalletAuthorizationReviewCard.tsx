"use client";
// FILE: components/wallet/WalletAuthorizationReviewCard.tsx

import type { WalletActionChallengeDisplay } from "@/lib/auth/ephemeralWallet/actionDisplayContext";
import type { WalletSignInChallengeDisplay } from "@/lib/auth/ephemeralWallet/signInDisplayContext";
import { formatWalletAuthorizationExpires } from "@/lib/auth/ephemeralWallet/protocolEnvelope";
import styles from "./WalletAuthorizationReviewCard.module.css";

function shortWallet(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function WalletSignInReviewCard(props: { display: WalletSignInChallengeDisplay }) {
  const { display } = props;
  return (
    <div className={styles.card} role="group" aria-label="Sign-in request from Abraxas">
      <div className={styles.head}>
        <span className={styles.shield} aria-hidden />
        <div>
          <p className={styles.title}>{display.action_title}</p>
          <p className={styles.summary}>{display.summary}</p>
        </div>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Requested by</dt>
          <dd>{display.requested_by}</dd>
        </div>
        <div>
          <dt>Wallet</dt>
          <dd>{shortWallet(display.wallet_address)}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{formatWalletAuthorizationExpires(display.expires_at)}</dd>
        </div>
      </dl>
      <p className={styles.sectionLabel}>This sign-in message only</p>
      <ul className={styles.assurances}>
        {display.funds_lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className={styles.footer}>Confirm in your wallet only if you started this sign-in.</p>
    </div>
  );
}

export function WalletScopedAuthorizationReviewCard(props: { display: WalletActionChallengeDisplay }) {
  const { display } = props;
  return (
    <div className={styles.card} role="group" aria-label="Authorization request from Abraxas">
      <div className={styles.head}>
        <span className={styles.shield} aria-hidden />
        <div>
          <p className={styles.title}>{display.action_title}</p>
          <p className={styles.summary}>{display.authorization_summary}</p>
        </div>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Recipient</dt>
          <dd>{display.recipient}</dd>
        </div>
        {display.policy_label ? (
          <div>
            <dt>Policy</dt>
            <dd>
              {display.policy_label}
              {display.policy_id ? ` (${display.policy_id})` : ""}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Environment</dt>
          <dd>{display.environment}</dd>
        </div>
        <div>
          <dt>Requested by</dt>
          <dd>{display.requested_by}</dd>
        </div>
        <div>
          <dt>Wallet</dt>
          <dd>{shortWallet(display.wallet_address)}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{formatWalletAuthorizationExpires(display.expires_at)}</dd>
        </div>
      </dl>
      <p className={styles.sectionLabel}>What happens afterward</p>
      <p className={styles.consequence}>{display.consequence_line}</p>
      <p className={styles.sectionLabel}>Financial safety (this message)</p>
      <ul className={styles.assurancesMuted}>
        {display.financial_safety_lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
