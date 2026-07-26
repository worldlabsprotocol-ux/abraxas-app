"use client";
// FILE: components/passport/DocumentUpload.tsx
// File upload for Passport stamps requiring manual review (including identity pilot path).

import { useState } from "react";

interface DocumentUploadProps {
  email: string;
  suiAddress?: string | null;
  stampId: string;
  color: string;
  onUploaded?: () => void;
}

export function DocumentUpload({ email, suiAddress, stampId, color, onUploaded }: DocumentUploadProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!email.includes("@")) {
      setError("Enter your email at the top of the page first");
      return;
    }
    if (stampId === "identity" && !suiAddress) {
      setError("Sign in with Google first so we can link your upload to your account");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", email);
      formData.append("stampId", stampId);
      if (suiAddress) formData.append("sui_address", suiAddress);
      const res = await fetch("/api/identity/documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json() as {
        uploaded?: boolean;
        fileName?: string;
        error?: string;
        review_status?: string;
      };
      if (data.uploaded && data.fileName) {
        setFiles(f => [...f, data.fileName!]);
        if (stampId === "identity") setSubmitted(true);
        onUploaded?.();
      } else {
        setError(data.error ?? "Upload failed. Try again.");
      }
    } catch {
      setError("Network error during upload. Try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ background:"var(--surface-inset)", border:`1px dashed ${color}55`,
                   borderRadius:10, padding:"1rem", marginBottom:"1rem" }}>
      <div style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.78rem",
                     fontWeight:600, color:"var(--text-primary)", marginBottom:"0.625rem" }}>
        {stampId === "identity" ? "Upload your government ID" : "Upload your documents"}
      </div>
      {submitted && (
        <div style={{
          padding: "0.55rem 0.65rem", borderRadius: 8, marginBottom: "0.65rem",
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.72rem",
          color: "var(--text-secondary)", lineHeight: 1.55,
        }}>
          Submitted for pilot review. Our team usually responds within one business day.
          This page will update automatically when approved.
        </div>
      )}
      <label style={{ display:"inline-flex", alignItems:"center", gap:"0.5rem",
                        padding:"0.5rem 1rem", borderRadius:8,
                        border:`1.5px solid ${color}`, color, cursor:"pointer",
                        fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.8rem",
                        fontWeight:600 }}>
        {uploading ? "Uploading..." : "+ Choose a file"}
        <input type="file" onChange={handleFile} disabled={uploading}
               style={{ display:"none" }}
               accept=".pdf,.jpg,.jpeg,.png" />
      </label>
      {error && (
        <div style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.72rem",
                       color:"#EF4444", marginTop:"0.5rem" }}>
          {error}
        </div>
      )}
      {files.length > 0 && (
        <div style={{ marginTop:"0.75rem", display:"flex", flexDirection:"column", gap:"0.375rem" }}>
          {files.map(f => (
            <div key={f} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <span style={{ color, fontSize:"0.8rem" }}>✓</span>
              <span style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.76rem",
                              color:"var(--text-secondary)" }}>{f}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:"0.66rem",
                     color:"var(--text-muted)", marginTop:"0.625rem", lineHeight:1.5 }}>
        PDF, JPG, or PNG. Reviewed by our team. not processed automatically.
        {stampId === "identity" && " Documents are stored securely and deleted after review."}
      </div>
    </div>
  );
}
