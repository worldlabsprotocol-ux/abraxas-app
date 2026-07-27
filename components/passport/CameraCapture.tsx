"use client";
// FILE: components/passport/CameraCapture.tsx
// Device camera capture via getUserMedia with file-upload fallback.

import { useCallback, useEffect, useRef, useState } from "react";
import { attachCameraStream } from "@/lib/passport/attachCameraStream";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [currentFacing, setCurrentFacing] = useState<"user" | "environment">(facingMode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const bindStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return false;
    await attachCameraStream(video, stream);
    return true;
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment" = currentFacing) => {
    setError(null);
    setLoading(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported in this browser. Use the upload button below.");
      }

      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCurrentFacing(facing);
      setActive(true);

      // Video element is always mounted; bind on next paint if ref was not ready.
      requestAnimationFrame(() => {
        void bindStream(stream).catch(() => {
          setError("Could not start camera preview. Try again or upload a photo.");
          stopStream();
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not access camera";
      setError(msg.includes("Permission") || msg.includes("NotAllowed")
        ? "Camera permission denied. Allow camera access or upload a photo instead."
        : msg);
      stopStream();
    } finally {
      setLoading(false);
    }
  }, [bindStream, currentFacing, stopStream]);

  async function flipCamera() {
    const next = currentFacing === "user" ? "environment" : "user";
    await startCamera(next);
  }

  function snapPhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError("Camera is still starting. Wait a moment and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const shouldMirror = mirror && currentFacing === "user";
    if (shouldMirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const previewUrl = URL.createObjectURL(blob);
      onCapture(blob, previewUrl);
      stopStream();
    }, "image/jpeg", 0.92);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG or PNG).");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    onCapture(file, previewUrl);
    stopStream();
    e.target.value = "";
  }

  function clearCapture() {
    onClear?.();
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
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              display: active ? "block" : "none",
              width: "100%",
              maxHeight: 280,
              objectFit: "cover",
              borderRadius: 10,
              background: "#000",
              marginBottom: active ? "0.75rem" : 0,
              transform: previewMirror ? "scaleX(-1)" : undefined,
            }}
          />

          {active ? (
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={snapPhoto}
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
                Capture photo
              </button>
              <button
                type="button"
                onClick={() => void flipCamera()}
                disabled={loading}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: `1px solid ${color}`,
                  background: "transparent",
                  color,
                  fontFamily: FONT,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                Flip camera
              </button>
              <button
                type="button"
                onClick={stopStream}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontFamily: FONT,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={loading}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 8,
                  border: "none",
                  background: color,
                  color: "#04130C",
                  fontFamily: FONT,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Starting camera…" : "Use camera"}
              </button>
              <label style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.5rem 1rem",
                borderRadius: 8,
                border: `1px solid ${color}`,
                color,
                fontFamily: FONT,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}>
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  capture={facingMode === "environment" ? "environment" : "user"}
                  onChange={handleFile}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          )}
        </>
      )}

      {error && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#EF4444", margin: "0.5rem 0 0" }}>
          {error}
        </p>
      )}
    </div>
  );
}
