"use client";

import dynamic from "next/dynamic";

/**
 * WalletMultiButton imports browser-only APIs at module load
 * (window, etc.), so we must dynamic-import it with ssr:false to
 * avoid hydration errors in the App Router.
 */
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface Props {
  /** Visual size variant matching our Button component */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses: Record<NonNullable<Props["size"]>, string> = {
  sm: "wm-btn-sm",
  md: "wm-btn-md",
  lg: "wm-btn-lg",
};

/**
 * Abraxas-styled wrapper around the Solana wallet adapter's
 * WalletMultiButton. Real connect / disconnect / address-display
 * is all handled by the underlying button — we just restyle it.
 */
export function ConnectWalletButton({
  size = "md",
  className = "",
}: Props) {
  return (
    <div className={`abx-wallet ${sizeClasses[size]} ${className}`}>
      <WalletMultiButtonDynamic />
    </div>
  );
}
