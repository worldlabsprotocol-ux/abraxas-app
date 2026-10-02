"use client";
// FILE: components/home/HomeGoodTroubleProductionDemoVideo.tsx
// Native repository-hosted Good Trouble production demo video.

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  GOOD_TROUBLE_PRODUCTION_DEMO_ASPECT_RATIO,
  GOOD_TROUBLE_PRODUCTION_DEMO_METADATA,
  GOOD_TROUBLE_PRODUCTION_DEMO_VIDEO_SRC,
  HOME_GOOD_TROUBLE_INTEGRATION,
} from "@/lib/home/goodTroubleIntegrationDemo";

const FONT = ABRAXAS_FONT_SANS;

export interface HomeGoodTroubleProductionDemoVideoProps {
  title?: string;
  active?: boolean;
  onActivate?: () => void;
}

export function HomeGoodTroubleProductionDemoVideo({
  title = HOME_GOOD_TROUBLE_INTEGRATION.videoTitle,
  active = false,
  onActivate,
}: HomeGoodTroubleProductionDemoVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(active);
  const [showControlsHint, setShowControlsHint] = useState(false);
  const captionId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (active) {
      void startPlayback();
    }
  }, [active]);

  async function startPlayback() {
    const video = videoRef.current;
    if (!video) return;
    setStarted(true);
    onActivate?.();
    try {
      await video.play();
      setShowControlsHint(false);
    } catch {
      setShowControlsHint(true);
    }
  }

  return (
    <figure
      className="abx-gt-production-demo-video"
      style={{ margin: 0, width: "100%" }}
    >
      <div
        className="abx-gt-production-demo-video__frame"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          aspectRatio: GOOD_TROUBLE_PRODUCTION_DEMO_ASPECT_RATIO,
          borderRadius: 18,
          overflow: "hidden",
          background: "rgba(6, 10, 18, 0.92)",
          border: "1px solid rgba(45, 212, 191, 0.22)",
          boxShadow: "0 18px 48px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <video
          ref={videoRef}
          className="abx-gt-production-demo-video__media"
          src={GOOD_TROUBLE_PRODUCTION_DEMO_VIDEO_SRC}
          title={title}
          aria-describedby={captionId}
          controls={started}
          playsInline
          preload={GOOD_TROUBLE_PRODUCTION_DEMO_METADATA.preload}
          onPlay={() => {
            setStarted(true);
            setShowControlsHint(false);
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            background: "#060a12",
          }}
        />

        {!started ? (
          <button
            type="button"
            className="abx-gt-production-demo-video__play"
            onClick={() => void startPlayback()}
            aria-label={`Play ${title}`}
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              padding: 0,
              margin: 0,
              border: "none",
              background: "linear-gradient(180deg, rgba(6,10,18,0.15) 0%, rgba(6,10,18,0.55) 100%)",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              className="abx-gt-production-demo-video__play-icon"
              style={{
                width: reduceMotion ? 64 : 72,
                height: reduceMotion ? 64 : 72,
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
        ) : null}

        {showControlsHint ? (
          <p
            style={{
              position: "absolute",
              left: "0.75rem",
              right: "0.75rem",
              bottom: "0.65rem",
              margin: 0,
              fontFamily: FONT,
              fontSize: "0.68rem",
              lineHeight: 1.45,
              color: "rgba(248, 250, 252, 0.82)",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            Use the video controls to play.
          </p>
        ) : null}
      </div>

      <figcaption
        id={captionId}
        style={{
          margin: "0.75rem 0 0",
          fontFamily: FONT,
          fontSize: "0.72rem",
          lineHeight: 1.5,
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        {HOME_GOOD_TROUBLE_INTEGRATION.videoCaption}
      </figcaption>

      <style jsx>{`
        .abx-gt-production-demo-video__play:focus-visible {
          outline: 2px solid #2dd4bf;
          outline-offset: 3px;
        }
        .abx-gt-production-demo-video__play:focus-visible .abx-gt-production-demo-video__play-icon {
          box-shadow: 0 0 0 4px rgba(45, 212, 191, 0.25), 0 12px 32px rgba(0, 0, 0, 0.45);
        }
        @media (prefers-reduced-motion: reduce) {
          .abx-gt-production-demo-video__play-icon {
            transition: none;
          }
        }
        @media (min-width: 900px) {
          .abx-gt-production-demo-video__frame {
            max-width: 100%;
          }
        }
      `}</style>
    </figure>
  );
}
