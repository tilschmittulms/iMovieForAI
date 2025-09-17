"use client";
import { useState } from "react";

type Shot = { durationSec: number; visualPrompt: string; voiceover: string; captions: string; sfx?: string; };
type Plan = { totalDurationSec: number; shots: Shot[] };

export default function Home() {
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [stills, setStills] = useState<Record<number, string>>({}); // shotIndex -> dataURL
  const [imageLoading, setImageLoading] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);
    setStills({});
    try {
      const res = await fetch("/api/plan-shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, genre: "Drama", targetDurationSec: 45 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to plan shots");
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function previewVoiceover(idx: number, text: string) {
    try {
      setPlayingIndex(idx);
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const detail = await r.json().catch(() => ({}));
        throw new Error(detail?.error || `TTS failed (${r.status})`);
      }
      const buf = await r.arrayBuffer();
      const blob = new Blob([buf], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlayingIndex(null);
      };
      await audio.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "TTS error");
      setPlayingIndex(null);
    }
  }

  async function generateStill(idx: number, prompt: string) {
    try {
      setImageLoading(idx);
      const r = await fetch("/api/still", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size: "1024x1024" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Image gen failed");
      const dataUrl = `data:image/png;base64,${data.b64}`;
      setStills((prev) => ({ ...prev, [idx]: dataUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image error");
    } finally {
      setImageLoading(null);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-3xl w-full space-y-6 p-6">
        <h1 className="text-4xl font-bold">iMovie for AI Videos 🎬</h1>
        <p className="text-gray-600">Plan shots, hear the lines, and generate stills.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full h-40 border rounded-lg p-3"
            placeholder="Paste your script here…"
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || !script.trim()}
          >
            {loading ? "Planning…" : "Plan Shots"}
          </button>
        </form>

        {error && <p className="text-red-600">{error}</p>}

        {plan && (
          <div className="mt-6 space-y-3">
            <h2 className="text-2xl font-semibold">Planned Shots ({plan.totalDurationSec}s)</h2>
            <ol className="space-y-4 list-decimal pl-6">
              {plan.shots.map((s, i) => (
                <li key={i} className="bg-white rounded-lg p-4 border">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500 mb-1">{s.durationSec}s</div>
                      <div className="font-medium">Visual: {s.visualPrompt}</div>
                      <div className="mt-1">VO: “{s.voiceover}”</div>
                      <div className="text-gray-600">Captions: {s.captions}</div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => previewVoiceover(i, s.voiceover)}
                          className="px-3 py-1.5 text-sm rounded bg-black text-white disabled:opacity-50"
                          disabled={playingIndex === i}
                        >
                          {playingIndex === i ? "Playing…" : "Preview VO"}
                        </button>
                        <button
                          onClick={() => generateStill(i, s.visualPrompt)}
                          className="px-3 py-1.5 text-sm rounded bg-gray-700 text-white disabled:opacity-50"
                          disabled={imageLoading === i}
                        >
                          {imageLoading === i ? "Generating…" : "Generate Still"}
                        </button>
                      </div>
                    </div>

                    {stills[i] && (
                      <img
                        src={stills[i]}
                        alt={`Shot ${i + 1}`}
                        className="w-56 h-32 object-cover rounded-md border"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
