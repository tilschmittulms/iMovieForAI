"use client";
import { useState } from "react";

type Shot = { durationSec: number; visualPrompt: string; voiceover: string; captions: string; sfx?: string; };
type Plan = { totalDurationSec: number; shots: Shot[] };

export default function Home() {
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/plan-shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, genre: "Drama", targetDurationSec: 45 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to plan shots");
      setPlan(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full space-y-6 p-6">
        <h1 className="text-4xl font-bold">iMovie for AI Videos 🎬</h1>
        <p className="text-gray-600">Paste a short script, we’ll plan your shots.</p>

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
          <div className="mt-6 space-y-2">
            <h2 className="text-2xl font-semibold">Planned Shots ({plan.totalDurationSec}s)</h2>
            <ol className="space-y-3 list-decimal pl-6">
              {plan.shots.map((s, i) => (
                <li key={i} className="bg-white rounded-lg p-4 border">
                  <div className="text-sm text-gray-500">{s.durationSec}s</div>
                  <div className="font-medium">Visual: {s.visualPrompt}</div>
                  <div>VO: “{s.voiceover}”</div>
                  <div className="text-gray-600">Captions: {s.captions}</div>
                  {s.sfx && <div className="text-gray-500 text-sm">SFX: {s.sfx}</div>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
