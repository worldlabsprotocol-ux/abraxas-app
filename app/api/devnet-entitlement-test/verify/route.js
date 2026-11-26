import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const text = await request.text();
    if (text.length > 32_000) throw Error('Evidence packet too large');
    const { verifyEvidence } = require('../../../../scripts/operations/verify-devnet-entitlement-lifecycle.cjs');
    return NextResponse.json(await verifyEvidence(JSON.parse(text)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ verified: false, error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
