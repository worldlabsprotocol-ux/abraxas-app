// FILE: lib/useReclaimSocialStamp.ts
// Checks whether this user has a completed Reclaim Protocol
// verification on file, real check, not a placeholder. Used to add
// the "social" stamp to a real user's earned stamps, not just the
// static preview.
import { useState, useEffect } from "react";

export function useReclaimSocialStamp(contextAddress: string | null | undefined): boolean {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!contextAddress) return;
    fetch(`/api/reclaim/status?context=${encodeURIComponent(contextAddress)}`)
      .then(res => res.json())
      .then(data => setVerified(!!data.verified))
      .catch(() => setVerified(false));
  }, [contextAddress]);

  return verified;
}
