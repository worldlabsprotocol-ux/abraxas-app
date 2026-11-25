import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prepare } = require('../../../../scripts/operations/devnet-entitlement-wallet-prepare.cjs');
    return NextResponse.json(await prepare(body), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Preparation failed' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
