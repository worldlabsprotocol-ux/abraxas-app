"use client";
// FILE: components/ContactForm.tsx
// Reusable contact form, replaces bare mailto: links anywhere on the
// site. Used for disaster/relief fund auditing inquiries and investor
// inquiries on the deal pipeline. A real form, not a link that may or
// may not open the visitor's email client correctly.

import { useState } from "react";

interface ContactFormProps {
  category: string;       // e.g. "relief-audit", "investor-inquiry"
  color: string;
  organizationLabel?: string; // e.g. "Organization" or "Fund / Company"
  placeholder?: string;
}

export function ContactForm({ category, color, organizationLabel, placeholder }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name || !email || !message) {
      setError("Name, email, and a message are required.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, organization, message, category }),
      });
      const data = await res.json() as { submitted?: boolean; error?: string };
      if (data.submitted) {
        setSent(true);
      } else {
        setError(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  const S = "'Inter',system-ui,-apple-system,sans-serif";
  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"0.65rem 0.875rem", borderRadius:8,
    border:"1px solid rgba(255,255,255,0.12)",
    background:"rgba(255,255,255,0.03)", color:"#fff",
    fontFamily:S, fontSize:"16px", marginBottom:"0.625rem",
    boxSizing:"border-box",
  };

  if (sent) {
    return (
      <div style={{ padding:"1rem", borderRadius:10, background:`${color}10`,
                     border:`1px solid ${color}40` }}>
        <div style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700, color }}>
          Message sent
        </div>
        <div style={{ fontFamily:S, fontSize:"0.76rem",
                       color:"rgba(255,255,255,0.5)", marginTop:"0.25rem" }}>
          We'll follow up at {email} directly.
        </div>
      </div>
    );
  }

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)}
             placeholder="Your name" style={inputStyle} />
      <input value={email} onChange={e => setEmail(e.target.value)}
             type="email" placeholder="Your email" style={inputStyle} />
      {organizationLabel && (
        <input value={organization} onChange={e => setOrganization(e.target.value)}
               placeholder={organizationLabel} style={inputStyle} />
      )}
      <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder={placeholder ?? "Tell us what you need"}
                rows={4} style={{ ...inputStyle, resize:"vertical", fontFamily:S }} />
      {error && (
        <div style={{ fontFamily:S, fontSize:"0.72rem", color:"#EF4444",
                       marginBottom:"0.625rem" }}>
          {error}
        </div>
      )}
      <button onClick={submit} disabled={sending}
        style={{ padding:"0.65rem 1.5rem", borderRadius:8, border:"none",
                  background:color, color:"#000", fontFamily:S,
                  fontSize:"0.82rem", fontWeight:700, cursor:"pointer",
                  opacity: sending ? 0.6 : 1 }}>
        {sending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}
