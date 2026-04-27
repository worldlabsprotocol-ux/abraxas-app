"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSession, signIn, signOut } from "next-auth/react";

interface AuthContextValue {
  /** Logged in via any path: NextAuth, wallet, or legacy mock */
  loggedIn: boolean;
  /** Real Solana wallet connection */
  walletConnected: boolean;
  /** Provider that authenticated the user, if any: "Google" | "GitHub" | "Wallet" */
  loginMethod: string | null;
  /** Shortened Solana public key, e.g. "Ge8s…tw9P" */
  walletAddress: string | null;
  /** NextAuth session user object (name/email/image) when signed in */
  user: { name?: string | null; email?: string | null; image?: string | null } | null;

  /** Real OAuth signIn — provider must be enabled in NextAuth config */
  loginWithProvider: (provider: "google" | "github") => Promise<void>;
  /** No-op kept for compatibility with old call sites */
  connectWallet: () => void;
  /** Sign out of NextAuth + disconnect Solana wallet */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function shortenAddress(addr: string): string {
  if (addr.length <= 9) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, connected, disconnect } = useWallet();
  const { data: session } = useSession();

  // Method tracking — if the user connects via wallet first, show "Wallet";
  // OAuth method comes from session.
  const [walletMethod, setWalletMethod] = useState<string | null>(null);
  useEffect(() => {
    if (connected && !walletMethod) setWalletMethod("Wallet");
    if (!connected) setWalletMethod(null);
  }, [connected, walletMethod]);

  const walletAddress = useMemo(
    () => (publicKey ? shortenAddress(publicKey.toBase58()) : null),
    [publicKey]
  );

  const oauthMethod = session?.user
    ? // NextAuth doesn't expose `provider` on the client session by default;
      // we fall back to "Account" if not detectable
      "Account"
    : null;

  const loginMethod = oauthMethod ?? walletMethod ?? null;
  const loggedIn = Boolean(session?.user) || connected;

  const loginWithProvider = async (provider: "google" | "github") => {
    await signIn(provider, { callbackUrl: "/app" });
  };

  const connectWallet = () => {
    // No-op: WalletMultiButton handles the modal/connection itself.
  };

  const logout = async () => {
    if (connected) await disconnect();
    if (session) await signOut({ redirect: false });
  };

  return (
    <AuthContext.Provider
      value={{
        loggedIn,
        walletConnected: connected,
        loginMethod,
        walletAddress,
        user: session?.user ?? null,
        loginWithProvider,
        connectWallet,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
