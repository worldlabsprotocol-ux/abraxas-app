"use client";

import { StatusBanner } from "@/components/ui/StatusBanner";
import { useAccountOverview } from "@/lib/hooks/useAccountOverview";
import { ACCOUNT_SESSIONS_INDEPENDENT_NOTICE } from "@/lib/account/accountHubCopy";

export function AccountSessionsNotice() {
  const { data } = useAccountOverview();
  if (!data) return null;

  const holder = data.holder.authenticated;
  const partner = data.partner_console.authenticated;

  if (holder && partner) {
    return (
      <StatusBanner tone="info" title="Two active sessions">
        Abraxas account and Partner Launchpad operator session are both attached in this browser. They authorize different resources.
      </StatusBanner>
    );
  }

  if (holder && !partner) {
    return (
      <StatusBanner tone="info" title="Launchpad not attached">
        {ACCOUNT_SESSIONS_INDEPENDENT_NOTICE}
      </StatusBanner>
    );
  }

  if (!holder && partner) {
    return (
      <StatusBanner tone="info" title="Operator session only">
        Partner Launchpad is active without an Abraxas account sign-in. Sign in to manage Passport and personal credentials in one place.
      </StatusBanner>
    );
  }

  return null;
}
