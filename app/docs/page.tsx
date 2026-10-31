"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { DOCS_HUB_GROUPS, DOCS_HUB_NAV, type DocTopic } from "@/lib/docs/docsHub";
import { ABX_TAB_ACCENTS } from "@/lib/design/abraxasDesignSystem";
import styles from "./DocsPage.module.css";

const ACCENT = ABX_TAB_ACCENTS.developer.color;

function DocTopicDisclosure({ topic }: { topic: DocTopic }) {
  return (
    <details className={styles.topic}>
      <summary>{topic.title}</summary>
      <div className={styles.topicContent}>
        <p>{topic.summary}</p>
        <div className={styles.topicLinks}>
          {topic.readMore ? (
            <Link href={topic.readMore.href}>{topic.readMore.label}</Link>
          ) : null}
          {topic.links?.map((link, index) => (
            <Link key={`${link.href}-${index}`} href={link.href}>{link.label}</Link>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function DocsPage() {
  const [activeGroupId, setActiveGroupId] = useState(DOCS_HUB_NAV[0]?.id ?? "overview");
  const activeGroup = DOCS_HUB_GROUPS.find((group) => group.id === activeGroupId) ?? DOCS_HUB_GROUPS[0];

  return (
    <RedesignPage accent="developer" maxWidth={960}>
      <PageHeader
        accent="developer"
        eyebrow="Documentation"
        title="Developer documentation"
        subtitle="Choose a topic. Open the full reference when you need the details."
      />

      <nav className={styles.categories} aria-label="Documentation categories">
        {DOCS_HUB_NAV.map((item) => {
          const active = activeGroup?.id === item.id;
          return (
            <button
              key={item.id}
              className={styles.categoryButton}
              type="button"
              aria-pressed={active}
              aria-controls="docs-hub-topics"
              onClick={() => setActiveGroupId(item.id)}
              style={active ? {
                borderColor: `${ACCENT}88`,
                background: `${ACCENT}18`,
                color: ACCENT,
              } : undefined}
            >
              {item.title}
            </button>
          );
        })}
      </nav>

      {activeGroup ? (
        <section
          id="docs-hub-topics"
          className={styles.topics}
          aria-label={`${activeGroup.title} topics`}
          aria-live="polite"
        >
          <h2>{activeGroup.title}</h2>
          {activeGroup.topics.map((topic) => (
            <DocTopicDisclosure key={topic.id} topic={topic} />
          ))}
        </section>
      ) : null}

    </RedesignPage>
  );
}
