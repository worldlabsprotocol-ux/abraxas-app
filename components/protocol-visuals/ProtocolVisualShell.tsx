import type { ReactNode } from "react";

export type ProtocolVisualShellProps = {
  id?: string;
  title: string;
  titleAccent?: string;
  kicker?: string;
  caption?: string;
  children: ReactNode;
  className?: string;
};

/** Shared frame for protocol diagrams — minimal copy, open layout. */
export function ProtocolVisualShell({
  id,
  title,
  titleAccent,
  kicker,
  caption,
  children,
  className = "",
}: ProtocolVisualShellProps) {
  return (
    <section
      id={id}
      className={`abx-pv-shell ${className}`.trim()}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      {kicker ? <p className="abx-pv-shell__kicker">{kicker}</p> : null}
      <h2 className="abx-pv-shell__title" id={id ? `${id}-title` : undefined}>
        {title}
        {titleAccent ? <span className="abx-pv-shell__title-accent"> {titleAccent}</span> : null}
      </h2>
      <div className="abx-pv-shell__canvas">{children}</div>
      {caption ? <p className="abx-pv-shell__caption">{caption}</p> : null}
    </section>
  );
}
