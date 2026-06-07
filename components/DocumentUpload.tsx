// FILE: components/DocumentUpload.tsx
// Supabase Storage document upload for asset verification.
// Works in AssetOwnerOnboarding + TokenizationRequestModal.
// No CLI needed. Supabase bucket SQL at bottom of file.
"use client";

import { useState, useRef, useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G   = "#10B981";
const BDR = "#1C2333";
const W   = "#F8FAFC";
const R   = "#EF4444";
const A   = "#F59E0B";

const ACCEPTED = [
  "application/pdf",
  "image/jpeg","image/png","image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_MB = 10;
const BUCKET = "asset-documents";

export interface UploadedFile {
  name: string; path: string; url: string;
  size: number; type: string; uploadedAt: string;
}

export function DocumentUpload({ assetId, requestId, onUploaded, label = "Upload Supporting Documents", maxFiles = 10 }:
  { assetId?: string; requestId?: string; onUploaded?: (f: UploadedFile) => void; label?: string; maxFiles?: number }) {

  const [files,     setFiles]     = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [dragOver,  setDragOver]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (files.length >= maxFiles) { setError(`Max ${maxFiles} files`); return; }
    if (!ACCEPTED.includes(file.type)) { setError("PDF, JPG, PNG, WEBP, DOC, DOCX only"); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`Max ${MAX_MB}MB per file`); return; }
    setUploading(true); setError(null); setProgress(0);
    const folder  = assetId ?? requestId ?? "unassigned";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path    = `${folder}/${Date.now()}_${safeName}`;
    const sb = getSupabase();
    if (!sb) {
      const f: UploadedFile = { name: file.name, path: `local/${path}`,
        url: URL.createObjectURL(file), size: file.size,
        type: file.type, uploadedAt: new Date().toISOString() };
      setFiles(p => [...p, f]); onUploaded?.(f); setUploading(false); return;
    }
    const timer = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 200);
    const { data, error: err } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false });
    clearInterval(timer); setProgress(100);
    if (err || !data) { setError(err?.message ?? "Upload failed"); setUploading(false); setProgress(0); return; }
    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(data.path);
    const uploaded: UploadedFile = { name: file.name, path: data.path,
      url: urlData.publicUrl, size: file.size, type: file.type, uploadedAt: new Date().toISOString() };
    setFiles(p => [...p, uploaded]); onUploaded?.(uploaded); setUploading(false); setProgress(0);
  }, [files, maxFiles, assetId, requestId, onUploaded]);

  function fmt(b: number) { return b < 1048576 ? `${(b/1024).toFixed(0)}KB` : `${(b/1048576).toFixed(1)}MB`; }

  return (
    <div style={{ fontFamily: M }}>
      <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(255,255,255,0.35)",
                     textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>{label}</div>
      <div onClick={() => !uploading && ref.current?.click()}
           onDragOver={e => { e.preventDefault(); setDragOver(true); }}
           onDragLeave={() => setDragOver(false)}
           onDrop={e => { e.preventDefault(); setDragOver(false); Array.from(e.dataTransfer.files).forEach(f => upload(f).catch(() => null)); }}
           style={{ border: `1px dashed ${dragOver ? G : BDR}`, borderRadius: 6, padding: "1.25rem",
                    textAlign: "center", cursor: uploading ? "wait" : "pointer",
                    background: dragOver ? `${G}06` : "rgba(255,255,255,0.02)",
                    transition: "all 0.15s", marginBottom: "0.5rem" }}>
        {uploading ? (
          <div>
            <div style={{ fontSize: "0.65rem", color: G, marginBottom: "0.5rem" }}>Uploading…</div>
            <div style={{ height: 3, background: BDR, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: G, borderRadius: 2, transition: "width 0.2s" }}/>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>📎</div>
            <div style={{ fontSize: "0.68rem", color: W, fontWeight: 700, marginBottom: "0.125rem" }}>Drop files or tap to browse</div>
            <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)" }}>PDF · JPG · PNG · DOC · max {MAX_MB}MB</div>
          </>
        )}
      </div>
      <input ref={ref} type="file" multiple accept={ACCEPTED.join(",")}
             onChange={e => { Array.from(e.target.files ?? []).forEach(f => upload(f).catch(() => null)); e.target.value = ""; }}
             style={{ display: "none" }} aria-label="Upload documents"/>
      {error && (
        <div style={{ padding: "0.35rem 0.625rem", borderRadius: 4, background: `${R}08`,
                       border: `1px solid ${R}30`, color: R, fontSize: "0.62rem", marginBottom: "0.375rem" }}>{error}</div>
      )}
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {files.map(f => (
            <div key={f.path} style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                                        padding: "0.45rem 0.625rem", borderRadius: 4,
                                        background: `${G}08`, border: `1px solid ${G}25` }}>
              <span style={{ fontSize: "0.8rem" }}>{f.type.includes("pdf") ? "📄" : f.type.includes("image") ? "🖼️" : "📝"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.62rem", color: W, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)" }}>
                  {fmt(f.size)}{f.url.startsWith("blob:") && <span style={{ color: A, marginLeft: "0.375rem" }}>· local only</span>}
                </div>
              </div>
              <button onClick={() => setFiles(p => p.filter(x => x.path !== f.path))}
                      style={{ padding: "0.2rem 0.4rem", borderRadius: 3, border: `1px solid ${R}30`,
                                background: "transparent", color: R, fontSize: "0.6rem", cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
