"use client";

import dynamic from "next/dynamic";
import { useOgVerification, OG_COLLECTION_ADDRESS, type OgState } from "@/lib/useOgVerification";
import { PageHeader } from "@/components/PageHeader";
import { ABRA } from "@/lib/constants";

const ConnectButton = dynamic(
  async () => (await import("@rainbow-me/rainbowkit")).ConnectButton,
  { ssr: false }
);

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function AccessPage() {
  const og = useOgVerification();
  const COLLECTION = OG_COLLECTION_ADDRESS;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <PageHeader
        eyebrow="Access Layer"
        title="Three tiers of participation."
        subtitle="The main product — list, deposit, operate — is open to all. Holding contributes to access recognition."
      />

      {/* Tier 1 — OG ETH (La Casa Distortion) */}
      <section
        className="bg-gradient-to-b from-bg-2 to-[rgba(200,169,110,0.04)] border border-[rgba(200,169,110,0.25)] rounded-[14px] p-7 mb-5"
      >
        <div className="flex gap-5 items-start flex-wrap">
          <div className="font-display text-4xl font-extrabold text-gold leading-none w-10 flex-shrink-0">
            1
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-[0.66rem] text-abraxas-subtle uppercase tracking-[0.1em] mb-1">
              Legacy Tier
            </p>
            <h3 className="font-display font-bold text-lg mb-2">
              La Casa Distortion <span className="text-abraxas-subtle">— OG Collection</span>
            </h3>
            <p className="text-sm text-abraxas-muted leading-relaxed mb-4">
              Legacy holders from the pre-Abraxas era. Holding at least one
              token grants OG status — early access, recognition, and future
              eligibility for platform benefits.
            </p>

            {/* Contract reference */}
            <div className="bg-bg-3 border border-border rounded-lg p-3 mb-4 text-xs flex items-center justify-between gap-2 flex-wrap">
              <span className="text-abraxas-subtle">Collection contract</span>
              {COLLECTION ? (
                <a
                  href={`https://etherscan.io/token/${COLLECTION}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline font-mono"
                >
                  {shortAddr(COLLECTION)} ↗
                </a>
              ) : (
                <span className="text-abraxas-red">
                  Set NEXT_PUBLIC_OG_ETH_COLLECTION in .env.local then restart `npm run dev`
                </span>
              )}
            </div>

            {/* Connect EVM wallet (RainbowKit ConnectButton) */}
            <div className="mb-4">
              <ConnectButton
                accountStatus="address"
                chainStatus="none"
                showBalance={false}
                label="Connect EVM Wallet"
              />
            </div>

            {/* Verification state panel */}
            <VerificationPanel og={og} />
          </div>
        </div>
      </section>

      {/* Tier 2 — $ABRA */}
      <section className="bg-bg-2 border border-border rounded-[14px] p-7 mb-5">
        <div className="flex gap-5 items-start flex-wrap">
          <div className="font-display text-4xl font-extrabold text-border-2 leading-none w-10 flex-shrink-0">
            2
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-[0.66rem] text-abraxas-subtle uppercase tracking-[0.1em] mb-1">
              Ecosystem Tier
            </p>
            <h3 className="font-display font-bold text-lg mb-2">$ABRA Holders</h3>
            <p className="text-sm text-abraxas-muted leading-relaxed mb-3">
              Current ecosystem participants. Top holders may receive
              access-layer benefits, priority features, and platform rewards as
              the protocol matures.
            </p>
            <p className="text-xs text-abraxas-subtle">
              Verify your $ABRA balance from the{" "}
              <a href="/app" className="text-gold hover:underline">dashboard</a>.
              Token:{" "}
              <a href={ABRA.solscan} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-mono">
                {ABRA.caShort}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Tier 3 — Operators */}
      <section className="bg-bg-2 border border-border rounded-[14px] p-7">
        <div className="flex gap-5 items-start flex-wrap">
          <div className="font-display text-4xl font-extrabold text-border-2 leading-none w-10 flex-shrink-0">
            3
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-[0.66rem] text-abraxas-subtle uppercase tracking-[0.1em] mb-1">
              Platform Tier
            </p>
            <h3 className="font-display font-bold text-lg mb-2">Abraxas Operators</h3>
            <p className="text-sm text-abraxas-muted leading-relaxed">
              Users who deposit to vaults, activate assets, and operate capital
              through Abraxas. The highest-value participation path — earned
              through actual platform use.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------- */

function VerificationPanel({ og }: { og: OgState }) {
  switch (og.status) {
    case "no-collection":
      return (
        <div className="text-xs text-abraxas-red">
          Set NEXT_PUBLIC_OG_ETH_COLLECTION in .env.local to enable verification.
        </div>
      );
    case "disconnected":
      return (
        <div className="text-xs text-abraxas-subtle">
          Connect an EVM wallet above to check OG status.
        </div>
      );
    case "checking":
      return (
        <div className="flex items-center gap-2 text-xs text-abraxas-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-abraxas-subtle animate-pulse" />
          Checking ownership on Ethereum…
        </div>
      );
    case "verified":
      return (
        <div className="flex items-center gap-2 bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.25)] rounded-md px-3 py-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-abraxas-green" />
          <span className="text-abraxas-green font-medium">
            Verified OG holder
          </span>
          <span className="text-abraxas-subtle ml-auto">
            {og.balance} token{og.balance > 1 ? "s" : ""}
          </span>
        </div>
      );
    case "not-holder":
      return (
        <div className="flex items-center gap-2 bg-bg-3 border border-border rounded-md px-3 py-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-abraxas-subtle" />
          <span className="text-abraxas-muted">
            No OG NFT found for this wallet.
          </span>
        </div>
      );
    case "error":
      return (
        <div className="text-xs text-abraxas-red">
          Verification failed: {og.error}
        </div>
      );
  }
}