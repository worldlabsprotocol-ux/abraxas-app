"use client";
// FILE: components/account/EphemeralWorkspaceSessionRail.tsx

import { useWallet } from "@solana/wallet-adapter-react";
import styles from "./EphemeralDeveloperWorkspace.module.css";

export type WorkspaceSessionRailState =
  | "loading"
  | "session_expired"
  | "sign_in_required"
  | "authenticated"
  | "workspace_ready"
  | "authorization_required"
  | "disconnected";

export function EphemeralWorkspaceSessionRail(props: {
  state: WorkspaceSessionRailState;
  walletAddress: string | null;
  sessionExpiresAt: string | null;
  workspaceExpiresAt: string | null;
}) {
  const { connected } = useWallet();
  const sessionExpiryLabel = props.sessionExpiresAt
    ? new Date(props.sessionExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  let primary = "Checking session";
  let detail = "Confirming your Abraxas access.";
  let tone: "info" | "success" | "warn" | "auth" = "info";

  switch (props.state) {
    case "session_expired":
      primary = "Session expired";
      detail = "Connect your wallet to continue.";
      tone = "warn";
      break;
    case "sign_in_required":
      primary = "Sign-in required";
      detail = connected
        ? "Your wallet is connected. Complete the message signature to open this workspace."
        : "Connect your wallet, then sign in to continue.";
      tone = "auth";
      break;
    case "authenticated":
      primary = "Authenticated";
      detail = props.walletAddress
        ? `Wallet ${props.walletAddress.slice(0, 4)}…${props.walletAddress.slice(-4)}`
        : "Temporary Abraxas session active.";
      tone = "success";
      break;
    case "workspace_ready":
      primary = "Workspace ready";
      detail = props.workspaceExpiresAt
        ? `Sandbox active until ${new Date(props.workspaceExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : "Sandbox workspace is active.";
      tone = "success";
      break;
    case "authorization_required":
      primary = "Authorization required";
      detail = "Review the verification request before signing in Phantom.";
      tone = "auth";
      break;
    case "disconnected":
      primary = "Wallet disconnected";
      detail = connected
        ? "Reconnect your wallet to authorize verification."
        : "Connect Phantom to authorize verification when you are ready.";
      tone = "warn";
      break;
    default:
      break;
  }

  if (props.state === "authenticated" && sessionExpiryLabel) {
    detail = `${detail} Session ends around ${sessionExpiryLabel}.`;
  }

  return (
    <div className={`${styles.sessionRail} ${styles[`sessionRail_${tone}`]}`} role="status">
      <div className={styles.sessionRailPrimary}>{primary}</div>
      <div className={styles.sessionRailDetail}>{detail}</div>
    </div>
  );
}
