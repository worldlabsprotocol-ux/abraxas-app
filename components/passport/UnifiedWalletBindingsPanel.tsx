"use client";
// FILE: components/passport/UnifiedWalletBindingsPanel.tsx
// Canonical wallet list — Sui/zkLogin first; MetaMask optional.

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EvmWalletConnectActions } from "@/components/wallet/EvmWalletConnectActions";
import { truncateSuiAddress } from "@/components/sui/SuiAuthProvider";
import { useBindEvmWallet } from "@/lib/walletAuthority/client/useBindEvmWallet";
import { mapEvmBindError } from "@/lib/walletAuthority/client/mapEvmBindError";
import { Btn } from "@/components/redesign/ui";
import { PassportStepPurpose } from "@/components/passport/PassportStepPurpose";
import { PASSPORT_STEPS } from "@/lib/passport/passportStepCopy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const RED = "#EF4444";

const EVM_OPTIONAL = process.env.NEXT_PUBLIC_EVM_WALLET_OPTIONAL !== "false";

export interface WalletBindingView {
  id: string;
  chain: string;
  chain_id: number | null;
  wallet_address: string;
  binding_status: string;
  binding_method: string;
  verified_at: string;
}

async function fetchWalletBindings(): Promise<WalletBindingView[]> {
  const res = await fetch("/api/wallet-authority/wallets", { credentials: "include" });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error("Failed to load wallet bindings");
  const data = await res.json() as { wallets?: WalletBindingView[] };
  return data.wallets ?? [];
}

function formatAddress(chain: string, address: string): string {
  if (chain === "evm") return `${address.slice(0, 6)}…${address.slice(-4)}`;
  return truncateSuiAddress(address, 8, 6);
}

function chainLabel(chain: string): string {
  if (chain === "evm") return "MetaMask / EVM";
  return "Sui / Google sign-in";
}

function statusColor(status: string): string {
  if (status === "active") return ACCENT;
  if (status === "compromised") return RED;
  return "var(--text-muted)";
}

export function UnifiedWalletBindingsPanel({
  suiAddress,
  onSuiBind,
  suiBindBusy,
}: {
  suiAddress: string | null;
  onSuiBind?: () => void;
  suiBindBusy?: boolean;
}) {
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [evmOpen, setEvmOpen] = useState(false);

  const { data: wallets = [], isLoading, refetch } = useQuery({
    queryKey: ["wallet-bindings", suiAddress],
    queryFn: fetchWalletBindings,
    enabled: Boolean(suiAddress),
  });

  const {
    bindInjected,
    bindWalletConnect,
    loading: evmBindLoading,
    error: evmBindError,
    bound: evmBound,
    uiState,
  } = useBindEvmWallet({ credentials: "include" });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["wallet-bindings", suiAddress] });
    await refetch();
  }, [queryClient, refetch, suiAddress]);

  async function revokeBinding(bindingId: string) {
    setRevokingId(bindingId);
    setActionError("");
    try {
      const res = await fetch(`/api/wallet-authority/wallets/${bindingId}/revoke`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "user_revoked_binding" }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Revoke failed");
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  const activeSui = wallets.find(w => w.chain === "sui" && w.binding_status === "active");
  const activeEvm = wallets.filter(w => w.chain === "evm" && w.binding_status === "active");
  const suiReady = Boolean(activeSui);

  const displayError = actionError || (evmBindError ? mapEvmBindError(evmBindError) : "");

  return (
    <section style={{
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      borderRadius: 16,
      padding: "1.15rem 1.25rem",
      marginBottom: "1.25rem",
    }} aria-labelledby="unified-wallets-heading">
      <h2 id="unified-wallets-heading" style={{
        fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
        color: "var(--text-primary)", margin: "0 0 0.35rem",
      }}>
        Wallets
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 560,
      }}>
        Your Google sign-in creates a Sui wallet automatically. MetaMask is optional for partners that need EVM.
      </p>

      {isLoading && (
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)" }}>Loading…</p>
      )}

      {!isLoading && wallets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1rem" }}>
          {wallets.map(w => (
            <div key={w.id} style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.65rem",
              padding: "0.75rem 0.85rem", borderRadius: 12,
              background: "var(--surface-inset)", border: "1px solid var(--border)",
            }}>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {chainLabel(w.chain)}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                  {formatAddress(w.chain, w.wallet_address)}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2 }}>
                  Added {new Date(w.verified_at).toLocaleDateString()} · {w.binding_status}
                </div>
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
                color: statusColor(w.binding_status), textTransform: "capitalize",
              }}>
                {w.binding_status}
              </div>
              {w.binding_status === "active" && (
                <button
                  type="button"
                  onClick={() => void revokeBinding(w.id)}
                  disabled={revokingId === w.id}
                  style={{
                    padding: "0.4rem 0.75rem", borderRadius: 999,
                    border: `1px solid ${RED}44`, background: `${RED}12`,
                    color: RED, fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
                    cursor: revokingId === w.id ? "wait" : "pointer",
                  }}
                >
                  {revokingId === w.id ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!suiReady && onSuiBind && (
        <div style={{
          padding: "0.85rem", borderRadius: 12,
          background: "rgba(16,185,129,0.06)", border: `1px solid ${ACCENT}44`,
          marginBottom: "1rem",
        }}>
          <PassportStepPurpose title={PASSPORT_STEPS.addWallet.title} purpose="Sign once to prove you control your Sui wallet. No funds move." />
          <Btn size="lg" onClick={onSuiBind} loading={suiBindBusy} disabled={suiBindBusy}>
            Sign to connect Sui wallet →
          </Btn>
        </div>
      )}

      {suiReady && (
        <div style={{
          padding: "0.75rem 0.85rem", borderRadius: 12,
          background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`,
          marginBottom: "1rem",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: ACCENT }}>
            Sui wallet connected · ready for registry and booking flows
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
            You can use Cielo and partner demos without MetaMask.
          </p>
        </div>
      )}

      {EVM_OPTIONAL && (
        <details open={evmOpen} onToggle={e => setEvmOpen((e.target as HTMLDetailsElement).open)}>
          <summary style={{
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            color: "var(--text-secondary)", cursor: "pointer", marginBottom: "0.5rem",
          }}>
            Optional: add MetaMask (EVM)
          </summary>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
            Only needed when a partner requires an Ethereum wallet. Sui remains your primary Passport wallet.
          </p>
          {!evmBound && (
            <EvmWalletConnectActions
              uiState={uiState}
              loading={evmBindLoading}
              injectedLabel="Connect MetaMask"
              walletConnectLabel="Connect via WalletConnect"
              onInjected={() => void bindInjected().then(() => refresh()).catch(() => undefined)}
              onWalletConnect={() => void bindWalletConnect().then(() => refresh()).catch(() => undefined)}
            />
          )}
          {evmBound && activeEvm.length > 0 && (
            <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, margin: 0 }}>
              EVM connected: {formatAddress("evm", activeEvm[0].wallet_address)}
            </p>
          )}
        </details>
      )}

      {displayError && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: RED, marginTop: "0.75rem", marginBottom: 0 }}>
          {displayError}
        </p>
      )}
    </section>
  );
}
