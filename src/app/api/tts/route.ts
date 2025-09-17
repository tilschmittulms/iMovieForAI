import { NextResponse } from "next/server";
export const runtime = "nodejs";

// A well-known default voice from ElevenLabs docs. Replace later if you like.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel"
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

type TTSRequest = {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number; // 0..1
  similarityBoost?: number; // 0..1
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TTSRequest;

    const text = body?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    }

    const voiceId = body.voiceId || DEFAULT_VOICE_ID;
    const modelId = body.modelId || DEFAULT_MODEL_ID;

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: body.stability ?? 0.5,
          similarity_boost: body.similarityBoost ?? 0.7,
        },
      }),
    });

    if (!r.ok || !r.body) {
      const detail = await r.text().catch(() => "");
      return NextResponse.json(
        { error: "TTS error", httpStatus: r.status, detail },
        { status: 502 }
      );
    }

    // Stream MP3 back to the browser
    return new NextResponse(r.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Unhandled", detail: String((err as Error)?.message ?? err) },
      { status: 500 }
    );
  }
}
