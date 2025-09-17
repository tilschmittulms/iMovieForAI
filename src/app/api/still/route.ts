import { NextResponse } from "next/server";
export const runtime = "nodejs";

// Only allow sizes the API supports reliably
const SUPPORTED_SIZES = new Set<"256x256" | "512x512" | "1024x1024">([
  "256x256",
  "512x512",
  "1024x1024",
]);

type StillReq = { prompt: string; size?: "256x256" | "512x512" | "1024x1024" };

export async function POST(req: Request) {
  try {
    const { prompt, size } = (await req.json()) as StillReq;
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const chosenSize: "256x256" | "512x512" | "1024x1024" =
      SUPPORTED_SIZES.has(size ?? "1024x1024") ? (size ?? "1024x1024") : "1024x1024";

    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: chosenSize,            // ✅ use a supported size
        // quality: "standard",      // (optional)
        // style: "vivid",           // (optional)
      }),
    });

    const json = await r.json().catch(() => null);

    if (!r.ok) {
      return NextResponse.json(
        { error: "Image gen failed", httpStatus: r.status, detail: json },
        { status: 502 }
      );
    }

    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) {
      return NextResponse.json({ error: "No image returned", detail: json }, { status: 502 });
    }

    return NextResponse.json({ b64 });
  } catch (err) {
    return NextResponse.json(
      { error: "Unhandled", detail: String((err as Error)?.message ?? err) },
      { status: 500 }
    );
  }
}
