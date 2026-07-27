"use client";
// FILE: components/passport/CameraCapture.tsx
// Mobile-native photo capture via file input (opens device camera reliably).

import { useRef, useState } from "react";

const FONT = "'Inter',system-ui,sans-serif";

export interface CameraCaptureProps {
  label: string;
  hint: string;
  facingMode?: "user" | "environment";
  mirror?: boolean;
  color?: string;
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClear?: () => void;
  capturedPreview?: string | null;
}

export function CameraCapture({
  label,
  hint,
  facingMode = "environment",
  mirror = false,
  color = "#10B981",
  onCapture,
  onClear,
  capturedPreview,
}: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentFacing, setCurrentFacing] = useState<"user" | "environment">(facingMode);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG or PNG).");
      return;
    }
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    onCapture(file, previewUrl);
    e.target.value = "";
  }

  function clearCapture() {
    onClear?.();
    setError(null);
  }

  function flipCamera() {
    setCurrentFacing(prev => (prev === "user" ? "environment" : "user"));
    setError(null);
  }

  const previewMirror = mirror && currentFacing === "user";

  return (
    <div style={{
      background: "var(--surface-inset)",
      border: `1px dashed ${color}55`,
      borderRadius: 12,
      padding: "1rem",
    }}>
      <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
        {label}
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.85rem" }}>
        {hint}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={currentFacing}
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {capturedPreview ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturedPreview}
            alt={label}
            style={{
              width: "100%",
              maxHeight: 280,
              objectFit: "cover",
              borderRadius: 10,
              border: `1px solid ${color}44`,
              marginBottom: "0.75rem",
              transform: previewMirror ? "scaleX(-1)" : undefined,
            }}
          />
          <button
            type="button"
            onClick={clearCapture}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: 8,
              border: `1px solid ${color}`,
              background: "transparent",
              color,
              fontFamily: FONT,
              fontSize: "0.74rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retake
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "none",
              background: color,
              color: "#04130C",
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Take photo
          </button>
          <button
            type="button"
            onClick={flipCamera}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: `1px solid ${color}`,
              background: "transparent",
              color,
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Flip camera ({currentFacing === "user" ? "front" : "back"})
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0.5rem 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}
