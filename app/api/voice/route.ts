// FILE: app/api/voice/route.ts
// ElevenLabs TTS — streams audio back to client.
// VOICE_ENABLED=true in Vercel env to activate (protects free-tier credits).
// Uses streaming so audio starts playing immediately (~200ms latency).
// Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in Vercel env vars.

import { NextRequest, NextResponse } from "next/server";

const VOICE_ENABLED  = process.env.VOICE_ENABLED === "true";
const API_KEY        = process.env.ELEVENLABS_API_KEY ?? "";
const VOICE_ID       = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel — default
const MODEL_ID       = "eleven_turbo_v2"; // lowest latency, free tier eligible
const MAX_CHARS      = 400; // hard cap — protect 10k monthly credit limit

// Default agent persona — override via request body
const PERSONA = "Abraxas Prime";

export async function POST(req: NextRequest) {
  if (!VOICE_ENABLED) {
    return NextResponse.json({ ok: false, reason: "Voice disabled. Set VOICE_ENABLED=true in Vercel env." });
  }
  if (!API_KEY) {
    return NextResponse.json({ ok: false, reason: "ELEVENLABS_API_KEY not set." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  let text: string = body?.text ?? "";

  if (!text.trim()) {
    return NextResponse.json({ ok: false, reason: "No text provided." }, { status: 400 });
  }

  // Hard truncate — never burn more than MAX_CHARS per call
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS - 3) + "…";
  }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key":   API_KEY,
          "Content-Type": "application/json",
          "Accept":       "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id:       MODEL_ID,
          voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
        }),
      }
    );

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error("[voice] ElevenLabs error:", err);
      return NextResponse.json({ ok: false, reason: `ElevenLabs ${upstream.status}` }, { status: 502 });
    }

    // Stream audio directly to client — starts playing immediately
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type":  "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store",
      },
    });

  } catch (err) {
    console.error("[voice] fetch error:", err);
    return NextResponse.json({ ok: false, reason: err instanceof Error ? err.message : "Stream failed" }, { status: 500 });
  }
}