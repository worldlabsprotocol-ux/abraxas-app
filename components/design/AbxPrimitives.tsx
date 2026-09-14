"use client";
// FILE: components/design/AbxPrimitives.tsx
// Shared Abraxas UI primitives — cards, alerts, empty states, page headers, skeletons.

import type { CSSProperties, ReactNode } from "react";
import { Btn } from "@/components/redesign/ui";
import {
  ABX_FONT_SANS,
  ABX_SPACING,
  ABX_STATUS_COLORS,
  ABX_TAB_ACCENTS,
  ABX_TYPOGRAPHY,
  type AbxStatusTone,
  type AbxTabAccent,
} from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

export interface AbxPageHeaderProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  accent?: AbxTabAccent;
  align?: "left" | "center";
  children?: ReactNode;
}

export function AbxPageHeader({
  eyebrow,
  title,
  lead,
  accent = "neutral",
  align = "left",
  children,
}: AbxPageHeaderProps) {
  const accentColor = ABX_TAB_ACCENTS[accent].color;
  const textAlign = align === "center" ? "center" : "left";

  return (
    <header
      className="abx-page-header"
      style={{
        marginBottom: ABX_SPACING.stackLg,
        textAlign,
        maxWidth: align === "center" ? 720 : undefined,
        marginLeft: align === "center" ? "auto" : undefined,
        marginRight: align === "center" ? "auto" : undefined,
      }}
    >
      {eyebrow && (
        <p
          style={{
            margin: "0 0 0.4rem",
            fontFamily: FONT,
            ...ABX_TYPOGRAPHY.eyebrow,
            color: accentColor,
          }}
        >
          {eyebrow}
        </p>
      )}
      <h1
        style={{
          margin: "0 0 0.5rem",
          fontFamily: FONT,
          ...ABX_TYPOGRAPHY.h1,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h1>
      {lead && (
        <p
          style={{
            margin: "0 0 0.75rem",
            fontFamily: FONT,
            ...ABX_TYPOGRAPHY.lead,
            color: "var(--text-secondary)",
          }}
        >
          {lead}
        </p>
      )}
      {children}
    </header>
  );
}

export interface AbxCardProps {
  children: ReactNode;
  accent?: AbxTabAccent;
  padding?: string;
  style?: CSSProperties;
  className?: string;
}

export function AbxCard({
  children,
  accent,
  padding = ABX_SPACING.cardPadding,
  style,
  className = "abx-card",
}: AbxCardProps) {
  const accentTokens = accent ? ABX_TAB_ACCENTS[accent] : null;

  return (
    <div
      className={className}
      style={{
        borderRadius: ABX_SPACING.cardRadius,
        border: accentTokens ? `1px solid ${accentTokens.border}` : "1px solid var(--border)",
        background: accentTokens
          ? `linear-gradient(145deg, ${accentTokens.faint} 0%, rgba(0,0,0,0.35) 100%)`
          : "var(--surface-raised)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding,
        boxShadow: accentTokens?.glow !== "none" ? accentTokens?.glow : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface AbxAlertProps {
  tone: AbxStatusTone;
  title?: string;
  children: ReactNode;
  role?: "alert" | "status";
}

export function AbxAlert({ tone, title, children, role = "status" }: AbxAlertProps) {
  const colors = ABX_STATUS_COLORS[tone];

  return (
    <div
      role={role}
      className="abx-alert"
      style={{
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        background: colors.faint,
        padding: "0.85rem 1rem",
        fontFamily: FONT,
      }}
    >
      {title && (
        <p
          style={{
            margin: "0 0 0.35rem",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: colors.color,
          }}
        >
          {title}
        </p>
      )}
      <div style={{ fontSize: ABX_TYPOGRAPHY.body.fontSize, lineHeight: ABX_TYPOGRAPHY.body.lineHeight, color: "var(--text-secondary)" }}>
        {children}
      </div>
    </div>
  );
}

export interface AbxEmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  tone?: AbxStatusTone;
}

export function AbxEmptyState({
  title,
  message,
  actionLabel,
  onAction,
  actionHref,
  tone = "neutral",
}: AbxEmptyStateProps) {
  const colors = ABX_STATUS_COLORS[tone];

  return (
    <div
      className="abx-empty-state"
      style={{
        textAlign: "center",
        padding: "2rem 1.25rem",
        borderRadius: ABX_SPACING.cardRadius,
        border: `1px dashed ${colors.border}`,
        background: colors.faint,
      }}
    >
      <p style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
        {title}
      </p>
      <p style={{ margin: "0 0 1rem", fontFamily: FONT, ...ABX_TYPOGRAPHY.body, color: "var(--text-secondary)" }}>
        {message}
      </p>
      {actionLabel && (onAction || actionHref) && (
        <Btn onClick={onAction} href={actionHref} size="sm">
          {actionLabel}
        </Btn>
      )}
    </div>
  );
}

export interface AbxSkeletonProps {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: CSSProperties;
}

export function AbxSkeleton({ height = 16, width = "100%", radius = 8, style }: AbxSkeletonProps) {
  return (
    <div
      className="abx-skeleton"
      aria-hidden="true"
      style={{
        height,
        width,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export interface AbxStatusBadgeProps {
  label: string;
  tone: AbxStatusTone;
}

export function AbxStatusBadge({ label, tone }: AbxStatusBadgeProps) {
  const colors = ABX_STATUS_COLORS[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        fontFamily: FONT,
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: "0.22rem 0.55rem",
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        background: colors.faint,
        color: colors.color,
      }}
    >
      {label}
    </span>
  );
}

export function AbxLoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.85rem",
        padding: "2rem 1rem",
      }}
    >
      <AbxSkeleton height={40} width={40} radius={999} />
      <AbxSkeleton height={14} width={160} />
      <span className="sr-only">{label}</span>
    </div>
  );
}
