import { describe, expect, it } from "vitest";
import {
  BRAND_DIRECTIONS,
  OPERATOR_DIRECTIONS,
  RECOMMENDED_BRAND_DIRECTION,
  RECOMMENDED_OPERATOR_DIRECTION,
} from "./brandExplorationMeta";

describe("brand exploration meta", () => {
  it("defines three distinct protocol directions and a living-protocol recommendation", () => {
    expect(BRAND_DIRECTIONS).toHaveLength(3);
    const ids = new Set(BRAND_DIRECTIONS.map((d) => d.id));
    expect(ids.size).toBe(3);
    expect(RECOMMENDED_BRAND_DIRECTION).toBe("living-protocol");
  });

  it("defines three operator directions with protocol-entity recommendation", () => {
    expect(OPERATOR_DIRECTIONS).toHaveLength(3);
    expect(RECOMMENDED_OPERATOR_DIRECTION).toBe("protocol-entity");
  });
});
