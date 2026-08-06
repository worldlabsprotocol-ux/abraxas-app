"use client";
// FILE: components/passport/CameraCapture.tsx
// Mobile-native photo capture via file input (opens device camera reliably).

import { useRef, useState } from "react";
import {
  CAMERA_CAPTURE_COPY,
  cameraSwitchLabel,
  flipCameraAriaLabel,
  shouldShowFlipCameraControl,
} from "@/lib/idv/identityCaptureCopy";

const FONT = "'Inter',system-ui,sans-serif";

export interface CameraCaptureProps {
  label: string;
  hint: string;
  permissionNote?: string;
  facingMode?: "user" | "environment";
  mirror?: boolean;
  color?: string;
  allowCameraSwitch?: boolean;
  openCameraAriaLabel?: string;
  retakeAriaLabel?: string;
  facingHint?: string;
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClear?: () => void;
  capturedPreview?: string | null;
}

export function CameraCapture({
  label,
  hint,
  permissionNote = CAMERA_CAPTURE_COPY.permissionLead,
  facingMode = "environment",
  mirror = false,
  color = "#10B981",
  allowCameraSwitch = false,
  openCameraAriaLabel,
  retakeAriaLabel,
  facingHint,
  onCapture,
  onClear,
  capturedPreview,
}: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentFacing, setCurrentFacing] = useState<"user" | "environment">(facingMode);
  const [error, setError] = useState<string | null>(null);

  const showFlip = shouldShowFlipCameraControl({
    capturedPreview,
    allowCameraSwitch,
  });

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
  const groupId = `camera-capture-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div
      role="group"
      aria-labelledby={`${groupId}-label`}
      aria-describedby={`${groupId}-hint ${groupId}-permission`}
      style={{
        background: "var(--surface-inset)",
        border: `1px dashed ${color}55`,
        borderRadius: 12,
        padding: "1rem",
      }}
    >
      <div
        id={`${groupId}-label`}
        style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}
      >
        {label}
      </div>
      <p
        id={`${groupId}-hint`}
        style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.5rem" }}
      >
        {hint}
      </p>
      <p
        id={`${groupId}-permission`}
        style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 0.35rem" }}
      >
        {permissionNote}
      </p>
      {facingHint && !capturedPreview && (
        <p style={{ fontFamily: FONT, fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 0.85rem" }}>
          {facingHint}
        </p>
      )}
      {!facingHint && (
        <div style={{ marginBottom: "0.85rem" }} aria-hidden />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={currentFacing}
        onChange={handleFile}
        style={{ display: "none" }}
        aria-hidden
        tabIndex={-1}
      />

      {capturedPreview ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturedPreview}
            alt={`${label} preview`}
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
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={clearCapture}
              aria-label={retakeAriaLabel ?? `Retake photo for ${label}`}
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
              {CAMERA_CAPTURE_COPY.retake}
            </button>
            {showFlip && (
              <button
                type="button"
                onClick={flipCamera}
                aria-label={flipCameraAriaLabel(currentFacing)}
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
                {cameraSwitchLabel(currentFacing)}
              </button>
            )}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0.5rem 0 0" }}>
            {CAMERA_CAPTURE_COPY.qualityReminder}
          </p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={openCameraAriaLabel ?? `Open camera for ${label}`}
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
            {CAMERA_CAPTURE_COPY.openCamera}
          </button>
          <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0.5rem 0 0" }}>
            {CAMERA_CAPTURE_COPY.qualityReminder}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0.5rem 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}
