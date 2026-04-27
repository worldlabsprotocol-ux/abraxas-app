"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/authState";
import { Button } from "@/components/Button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { systemStats } from "@/lib/mockData";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Vaults" },
  { href: "/live", label: "Live" },
  { href: "/app", label: "Dashboard" },
  { href: "/formations", label: "Formations" },
  { href: "/access", label: "Access" },
  { href: "/abra", label: "$ABRA" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { loggedIn, walletConnected } = useAuth();

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "60px",
        display: "flex",
        alignItems: "center",
        padding: "0 1.5rem",
        gap: "1.5rem",
        background: "rgba(7,10,18,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", marginRight: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* Sigil */}
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            border: "1px solid rgba(200,169,110,0.5)",
            background: "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.25), transparent 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <div style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--gold)",
              boxShadow: "0 0 8px var(--gold)",
            }} />
          </div>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.15em",
            color: "var(--gold)",
            textTransform: "uppercase",
          }}>
            Abraxas
          </span>
        </div>
      </Link>

      {/* Pulse indicator */}
      <div style={{ display: "none" }} className="md:flex items-center gap-1.5 text-[0.6rem] tracking-widest uppercase" >
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
        <span style={{ color: "var(--subtle)" }}>Operational</span>
      </div>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-5">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
              color: pathname === link.href ? "var(--gold)" : "var(--muted)",
              transition: "color 0.2s",
              position: "relative",
            }}
            className="hover:text-gold transition-colors"
          >
            {pathname === link.href && (
              <span style={{
                position: "absolute",
                bottom: "-4px",
                left: 0,
                right: 0,
                height: "1px",
                background: "var(--gold)",
                borderRadius: "1px",
              }} />
            )}
            {link.label}
          </Link>
        ))}
      </div>

      {/* Auth */}
      <div className="flex items-center gap-2">
        {walletConnected ? (
          <ConnectWalletButton size="sm" />
        ) : loggedIn ? (
          <ConnectWalletButton size="sm" />
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => router.push("/login")} className="hidden sm:inline-flex">
              Sign In
            </Button>
            <ConnectWalletButton size="sm" />
          </>
        )}
      </div>
    </nav>
  );
}
