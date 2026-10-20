"use client";
// FILE: components/wallet/WalletMessageSafetyReview.tsx

import styles from "./WalletMessageSafetyReview.module.css";

export function WalletMessageSafetyReview(props: {
  title: string;
  summary: string;
  fundsLines: readonly string[];
  requestedBy: string;
  walletAddress?: string | null;
  footerNote?: string;
}) {
  return (
    <div className={styles.card} role="group" aria-label="What you will sign">
      <div className={styles.head}>
        <span className={styles.shield} aria-hidden />
        <div>
          <p className={styles.title}>{props.title}</p>
          <p className={styles.summary}>{props.summary}</p>
        </div>
      </div>
      <ul className={styles.assurances}>
        {props.fundsLines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className={styles.footer}>
        Requested by {props.requestedBy}.
        {props.walletAddress ? ` Wallet ${props.walletAddress.slice(0, 4)}…${props.walletAddress.slice(-4)}.` : ""}
        {props.footerNote ? ` ${props.footerNote}` : " Confirm only if you initiated this request."}
      </p>
    </div>
  );
}
