"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AbxInnerPage } from "@/components/design/AbxInnerPage";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { DOCS_HUB_GROUPS, DOCS_HUB_NAV, type DocGroup, type DocTopic } from "@/lib/docs/docsHub";
import styles from "./DocsPage.module.css";

function DocTopicDisclosure({ group, topic }: { group: DocGroup; topic: DocTopic }) {
  const title = topic.id === group.id
    ? topic.id === "overview" ? "About Abraxas" : topic.id === "quick-start" ? "Start here" : "Integration status"
    : topic.title;

  return (
    <details className={styles.topic}>
      <summary>{title}</summary>
      <div className={styles.topicContent}>
        <p>{topic.summary}</p>
        <div className={styles.topicLinks}>
          {topic.readMore ? <Link href={topic.readMore.href}>{topic.readMore.label}</Link> : null}
          {topic.links?.map((link, index) => (
            <Link key={`${link.href}-${index}`} href={link.href}>{link.label}</Link>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function DocsPage() {
  const [activeGroup, setActiveGroup] = useState(DOCS_HUB_NAV[0]?.id ?? "overview");

  useEffect(() => {
    const updateActiveGroup = () => {
      const offset = 150;
      let nextGroup = DOCS_HUB_NAV[0]?.id ?? "overview";
      for (const group of DOCS_HUB_GROUPS) {
        const section = document.getElementById(`docs-group-${group.id}`);
        if (section && section.getBoundingClientRect().top <= offset) nextGroup = group.id;
      }
      setActiveGroup(nextGroup);
    };

    window.addEventListener("scroll", updateActiveGroup, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveGroup);
  }, []);

  return (
    <RedesignPage accent="developer" maxWidth={1000}>
      <AbxInnerPage
        accent="developer"
        eyebrow="Documentation"
        title="Protocol docs"
        lead="Find a topic. Open it for the summary and full references."
        maxWidth={1000}
      >
        <nav className={styles.navigation} aria-label="Documentation sections">
          {DOCS_HUB_NAV.map((item) => (
            <a
              key={item.id}
              href={`#docs-group-${item.id}`}
              aria-current={activeGroup === item.id ? "location" : undefined}
              onClick={() => setActiveGroup(item.id)}
            >
              {item.title}
            </a>
          ))}
        </nav>

        <div className={styles.groups}>
          {DOCS_HUB_GROUPS.map((group) => (
            <section
              key={group.id}
              id={`docs-group-${group.id}`}
              className={styles.group}
              aria-labelledby={`docs-heading-${group.id}`}
            >
              <h2 id={`docs-heading-${group.id}`}>{group.title}</h2>
              {group.topics.map((topic) => (
                <DocTopicDisclosure key={topic.id} group={group} topic={topic} />
              ))}
            </section>
          ))}
        </div>
      </AbxInnerPage>
    </RedesignPage>
  );
}
