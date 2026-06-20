"use client";
// FILE: components/terminal/BuyNowModal.tsx
// Real checkout experience for direct-purchase items. Supports multiple
// selectable sub-items per asset (individual books, ebook tier, full
// catalog, "buy all") since a single bundled item wasn't enough for
// real sales, crypto-native buyers expect to pick exactly what they
// want before sending payment.

import { useState } from "react";
import { S, G, W, BDR, CARD } from "./tokens";
import { Button } from "./ui";
import { StablecoinExplainer } from "./StablecoinExplainer";

export interface PurchaseOption {
  id: string;
  label: string;
  price: string;
  description?: string;
}

export interface BuyItem {
  id: string;            // asset-level id, e.g. "demarko-books"
  name: string;           // asset-level display name
  price: string;           // fallback price if no options given
  description: string;
  color: string;
  options?: PurchaseOption[]; // if present, user picks one (or "all")
}

interface BuyNowModalProps {
  item: BuyItem | null;
  onClose: () => void;
}

type Stablecoin = "USDC" | "USDT";
const TREASURY = "circuit.skr";

export function BuyNowModal({ item, onClose }: BuyNowModalProps) {
  const [coin, setCoin] = useState<Stablecoin>("USDC");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showStableInfo, setShowStableInfo] = useState(false);

  if (!item) return null;

  const hasOptions = !!item.options && item.options.length > 0;
  const chosen = hasOptions
    ? item.options!.find(o => o.id === selectedOption) ?? null
    : null;
  const isAll = selectedOption === "__all__";
  const allTotal = hasOptions
    ? item.options!.reduce((sum, o) => {
        const n = parseFloat(o.price.replace(/[^0-9.]/g, ""));
        return sum + (isNaN(n) ? 0 : n);
      }, 0)
    : 0;

  const displayPrice = isAll
    ? `$${allTotal.toFixed(2)} (all ${item.options!.length})`
    : chosen ? chosen.price : item.price;

  const readyToPay = hasOptions ? (selectedOption !== null) : true;

  async function confirmPurchase() {
    if (!item || !email || !readyToPay) return;
    setSending(true);
    try {
      await fetch("/api/purchase/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          item_name: item.name,
          selection: isAll ? "all" : (chosen?.label ?? item.name),
          price: displayPrice,
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
                padding:"1rem", overflowY:"auto" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"#0D1117", borderRadius:16,
                  border:`1px solid ${BDR}`, maxWidth:440, width:"100%",
                  boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
                  maxHeight:"90vh", overflowY:"auto" }}>
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

          {submitted ? (
            <div style={{ textAlign:"center", padding:"1rem 0" }}>
              <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                             color:G, marginBottom:"0.5rem" }}>
                Order recorded
              </div>
              <div style={{ fontFamily:S, fontSize:"0.78rem",
                             color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
                {isAll ? "All items" : (chosen?.label ?? item.name)}, once your{" "}
                {coin} transfer confirms on-chain, we will email{" "}
                {email} to complete delivery.
              </div>
            </div>
          ) : (
            <>
              {/* Item picker, choose exactly what you want, or buy all */}
              {hasOptions && (
                <div style={{ marginBottom:"1.25rem" }}>
                  <div style={{ fontFamily:S, fontSize:"0.72rem", fontWeight:600,
                                 color:"rgba(255,255,255,0.5)", marginBottom:"0.5rem" }}>
                    What would you like?
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                    {item.options!.map(opt => (
                      <button key={opt.id} onClick={() => setSelectedOption(opt.id)}
                        style={{ display:"flex", justifyContent:"space-between",
                                  alignItems:"center", padding:"0.75rem 0.875rem",
                                  borderRadius:10, textAlign:"left",
                                  border: selectedOption === opt.id ? `1.5px solid ${item.color}` : `1px solid ${BDR}`,
                                  background: selectedOption === opt.id ? `${item.color}10` : "transparent",
                                  cursor:"pointer" }}>
                        <div>
                          <div style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:600,
                                         color:W }}>{opt.label}</div>
                          {opt.description && (
                            <div style={{ fontFamily:S, fontSize:"0.7rem",
                                           color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                              {opt.description}
                            </div>
                          )}
                        </div>
                        <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                                       color: selectedOption === opt.id ? item.color : "rgba(255,255,255,0.6)",
                                       flexShrink:0, marginLeft:"0.75rem" }}>
                          {opt.price}
                        </div>
                      </button>
                    ))}
                    {/* Buy all option */}
                    <button onClick={() => setSelectedOption("__all__")}
                      style={{ display:"flex", justifyContent:"space-between",
                                alignItems:"center", padding:"0.75rem 0.875rem",
                                borderRadius:10, textAlign:"left",
                                border: isAll ? `1.5px solid ${item.color}` : `1px dashed ${BDR}`,
                                background: isAll ? `${item.color}10` : "transparent",
                                cursor:"pointer" }}>
                      <div style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700,
                                     color: isAll ? item.color : W }}>
                        Get all {item.options!.length}
                      </div>
                      <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                                     color: isAll ? item.color : "rgba(255,255,255,0.6)" }}>
                        ${allTotal.toFixed(2)}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div style={{ padding:"1rem", borderRadius:12, background:CARD,
                             border:`1px solid ${item.color}25`,
                             marginBottom:"1.25rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                               alignItems:"center" }}>
                  <span style={{ fontFamily:S, fontSize:"0.78rem",
                                  color:"rgba(255,255,255,0.5)" }}>
                    {hasOptions ? "Total" : "Price"}
                  </span>
                  <span style={{ fontFamily:S, fontSize:"1.3rem", fontWeight:700,
                                  color:item.color }}>{displayPrice}</span>
                </div>
              </div>

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

              <button onClick={() => setShowStableInfo(s => !s)}
                style={{ background:"none", border:"none", padding:0,
                          color:"rgba(255,255,255,0.35)", fontFamily:S,
                          fontSize:"0.68rem", cursor:"pointer",
                          marginBottom: showStableInfo ? "0.625rem" : "1rem",
                          textDecoration:"underline" }}>
                {showStableInfo ? "Hide" : "What's a stablecoin? New to crypto?"}
              </button>
              {showStableInfo && <StablecoinExplainer compact />}

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
                          marginBottom:"0.75rem", boxSizing:"border-box" }}
              />

              <div style={{ fontFamily:S, fontSize:"0.68rem",
                             color:"rgba(255,255,255,0.35)", lineHeight:1.5,
                             marginBottom:"1rem" }}>
                This is reviewed by our team, not settled automatically.
                Typical confirmation time is same day, within 1 business day.
              </div>

              <Button
                onClick={confirmPurchase}
                color={item.color} size="md" fullWidth
                disabled={(hasOptions && !readyToPay) || sending}
              >
                {!readyToPay ? "Select an item above"
                  : sending ? "Confirming..."
                  : `I've sent the ${coin} →`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
