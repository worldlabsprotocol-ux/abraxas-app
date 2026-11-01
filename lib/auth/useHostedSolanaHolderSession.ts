"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { probeBrowserSessionDetails } from "@/lib/auth/ensureBrowserSession";

type SignedHolder = { address: string; holderSubjectId: string };

/** A cookie is usable in a hosted flow only with its currently connected signing wallet. */
export function useHostedSolanaHolderSession() {
  const { connected, publicKey } = useWallet();
  const address = connected ? publicKey?.toBase58() ?? null : null;
  const [signedHolder, setSignedHolder] = useState<SignedHolder | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!address) {
      setSignedHolder(null);
      return;
    }
    let cancelled = false;
    setSignedHolder(null);
    void probeBrowserSessionDetails().then((probe) => {
      if (cancelled) return;
      // Compare the address segment independently of cluster, since session
      // challenge verification already pins the accepted Solana network.
      const signedAddress = probe.walletCaip10?.split(":")[2];
      if (probe.ok && probe.authMethod === "solana_wallet"
        && probe.holderSubjectId && signedAddress === address
        && probe.walletCaip10?.startsWith("solana:")) {
        setSignedHolder({ address, holderSubjectId: probe.holderSubjectId });
      } else {
        setSignedHolder(null);
      }
    }).catch(() => {
      if (!cancelled) setSignedHolder(null);
    });
    return () => { cancelled = true; };
  }, [address, revision]);

  useEffect(() => {
    window.addEventListener("abraxas:holder-session", refresh);
    return () => window.removeEventListener("abraxas:holder-session", refresh);
  }, [refresh]);

  return {
    holderSubjectId: signedHolder?.address === address ? signedHolder.holderSubjectId : null,
    refresh,
  };
}
