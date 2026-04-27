"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

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
  const [open, setOpen] = useState(false);

  return (
    <>
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
          padding: "0 1rem",
          gap: "1rem",
          background: "rgba(7,10,18,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                border: "1px solid rgba(200,169,110,0.5)",
                background:
                  "radial-gradient(circle at 40% 40%, rgba(200,169,110,0.25), transparent 70%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "var(--gold)",
                  boxShadow: "0 0 8px var(--gold)",
                }}
              />
            </div>

            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                letterSpacing: "0.15em",
                color: "var(--gold)",
                textTransform: "uppercase",
              }}
            >
              Abraxas
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1.5 text-[0.6rem] tracking-widest uppercase">
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "var(--green)",
              display: "inline-block",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <span style={{ color: "var(--subtle)" }}>Operational</span>
        </div>

        <div className="hidden md:flex flex-1 items-center justify-end gap-5">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.72rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  color: isActive ? "var(--gold)" : "var(--muted)",
                  transition: "color 0.2s",
                  position: "relative",
                  whiteSpace: "nowrap",
                }}
                className="hover:text-gold transition-colors"
              >
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "-4px",
                      left: 0,
                      right: 0,
                      height: "1px",
                      background: "var(--gold)",
                      borderRadius: "1px",
                    }}
                  />
                )}
                {link.label}
              </Link>
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <ConnectWalletButton size="sm" />
        </div>

        <button
          onClick={() => setOpen((value) => !value)}
          className="md:hidden"
          aria-label="Toggle navigation menu"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "9px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {open ? "×" : "☰"}
        </button>
      </nav>

      {open && (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            top: "60px",
            left: 0,
            right: 0,
            zIndex: 49,
            background: "rgba(7,10,18,0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "1rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.8rem" }}>
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "0.78rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    color: isActive ? "var(--gold)" : "var(--muted)",
                    padding: "0.7rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
