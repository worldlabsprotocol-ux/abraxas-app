// FILE: app/connect/authorize/page.tsx

export const dynamic = "force-dynamic";

import ConnectAuthorizeClient from "./ConnectAuthorizeClient";

export default async function ConnectAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestId = resolvedSearchParams.request ?? "";
  if (!requestId) {
    return (
      <div style={{ padding: "2rem", color: "#f26b6b", fontFamily: "monospace" }}>
        Missing authorization request ID.
      </div>
    );
  }
  return (
    <div style={{ minHeight: "100vh", background: "#060810" }}>
      <ConnectAuthorizeClient requestId={requestId} />
    </div>
  );
}
