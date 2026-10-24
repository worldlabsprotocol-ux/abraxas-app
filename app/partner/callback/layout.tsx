// FILE: app/partner/callback/layout.tsx
// Holder return surface — document scroll, no viewport-trapped nested panes.

import type { ReactNode } from "react";

export default function PartnerSandboxCallbackLayout({ children }: { children: ReactNode }) {
  return (
    <div className="abx-partner-callback-page" data-theme="dark">
      <main id="main-content" className="abx-partner-callback-page__main">
        {children}
      </main>
    </div>
  );
}
