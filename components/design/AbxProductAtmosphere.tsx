// FILE: components/design/AbxProductAtmosphere.tsx
// Calm-tier depth layers shared across product shells (homepage uses premium hero).

export type AbxProductAtmosphereTier = "calm" | "expressive";

export function AbxProductAtmosphere({ tier = "calm" }: { tier?: AbxProductAtmosphereTier }) {
  return (
    <div className={`abx-product-atmosphere abx-product-atmosphere--${tier}`} aria-hidden="true">
      <div className="abx-product-atmosphere__glow" />
      <div className="abx-product-atmosphere__grid" />
    </div>
  );
}
