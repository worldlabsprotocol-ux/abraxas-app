// FILE: lib/agenticFinancePositioning.test.ts

import { describe, expect, it } from "vitest";
import {
  AGENTIC_FINANCE_COMPOSE_FLOW,
  AGENTIC_FINANCE_HEADLINE,
  ROBINHOOD_TRADING_MCP_URL,
  getAgenticFinanceStack,
} from "./agenticFinancePositioning";

describe("agenticFinancePositioning", () => {
  it("exports Robinhood MCP URL", () => {
    expect(ROBINHOOD_TRADING_MCP_URL).toBe("https://agent.robinhood.com/mcp/trading");
  });

  it("exports agentic finance stack with both layers", () => {
    const stack = getAgenticFinanceStack();
    expect(stack.schema).toBe("abraxas.agentic_finance.v1");
    expect(stack.headline).toBe(AGENTIC_FINANCE_HEADLINE);
    expect(stack.stack).toHaveLength(2);
    expect(stack.stack.find(l => l.id === "verify")?.abraxas).toBe(true);
    expect(stack.stack.find(l => l.id === "act")?.abraxas).toBe(false);
  });

  it("includes Robinhood reference without claiming integration", () => {
    const stack = getAgenticFinanceStack();
    expect(stack.robinhood_reference.mcp_url).toBe(ROBINHOOD_TRADING_MCP_URL);
    expect(stack.robinhood_reference.disclaimer).toMatch(/not affiliated/i);
    expect(stack.independence).toMatch(/independent/i);
  });

  it("defines compose flow ending in act layer", () => {
    expect(AGENTIC_FINANCE_COMPOSE_FLOW.length).toBeGreaterThanOrEqual(3);
    expect(AGENTIC_FINANCE_COMPOSE_FLOW.at(-1)).toMatch(/act-layer/i);
  });

  it("links Abraxas agent endpoints", () => {
    const stack = getAgenticFinanceStack();
    expect(stack.abraxas_role.endpoints.verify).toBe("POST /api/credentials/verify");
    expect(stack.docs.json).toContain("/api/docs/agents");
  });
});
