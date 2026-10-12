"use client";

import { useState } from "react";
import { AbraxasLogo } from "@/components/brand/AbraxasLogo";
import { TRUST_MODEL_STAGES, type TrustModelStageId } from "@/lib/home/trustModelStages";

export function TrustModelExhibit() {
  const [active, setActive] = useState<TrustModelStageId>("holder");
  const stage = TRUST_MODEL_STAGES.find((s) => s.id === active) ?? TRUST_MODEL_STAGES[0];

  return (
    <section className="abx-trust-exhibit" aria-labelledby="trust-exhibit-heading">
      <div className="abx-trust-exhibit__header">
        <p className="abx-v2-eyebrow">Architecture exhibit</p>
        <h2 id="trust-exhibit-heading" className="abx-v2-section-title">
          Trust model
        </h2>
      </div>

      <div className="abx-trust-exhibit__layout">
        <aside className="abx-trust-exhibit__rail" aria-label="Trust model index">
          <span className="abx-trust-exhibit__rail-label">01 / TRUST MODEL</span>
          <div className="abx-trust-exhibit__brand-mark">
            <AbraxasLogo variant="emblem" emblemSize={88} href={undefined} emblemOnly />
          </div>
        </aside>

        <div className="abx-trust-exhibit__flow" role="tablist" aria-label="Protocol stages">
          {TRUST_MODEL_STAGES.map((s, idx) => {
            const selected = s.id === active;
            return (
              <div key={s.id} className="abx-trust-exhibit__flow-item">
                {idx > 0 ? <span className="abx-trust-exhibit__connector" aria-hidden="true" /> : null}
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`abx-trust-exhibit__node${selected ? " abx-trust-exhibit__node--active" : ""}`}
                  onClick={() => setActive(s.id)}
                >
                  <span className="abx-trust-exhibit__node-index">{s.index}</span>
                  <span className="abx-trust-exhibit__node-title">{s.title}</span>
                </button>
              </div>
            );
          })}
        </div>

        <aside className="abx-trust-exhibit__context" aria-live="polite">
          <p className="abx-trust-exhibit__boundary">{stage.boundary}</p>
          <h3 className="abx-trust-exhibit__context-title">{stage.title}</h3>
          <p className="abx-trust-exhibit__summary">{stage.summary}</p>
          <p className="abx-trust-exhibit__detail">{stage.detail}</p>
        </aside>
      </div>
    </section>
  );
}
