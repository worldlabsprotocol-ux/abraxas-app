import Image from "next/image";

export type ProtocolDiagramFigureProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  /** Reference-only art — omit alt text when titled elsewhere. */
  decorative?: boolean;
};

/** Productized diagram surface — reference art inside system chrome, not a floating slide. */
export function ProtocolDiagramFigure({
  src,
  alt,
  width,
  height,
  priority = false,
  decorative = false,
}: ProtocolDiagramFigureProps) {
  const webpSrc = src.endsWith(".webp") ? src : src.replace(/\.png$/, ".webp");
  return (
    <figure className="abx-pv-diagram">
      <div className="abx-pv-diagram__scroll">
        <div className="abx-pv-diagram__frame" style={{ aspectRatio: `${width} / ${height}` }}>
          <Image
            src={webpSrc}
            alt={decorative ? "" : alt}
            width={width}
            height={height}
            className="abx-pv-diagram__img"
            sizes="(max-width: 768px) 100vw, min(960px, 92vw)"
            priority={priority}
            loading={priority ? undefined : "lazy"}
          />
          <div className="abx-pv-diagram__grid-overlay" aria-hidden="true" />
        </div>
      </div>
      {!decorative && alt ? <figcaption className="abx-pv-diagram__sr-only">{alt}</figcaption> : null}
    </figure>
  );
}
