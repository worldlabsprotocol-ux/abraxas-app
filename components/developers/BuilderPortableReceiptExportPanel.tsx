"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import {
  fetchBuilderPortableExport,
  type BuilderPortableExportResult,
} from "@/lib/developers/builderPortableReceiptExport";
import { partnerSafeNextActions } from "@/lib/partner/integrationKit/trustContinuity/partnerSafeNextActions";

export function BuilderPortableReceiptExportPanel({ receiptId }: { receiptId: string }) {
  const [result, setResult] = useState<BuilderPortableExportResult | "loading">("loading");

  const load = useCallback(async () => {
    setResult("loading");
    setResult(await fetchBuilderPortableExport(receiptId));
  }, [receiptId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (result === "loading") {
    return (
      <p className="abx-builder-portable-export" data-testid="builder-portable-export">
        Checking whether this environment can export a portable verification bundle for your sandbox receipt…
      </p>
    );
  }

  if (result.ok) {
    return (
      <div className="abx-builder-portable-export" data-testid="builder-portable-export">
        <p>
          <strong>Live sandbox portable bundle available.</strong> This is issuer export for receipt{" "}
          <code>{receiptId}</code> — not the public teaching fixture.
        </p>
        <div className="abx-builder-journey-actions">
          <Btn size="sm" variant="secondary" href={`/verify?mode=receipt&receipt_id=${encodeURIComponent(receiptId)}`}>
            Open hosted verify
          </Btn>
          <Btn
            size="sm"
            variant="secondary"
            onClick={() => {
              const blob = new Blob([JSON.stringify(result.bundle, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `portable-verification-${receiptId}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download portable bundle
          </Btn>
        </div>
      </div>
    );
  }

  const failureCodes = [result.error, ...result.gaps];
  const actions = partnerSafeNextActions(failureCodes);

  return (
    <div className="abx-builder-portable-export" data-testid="builder-portable-export" role="status">
      <p>
        <strong>Portable export is not available on this environment yet.</strong> Your sandbox receipt{" "}
        <code>{receiptId}</code> is real for this test, but issuer export returned HTTP {result.httpStatus} (
        <code>{result.error}</code>). This is fail-closed — not a silent success.
      </p>
      {actions.length ? (
        <ul className="abx-builder-portable-export__actions">
          {actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      ) : null}
      <p className="abx-builder-journey-footnote">
        While export is blocked, practice independent verification with the{" "}
        <Link href="/verify">synthetic teaching sample on /verify</Link> (labeled{" "}
        <code>synthetic_sandbox_only</code> — not this live receipt).
      </p>
      <Btn size="sm" variant="secondary" onClick={() => void load()}>
        Retry portable export
      </Btn>
    </div>
  );
}