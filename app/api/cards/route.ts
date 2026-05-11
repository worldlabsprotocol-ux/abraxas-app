// FILE: app/api/cards/route.ts
// Returns all inventory assets. Used by MarketsLayer and TerminalArena.
import { NextResponse } from "next/server";
import inventoryData from "@/data/inventory.json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(inventoryData);
}