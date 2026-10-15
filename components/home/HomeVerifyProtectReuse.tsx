"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  CINEMATIC_VPR_HEADLINE,
  CINEMATIC_VPR_SIM_LABEL,
} from "@/lib/home/cinematicHomeCopy";

type VprScene = "verify" | "protect" | "reuse";

const SCENES: { id: VprScene; label: string; title: string; body: string }[] = [
  {
    id: "verify",
    label: "Verify",
    title: "Complete verification once",
    body: "You confirm eligibility with Abraxas. Evidence stays with you, not copied into every partner database.",
  },
  {
    id: "protect",
    label: "Protect",
    title: "Personal details lock away",
    body: "Name, ID images, and birth date move behind a protected boundary. Partners never receive the raw packet.",
  },
  {
    id: "reuse",
    label: "Reuse",
    title: "Apps request specific answers",
    body: "Each application asks its own policy question. You share only the scoped receipt that policy allows.",
  },
];

const REUSE_APPS = [
  {
    name: "Simulated retail app",
    policy: "policy_age21_retail_v3",
    outcome: "PERMIT",
    detail: "21+ eligible",
  },
  {
    name: "Simulated venue app",
    policy: "policy_residency_pilot_v1",
    outcome: "DENY",
    detail: "Residency not satisfied under separate policy",
  },
] as const;

export function HomeVerifyProtectReuse() {
  const [scene, setScene] = useState<VprScene>("verify");
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion || !inView) return;
    const order: VprScene[] = ["verify", "protect", "reuse"];
    let idx = order.indexOf(scene);
    const timer = window.setInterval(() => {
      idx = (idx + 1) % order.length;
      setScene(order[idx]!);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [reduceMotion, inView, scene]);

  const selectScene = useCallback((id: VprScene) => setScene(id), []);

  const active = SCENES.find((s) => s.id === scene) ?? SCENES[0];

  return (
    <section
      ref={sectionRef}
      id="how-abraxas-works"
      className="abx-cinematic-chapter abx-cinematic-vpr"
      aria-labelledby="home-vpr-heading"
    >
      <p className="abx-v2-eyebrow">Interactive story</p>
      <h2 id="home-vpr-heading" className="abx-v2-section-title">
        {CINEMATIC_VPR_HEADLINE}
      </h2>
      <p className="abx-cinematic-vpr__sim-label">{CINEMATIC_VPR_SIM_LABEL}</p>

      <div className="abx-cinematic-vpr__rail" role="tablist" aria-label="Verification story scenes">
        {SCENES.map((s) => {
          const selected = s.id === scene;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`abx-cinematic-vpr__tab${selected ? " abx-cinematic-vpr__tab--active" : ""}`}
              onClick={() => selectScene(s.id)}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="abx-cinematic-vpr__stage" aria-live="polite">
        <div className={`abx-cinematic-vpr__scene abx-cinematic-vpr__scene--${scene}`}>
          <div className="abx-cinematic-vpr__scene-copy">
            <h3 className="abx-cinematic-vpr__scene-title">{active.title}</h3>
            <p className="abx-cinematic-vpr__scene-body">{active.body}</p>
          </div>

          <div className="abx-cinematic-vpr__diagram">
            {scene === "verify" ? (
              <div className="abx-cinematic-vpr__person">
                <span className="abx-cinematic-vpr__chip">Holder</span>
                <div className="abx-cinematic-vpr__doc-stack">
                  <span>Evidence</span>
                  <span className="abx-cinematic-vpr__pulse">Verify once</span>
                </div>
              </div>
            ) : null}

            {scene === "protect" ? (
              <div className="abx-cinematic-vpr__vault">
                <span className="abx-cinematic-vpr__lock" aria-hidden="true">
                  ◆
                </span>
                <ul className="abx-cinematic-vpr__hidden-fields">
                  <li className="abx-cinematic-vpr__hidden">Legal name</li>
                  <li className="abx-cinematic-vpr__hidden">ID scan</li>
                  <li className="abx-cinematic-vpr__hidden">Date of birth</li>
                </ul>
                <span className="abx-cinematic-vpr__vault-label">Protected boundary</span>
              </div>
            ) : null}

            {scene === "reuse" ? (
              <div className="abx-cinematic-vpr__apps">
                {REUSE_APPS.map((app) => (
                  <article key={app.policy} className="abx-cinematic-vpr__app-card">
                    <header>{app.name}</header>
                    <code className="abx-cinematic-vpr__policy">{app.policy}</code>
                    <p
                      className={`abx-cinematic-vpr__outcome abx-cinematic-vpr__outcome--${app.outcome.toLowerCase()}`}
                    >
                      {app.outcome}
                    </p>
                    <p className="abx-cinematic-vpr__app-detail">{app.detail}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
