import { NextResponse } from "next/server";
export const runtime = "nodejs"; // ensure Node (not edge)

type PlanRequest = { script: string; genre?: string; targetDurationSec?: number };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PlanRequest;
    if (!body?.script?.trim()) {
      return NextResponse.json({ error: "Missing script" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const genre = body.genre ?? "Drama";
    const total = Math.min(Math.max(body.targetDurationSec ?? 45, 20), 90);

    const system = `
You are a trailer editor. Break a short screenplay excerpt into 3–6 concise shots that fit the total duration.
Each shot must include:
- "durationSec" (integer 5–15),
- "visualPrompt" (visual-only description),
- "voiceover" (short narration or selected dialogue),
- "captions" (on-screen text),
- optional "sfx".
Return ONLY JSON, no prose. Format:
{
  "totalDurationSec": number,
  "shots": [
    { "durationSec": number, "visualPrompt": string, "voiceover": string, "captions": string, "sfx"?: string }
  ]
}
Keep totalDurationSec close to target. Genre: ${genre}.
`.trim();

    const user = `
Script:
"""
${body.script.slice(0, 4000)}
"""
Target total duration (sec): ${total}
`.trim();

    // Try a broadly-available model; we can switch if account lacks access
    const model = "gpt-4o"; // fallback from gpt-4o-mini if needed
    const org = process.env.OPENAI_ORG_ID;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(org ? { "OpenAI-Organization": org } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const raw = await r.text(); // capture everything
    if (!r.ok) {
      // Bubble up the real cause so you can see it in the browser Network tab
      return NextResponse.json(
        { error: "LLM error", httpStatus: r.status, detail: raw },
        { status: 502 }
      );
    }

    // OpenAI's body is JSON with choices[0].message.content as a string
    let outer: any;
    try {
      outer = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Bad outer JSON", detail: raw }, { status: 502 });
    }
    const content: string = outer?.choices?.[0]?.message?.content ?? "";

    // Strip possible code fences and parse
    const stripped = content.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    let plan: any;
    try {
      plan = JSON.parse(stripped);
    } catch {
      return NextResponse.json({ error: "Bad JSON in content", content }, { status: 502 });
    }

    if (!plan?.shots || !Array.isArray(plan.shots)) {
      return NextResponse.json({ error: "Plan missing shots", plan }, { status: 502 });
    }

    return NextResponse.json(plan);
  } catch (err: any) {
    return NextResponse.json({ error: "Unhandled", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
