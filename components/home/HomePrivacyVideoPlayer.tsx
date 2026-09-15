"use client";
// FILE: components/home/HomePrivacyVideoPlayer.tsx
// Privacy enhanced YouTube player — iframe loads only after intentional play.

import { useEffect, useId, useRef, useState } from "react";
import {
  goodTroubleIntegrationEmbedUrl,
  goodTroubleIntegrationThumbnailUrl,
  goodTroubleIntegrationWatchUrl,
  GOOD_TROUBLE_INTEGRATION_VIDEO_ID,
} from "@/lib/home/goodTroubleIntegrationDemo";

export interface HomePrivacyVideoPlayerProps {
  videoId?: string;
  title: string;
  active?: boolean;
  onActivate?: () => void;
}

export function HomePrivacyVideoPlayer({
  videoId = GOOD_TROUBLE_INTEGRATION_VIDEO_ID,
  title,
  active = false,
  onActivate,
}: HomePrivacyVideoPlayerProps) {
  const [playing, setPlaying] = useState(active);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const fallbackId = useId();

  useEffect(() => {
    if (active) setPlaying(true);
  }, [active]);

  useEffect(() => {
    if (playing) {
      playerRef.current?.focus({ preventScroll: true });
    }
  }, [playing]);

  function activatePlayback() {
    setPlaying(true);
    onActivate?.();
  }

  const thumbnail = thumbnailFailed
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : goodTroubleIntegrationThumbnailUrl(videoId);

  return (
    <div
      className="abx-home-privacy-video"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(6, 10, 18, 0.92)",
        border: "1px solid rgba(45, 212, 191, 0.22)",
        boxShadow: "0 18px 48px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {!playing ? (
        <>
          <button
            type="button"
            className="abx-home-privacy-video__play"
            onClick={activatePlayback}
            aria-label={`Play ${title}`}
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              padding: 0,
              margin: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setThumbnailFailed(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <span
              aria-hidden="true"
              className="abx-home-privacy-video__play-icon"
              style={{
                position: "relative",
                zIndex: 1,
                width: 72,
                height: 72,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: "rgba(12, 18, 28, 0.78)",
                border: "1px solid rgba(45, 212, 191, 0.45)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
                color: "#F8FAFC",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.04-7.36a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
              </svg>
            </span>
          </button>
        </>
      ) : (
        <div
          ref={playerRef}
          tabIndex={-1}
          style={{ position: "absolute", inset: 0 }}
        >
          <iframe
            src={goodTroubleIntegrationEmbedUrl(videoId)}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </div>
      )}

      <p
        id={fallbackId}
        style={{
          position: "absolute",
          left: "0.75rem",
          right: "0.75rem",
          bottom: "0.65rem",
          margin: 0,
          fontSize: "0.68rem",
          lineHeight: 1.45,
          color: "rgba(248, 250, 252, 0.72)",
          textAlign: "center",
          pointerEvents: playing ? "auto" : "none",
        }}
      >
        {playing ? (
          <>
            Playback trouble?{" "}
            <a
              href={goodTroubleIntegrationWatchUrl(videoId)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#5EEAD4", fontWeight: 700, textDecoration: "underline" }}
            >
              Open on YouTube
            </a>
          </>
        ) : null}
      </p>

      <style jsx>{`
        .abx-home-privacy-video__play:focus-visible {
          outline: 2px solid #2dd4bf;
          outline-offset: 3px;
        }
        .abx-home-privacy-video__play:focus-visible .abx-home-privacy-video__play-icon {
          box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.25), 0 12px 32px rgba(0, 0, 0, 0.45);
        }
        @media (prefers-reduced-motion: reduce) {
          .abx-home-privacy-video__play-icon {
            transition: none;
          }
        }
        @media (max-width: 767px) {
          .abx-home-privacy-video__play-icon {
            width: 64px;
            height: 64px;
          }
        }
      `}</style>
    </div>
  );
}
