"use client";
// FILE: components/product/AbraxasGuideDialog.tsx

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ABRAXAS_GUIDE_ENTRIES,
  filterAbraxasGuideEntries,
  type AbraxasGuideEntry,
} from "@/lib/product/abraxasGuideContent";

type AbraxasGuideDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AbraxasGuideDialog({ open, onClose }: AbraxasGuideDialogProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const entries = filterAbraxasGuideEntries(query);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div className="abx-guide-backdrop" role="presentation" onClick={onClose}>
      <div
        className="abx-guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="abx-guide-dialog__header">
          <h2 id={titleId} className="abx-guide-dialog__title">
            Abraxas Guide
          </h2>
          <button type="button" className="abx-guide-dialog__close" onClick={onClose} aria-label="Close guide">
            ×
          </button>
        </header>
        <label className="abx-guide-dialog__search-label">
          <span className="abx-guide-dialog__search-hint">Search terms</span>
          <input
            ref={inputRef}
            type="search"
            className="abx-guide-dialog__search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Proof, workspace, permit…"
            autoComplete="off"
          />
        </label>
        <ul className="abx-guide-dialog__list">
          {entries.length === 0 ? (
            <li className="abx-guide-dialog__empty">No matching terms. Try “proof” or “workspace”.</li>
          ) : (
            entries.map((entry) => <GuideEntryItem key={entry.id} entry={entry} />)
          )}
        </ul>
        <p className="abx-guide-dialog__footer">
          Static reference only. For integration detail, open{" "}
          <a href="/docs" className="abx-guide-dialog__link">
            developer documentation
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function GuideEntryItem({ entry }: { entry: AbraxasGuideEntry }) {
  return (
    <li className="abx-guide-dialog__item">
      <h3 className="abx-guide-dialog__term">{entry.term}</h3>
      <p className="abx-guide-dialog__summary">{entry.summary}</p>
      <p className="abx-guide-dialog__detail">{entry.detail}</p>
      {entry.stage ? <p className="abx-guide-dialog__stage">Typical stage: {entry.stage}</p> : null}
      {entry.suggestedQuestions?.length ? (
        <ul className="abx-guide-dialog__questions">
          {entry.suggestedQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function AbraxasGuideNavButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="abx-guide-nav-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Guide
      </button>
      <AbraxasGuideDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
