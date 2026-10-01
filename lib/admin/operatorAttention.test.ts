// FILE: lib/admin/operatorAttention.test.ts

import { describe, expect, it } from "vitest";
import {
  attentionSourcesNeedingAction,
  attentionSourcesUnavailable,
  type OperatorAttentionSnapshot,
} from "@/lib/admin/operatorAttention";

describe("operator attention presentation", () => {
  const snapshot: OperatorAttentionSnapshot = {
    generated_at: "2026-01-01T00:00:00.000Z",
    disclaimer: "test",
    sources: [
      { id: "a", label: "A", href: "/a", status: "ok", count: 2 },
      { id: "b", label: "B", href: "/b", status: "ok", count: 0 },
      { id: "c", label: "C", href: "/c", status: "unavailable", count: null, error: "down" },
    ],
  };

  it("does not treat unavailable sources as zero attention", () => {
    expect(attentionSourcesNeedingAction(snapshot).map(s => s.id)).toEqual(["a"]);
    expect(attentionSourcesUnavailable(snapshot).map(s => s.id)).toEqual(["c"]);
  });
});
