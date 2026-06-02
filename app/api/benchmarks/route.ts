import { NextResponse } from "next/server";
import { analyzePantry } from "@/lib/pantry";
import type { PantryGoal } from "@/lib/pantry";

const benchmarkSamples: Array<{ pantry: string; goal: PantryGoal }> = [
  { pantry: "rice, egg, cabbage, soy sauce", goal: "japanese" },
  { pantry: "tomato, onion, garlic, pasta", goal: "mediterranean" },
  { pantry: "yogurt, rice, lentil, cumin", goal: "south_asian" },
  { pantry: "chicken, potato, carrot, vinegar", goal: "more_meals" },
  { pantry: "beans, tortilla, tomato, onion", goal: "latin_american" },
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = performance.now();
  const runs = [];

  for (const sample of benchmarkSamples) {
    const runStartedAt = performance.now();
    const analysis = await analyzePantry({
      pantry: sample.pantry,
      goal: sample.goal,
      limit: 6,
    });
    const durationMs = Math.round(performance.now() - runStartedAt);

    runs.push({
      pantry: sample.pantry,
      goal: sample.goal,
      durationMs,
      matched: analysis.matched.length,
      recommendations: analysis.recommendations.length,
    });
  }

  const durations = runs.map((run) => run.durationMs);
  const totalDurationMs = Math.round(performance.now() - startedAt);
  const averageMs = Math.round(
    durations.reduce((total, duration) => total + duration, 0) / durations.length,
  );

  return NextResponse.json({
    source: "Larder Atlas local benchmark",
    note: "Measures bundled Epicure data and deterministic Larder Atlas scoring. It is not an Epicure paper benchmark.",
    generatedAt: new Date().toISOString(),
    summary: {
      runs: runs.length,
      totalDurationMs,
      averageMs,
      fastestMs: Math.min(...durations),
      slowestMs: Math.max(...durations),
      modelCalls: 0,
    },
    runs,
  });
}
