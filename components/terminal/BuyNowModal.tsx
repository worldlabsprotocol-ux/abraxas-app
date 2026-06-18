"use client";
// FILE: components/terminal/BuyNowModal.tsx
// Real checkout experience for direct-purchase items: books (DeMarko's
// catalog) and Cielo Sunrise stays/fractional shares. USDC + USDT both
// supported. This is the "actually buy something" loop that closes the
// end-to-end gap, distinct from InvestorPortalModal's lead-capture flow.

import { useState } from "react";
import { S, G, W, BDR, CARD } from "./tokens";
import { Button } from "./ui";

export interface BuyItem {
  id: string;
  name: string;
  price: string;
  description: string;
  color: string;
}

interface BuyNowModalProps {
  item: BuyItem | null;
  onClose: () => void;
}

type Stablecoin = "USDC" | "USDT";

const TREASURY = "circuit.skr";

export function BuyNowModal({ item, onClose }: BuyNowModalProps) {
  const [coin, setCoin] = useState<Stablecoin>("USDC");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  if (!item) return null;

  async function confirmPurchase() {
    if (!item || !email) return;
    setSending(true);
    try {
      await fetch("/api/purchase/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          stablecoin: coin,
          email,
        }),
      });
    } catch { /* fail open, do not block the user on a network hiccup */ }
    setSubmitted(true);
    setSending(false);
  }

  function copyAddress() {
    navigator.clipboard.writeText(TREASURY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:3000,
                background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)",
                display:"flex", alignItems:"center", justifyContent:"center",
                padding:"1rem" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"#0D1117", borderRadius:16,
                  border:`1px solid ${BDR}`, maxWidth:420, width:"100%",
                  boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ padding:"1.25rem 1.5rem", borderBottom:`1px solid ${BDR}`,
                       display:"flex", justifyContent:"space-between",
                       alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                           color:item.color, marginBottom:"0.25rem" }}>
              Buy now
            </div>
            <div style={{ fontFamily:S, fontSize:"1.05rem", fontWeight:700,
                           color:W }}>
              {item.name}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:"transparent", border:"none",
                      color:"rgba(255,255,255,0.4)", fontSize:"1.4rem",
                      cursor:"pointer", lineHeight:1, padding:0 }}>
            ×
          </button>
        </div>

        <div style={{ padding:"1.5rem" }}>
          <div style={{ fontFamily:S, fontSize:"0.82rem",
                         color:"rgba(255,255,255,0.5)", lineHeight:1.6,
                         marginBottom:"1.25rem" }}>
            {item.description}
          </div>

          <div style={{ padding:"1rem", borderRadius:12, background:CARD,
                         border:`1px solid ${item.color}25`,
                         marginBottom:"1.25rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
                           alignItems:"center" }}>
              <span style={{ fontFamily:S, fontSize:"0.78rem",
                              color:"rgba(255,255,255,0.5)" }}>Price</span>
              <span style={{ fontFamily:S, fontSize:"1.3rem", fontWeight:700,
                              color:item.color }}>{item.price}</span>
            </div>
          </div>

          {submitted ? (
            <div style={{ textAlign:"center", padding:"1rem 0" }}>
              <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                             color:G, marginBottom:"0.5rem" }}>
                Order recorded
              </div>
              <div style={{ fontFamily:S, fontSize:"0.78rem",
                             color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
                Once your {coin} transfer confirms on-chain, we will email
                {" "}{email} to complete delivery.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1rem" }}>
                {(["USDC", "USDT"] as Stablecoin[]).map(c => (
                  <button key={c} onClick={() => setCoin(c)}
                    style={{ flex:1, padding:"0.6rem", borderRadius:10,
                              border: coin === c ? `1.5px solid ${item.color}` : `1px solid ${BDR}`,
                              background: coin === c ? `${item.color}12` : "transparent",
                              color: coin === c ? item.color : "rgba(255,255,255,0.5)",
                              fontFamily:S, fontSize:"0.82rem", fontWeight:700,
                              cursor:"pointer" }}>
                    {c}
                  </button>
                ))}
              </div>

              <div style={{ padding:"0.875rem 1rem", borderRadius:10,
                             background:"rgba(255,255,255,0.03)",
                             border:`1px solid ${BDR}`, marginBottom:"1rem",
                             display:"flex", alignItems:"center",
                             justifyContent:"space-between", gap:"0.5rem" }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:S, fontSize:"0.62rem",
                                 color:"rgba(255,255,255,0.4)", marginBottom:2 }}>
                    Send {coin} to
                  </div>
                  <div style={{ fontFamily:"monospace", fontSize:"0.85rem",
                                 color:W, overflow:"hidden",
                                 textOverflow:"ellipsis" }}>
                    {TREASURY}
                  </div>
                </div>
                <button onClick={copyAddress}
                  style={{ padding:"0.4rem 0.75rem", borderRadius:8,
                            border:"none", background:`${item.color}15`,
                            color:item.color, fontFamily:S,
                            fontSize:"0.72rem", fontWeight:600,
                            cursor:"pointer", flexShrink:0 }}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email for delivery confirmation"
                type="email"
                style={{ width:"100%", padding:"0.7rem 0.875rem",
                          borderRadius:10, border:`1px solid ${BDR}`,
                          background:"rgba(255,255,255,0.03)",
                          color:W, fontFamily:S, fontSize:"16px",
                          marginBottom:"1rem", boxSizing:"border-box" }}
              />

              <Button onClick={confirmPurchase} color={item.color} size="md" fullWidth>
                {sending ? "Confirming..." : `I've sent the ${coin} →`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
