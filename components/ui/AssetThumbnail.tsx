// FILE: components/ui/AssetThumbnail.tsx
// Consistent small asset thumbnails for registry and preview cards.

const BG = "#06090B";

export function AssetThumbnail({
  src,
  alt,
  size = 64,
  objectPosition = "center",
  borderRadius = 10,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  objectPosition?: string;
  borderRadius?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius,
        overflow: "hidden",
        background: BG,
        border: "1px solid var(--border-strong)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          objectPosition,
        }}
      />
    </div>
  );
}

export function assetThumbObjectPosition(assetId: string): string {
  if (assetId === "genesis-asset") return "50% 12%";
  if (assetId === "smyrna-townhome") return "center center";
  return "center";
}
