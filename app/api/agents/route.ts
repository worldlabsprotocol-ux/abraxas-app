// FILE: app/api/agents/route.ts
// Sophia agent system API. Server-side only.
// GET /api/agents?vaultId=490 → agent + decisions for vault
// GET /api/agents → all agents

import { NextRequest, NextResponse } from "next/server";
import { AGENTS, runAgentEvaluation, simulateAgentSignals } from "@/lib/agentEngine";

export async function GET(req: NextRequest) {
  const vaultId = req.nextUrl.searchParams.get("vaultId");

  if (vaultId) {
    const agent = AGENTS.find((a) => a.vaultId === vaultId);
    if (!agent) {
      return NextResponse.json({ ok: false, error: "No agent for vault" }, { status: 404 });
    }
    const signals   = simulateAgentSignals(agent.strategy);
    const decisions = runAgentEvaluation(agent, signals);
    return NextResponse.json({ ok: true, agent, decisions, signals }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const all = AGENTS.map((agent) => {
    const signals   = simulateAgentSignals(agent.strategy);
    const decisions = runAgentEvaluation(agent, signals);
    return { agent, decisions };
  });

  return NextResponse.json({ ok: true, agents: all }, {
    headers: { "Cache-Control": "no-store" },
  });
}