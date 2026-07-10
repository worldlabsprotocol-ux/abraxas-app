"use client";
// FILE: app/about/team/page.tsx
// Execution & team transparency for VC diligence.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  TEAM_MISSION,
  CURRENT_TEAM,
  PLANNED_ROLES,
  ADVISOR_BENCH,
  EXECUTION_PROOF,
  BUILDER_CONTEXT,
} from "@/lib/teamProfile";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export default function TeamPage() {
  return (
    <RedesignPage maxWidth={860}>
      <PageHeader
        eyebrow="Execution & team"
        title="Who builds Abraxas"
        subtitle={TEAM_MISSION}
      />

      <ContentCard title={BUILDER_CONTEXT.headline}>
        <p style={body}>{BUILDER_CONTEXT.body}</p>
      </ContentCard>

      <ContentCard title="Current team">
        {CURRENT_TEAM.map(member => (
          <div key={member.name} style={{ marginBottom: "1rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {member.name}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 600, color: ACCENT, marginBottom: "0.35rem" }}>
              {member.role}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              {member.focus}
            </div>
            <p style={{ ...body, marginBottom: "0.65rem" }}>{member.bio}</p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {member.links.map(link => (
                <Link key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: FONT, fontSize: "0.72rem", color: ACCENT, textDecoration: "none", fontWeight: 600 }}>
                  {link.label} →
                </Link>
              ))}
            </div>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Planned growth">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {PLANNED_ROLES.map(role => (
            <div key={role.role} style={{
              padding: "0.75rem", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {role.role}
                </span>
                <span style={{
                  fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700, color: "#F59E0B",
                  padding: "0.15rem 0.45rem", borderRadius: 999,
                  background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                }}>
                  {role.timing}
                </span>
              </div>
              <p style={{ ...body, marginTop: "0.35rem" }}>{role.why}</p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Advisor bench">
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          <strong style={{ color: "var(--text-primary)" }}>{ADVISOR_BENCH.status}.</strong> {ADVISOR_BENCH.note}
        </p>
        <BulletList items={[...ADVISOR_BENCH.targetProfiles]} />
      </ContentCard>

      <ContentCard title="Execution proof (inspect yourself)">
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {EXECUTION_PROOF.map(item => (
            <Link key={item.href} href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem",
                padding: "0.65rem 0", borderBottom: "1px solid var(--border)",
                textDecoration: "none", color: "inherit",
              }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)" }}>{item.desc}</div>
              </div>
              <span style={{ color: ACCENT, alignSelf: "center" }}>→</span>
            </Link>
          ))}
        </div>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/docs" size="lg">Documentation →</Btn>
        <Btn href="/about" variant="secondary" size="lg">About explainer</Btn>
        <Link href="/roadmap" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Roadmap →
        </Link>
      </div>
    </RedesignPage>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: 0,
};
