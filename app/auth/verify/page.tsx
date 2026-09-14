// FILE: app/auth/verify/page.tsx
// Shown after email magic-link is sent.

import { AuthStatusPanel } from "@/components/auth/AuthStatusPanel";

export default function VerifyPage() {
  return (
    <AuthStatusPanel
      status="info"
      title="Check your email"
      description="A sign in link has been sent to your email address. Click it to access your Abraxas account. The link expires in 24 hours."
      actionHref="/passport"
      actionLabel="Return to Passport"
    />
  );
}
