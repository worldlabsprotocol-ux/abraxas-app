import Image from "next/image";

export type ProtocolDiagramFigureProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
};

/** Productized diagram surface — reference art inside system chrome, not a floating slide. */
export function ProtocolDiagramFigure({
  src,
  alt,
  width,
  height,
  priority = false,
}: ProtocolDiagramFigureProps) {
  const webpSrc = src.endsWith(".png") ? src.replace(/\.png$/, ".webp") : src;
  return (
    <figure className="abx-pv-diagram">
      <div className="abx-pv-diagram__frame" style={{ aspectRatio: `${width} / ${height}` }}>
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="abx-pv-diagram__img"
            sizes="(max-width: 768px) 100vw, min(1200px, 92vw)"
            priority={priority}
            loading={priority ? undefined : "lazy"}
          />
        </picture>
        <div className="abx-pv-diagram__grid-overlay" aria-hidden="true" />
      </div>
    </figure>
  );
}
