"use client";

import { FormEvent, useMemo, useState } from "react";
import { PantryMap, type PantryMapPoint } from "./PantryMap";

type PublicIngredient = {
  nodeId: number;
  name: string;
  primaryCategory: string;
  isVegetarian: boolean;
  isVegan: boolean;
  tag?: {
    foodGroup: string;
    cuisineRegion: string;
    novaLevel: number | null;
  };
  atlas?: {
    x: number;
    y: number;
  };
};

type RecommendResponse = {
  matched: Array<{
    input: string;
    ingredient: PublicIngredient;
  }>;
  missing: string[];
  cuisineAffinity: Array<{
    cuisine: string;
    score: number;
  }>;
  categoryAffinity: Array<{
    category: string;
    score: number;
  }>;
  recommendations: Array<{
    ingredient: PublicIngredient;
    score: number;
    reasons: string[];
  }>;
  explanation: string;
};

type PantryGoal =
  | "more_meals"
  | "less_boring"
  | "east_asian"
  | "japanese"
  | "south_asian"
  | "latin_american"
  | "mediterranean";

const pantryGoals: Array<{ id: PantryGoal; label: string }> = [
  { id: "more_meals", label: "More meals" },
  { id: "less_boring", label: "Less boring" },
  { id: "east_asian", label: "East Asian" },
  { id: "japanese", label: "Japanese" },
  { id: "south_asian", label: "South Asian" },
  { id: "latin_american", label: "Latin American" },
  { id: "mediterranean", label: "Mediterranean" },
];

const samplePantries = [
  "rice, egg, cabbage, soy sauce",
  "tomato, onion, garlic, pasta",
  "yogurt, rice, lentil, cumin",
];

export function PantryInputExperience() {
  const [pantry, setPantry] = useState(samplePantries[0]);
  const [goal, setGoal] = useState<PantryGoal>("more_meals");
  const [analysis, setAnalysis] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const topRecommendation = analysis?.recommendations[0];
  const hasResults = Boolean(analysis);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pantry, goal, limit: 6 }),
      });

      if (!response.ok) {
        throw new Error("The pantry could not be analyzed.");
      }

      setAnalysis(await response.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  const matchedNames = useMemo(
    () => analysis?.matched.map((item) => humanize(item.ingredient.name)) ?? [],
    [analysis],
  );
  const mapPoints = useMemo(() => buildMapPoints(analysis), [analysis]);

  return (
    <main className="min-h-screen bg-[#f8f6f0] text-[#1f2520]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-3 border-b border-[#ded8c8] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#6d765f]">
              Larder Atlas
            </p>
            <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight text-[#182019] sm:text-5xl">
              Map what is on hand. Find what unlocks dinner.
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#596153]">
            Powered by Epicure ingredient embeddings and no-cost template
            explanations. AI narrator comes later.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-lg border border-[#ded8c8] bg-[#fffdf8] p-5 shadow-sm"
          >
            <div>
              <label
                htmlFor="pantry"
                className="text-sm font-semibold text-[#2e372d]"
              >
                What is in your kitchen?
              </label>
              <textarea
                id="pantry"
                value={pantry}
                onChange={(event) => setPantry(event.target.value)}
                className="mt-3 min-h-36 w-full resize-none rounded-md border border-[#d8d0be] bg-white p-4 text-base leading-7 outline-none transition focus:border-[#62724f] focus:ring-4 focus:ring-[#62724f]/10"
                placeholder="rice, egg, cabbage, soy sauce"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {samplePantries.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setPantry(sample)}
                  className="rounded-full border border-[#d8d0be] px-3 py-1.5 text-sm text-[#596153] transition hover:border-[#62724f] hover:text-[#2e372d]"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-[#2e372d]">Goal</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pantryGoals.map((item) => {
                  const isSelected = item.id === goal;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id)}
                      className={[
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                        isSelected
                          ? "border-[#263421] bg-[#263421] text-white"
                          : "border-[#d8d0be] text-[#596153] hover:border-[#62724f] hover:text-[#2e372d]",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-12 items-center justify-center rounded-md bg-[#263421] px-5 text-sm font-semibold text-white transition hover:bg-[#34452d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Mapping pantry..." : "Analyze pantry"}
            </button>

            {error ? (
              <p className="rounded-md bg-[#f8e8df] px-3 py-2 text-sm text-[#8a341f]">
                {error}
              </p>
            ) : null}
          </form>

          <section className="grid gap-5">
            <article className="rounded-lg border border-[#ded8c8] bg-[#fffdf8] p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#6d765f]">
                Smartest buy
              </p>
              {topRecommendation ? (
                <div className="mt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {humanize(topRecommendation.ingredient.name)}
                    </h2>
                    <span className="w-fit rounded-full bg-[#e4ead7] px-3 py-1 text-sm font-medium text-[#3f5133]">
                      score {topRecommendation.score.toFixed(3)}
                    </span>
                  </div>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#4f584b]">
                    {analysis?.explanation}
                  </p>
                </div>
              ) : (
                <EmptyState hasResults={hasResults} />
              )}
            </article>

            <div className="grid gap-5 xl:grid-cols-2">
              <article className="rounded-lg border border-[#ded8c8] bg-[#fffdf8] p-5 shadow-sm">
                <SectionTitle title="Matched pantry" />
                {matchedNames.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {matchedNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-[#edf0e5] px-3 py-1.5 text-sm font-medium text-[#384632]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#6d7568]">
                    Add ingredients and run the analysis.
                  </p>
                )}
                {analysis?.missing.length ? (
                  <p className="mt-4 text-sm text-[#9a5a32]">
                    Not found yet: {analysis.missing.join(", ")}
                  </p>
                ) : null}
              </article>

              <article className="rounded-lg border border-[#ded8c8] bg-[#fffdf8] p-5 shadow-sm">
                <SectionTitle title="Pantry shape" />
                <AffinityList
                  label="Cuisine"
                  items={analysis?.cuisineAffinity.map((item) => ({
                    name: item.cuisine,
                    score: item.score,
                  }))}
                />
                <AffinityList
                  label="Category"
                  items={analysis?.categoryAffinity.map((item) => ({
                    name: item.category,
                    score: item.score,
                  }))}
                />
              </article>
            </div>
          </section>
        </section>

        <section className="grid gap-5 rounded-lg border border-[#ded8c8] bg-[#fffdf8] p-5 shadow-sm lg:grid-cols-[1.35fr_0.65fr]">
          <PantryMap points={mapPoints} />
          <div className="flex flex-col justify-between gap-5">
            <div>
              <SectionTitle title="Atlas signal" />
              <p className="mt-3 text-sm leading-6 text-[#596153]">
                Your pantry cluster shows the cooking territory you already
                occupy. The highlighted buys show nearby moves and wider jumps
                from that starting point.
              </p>
            </div>
            <div className="rounded-md bg-[#f4f7ed] p-4 text-sm leading-6 text-[#4f584b]">
              Pantry items are teal. Recommended buys are amber. When a
              recommendation lands close to your pantry cluster, it is a small
              practical move; when it lands farther away, it opens a new
              direction.
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#ded8c8] bg-[#fffdf8] p-5 shadow-sm">
          <SectionTitle title="Top buys" />
          {analysis?.recommendations.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {analysis.recommendations.map((recommendation) => (
                <article
                  key={recommendation.ingredient.nodeId}
                  className="rounded-md border border-[#e3ddcf] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">
                      {humanize(recommendation.ingredient.name)}
                    </h3>
                    <span className="rounded-full bg-[#f1eee4] px-2 py-1 text-xs font-medium text-[#596153]">
                      {recommendation.score.toFixed(3)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#6d7568]">
                    {humanize(recommendation.ingredient.primaryCategory)}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-5 text-[#4f584b]">
                    {recommendation.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#6d7568]">
              Recommendations will appear here after analysis.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyState({ hasResults }: { hasResults: boolean }) {
  return (
    <p className="mt-4 text-base leading-7 text-[#6d7568]">
      {hasResults
        ? "No recommendation yet. Try adding a few more everyday ingredients."
        : "Enter a handful of ingredients to get the first useful addition."}
    </p>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-sm font-semibold text-[#6d765f]">{title}</h2>;
}

function AffinityList({
  label,
  items,
}: {
  label: string;
  items?: Array<{ name: string; score: number }>;
}) {
  const visibleItems = items?.slice(0, 3) ?? [];

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c917f]">
        {label}
      </p>
      {visibleItems.length ? (
        <div className="mt-2 space-y-2">
          {visibleItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>{humanize(item.name)}</span>
              <span className="text-[#6d7568]">{Math.round(item.score * 100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#6d7568]">Waiting for pantry input.</p>
      )}
    </div>
  );
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function buildMapPoints(analysis: RecommendResponse | null): PantryMapPoint[] {
  if (!analysis) {
    return [];
  }

  const pantryPoints = analysis.matched
    .filter((item) => item.ingredient.atlas)
    .map((item) => ({
      id: item.ingredient.nodeId,
      name: humanize(item.ingredient.name),
      x: item.ingredient.atlas?.x ?? 0,
      y: item.ingredient.atlas?.y ?? 0,
      kind: "pantry" as const,
    }));
  const recommendationPoints = analysis.recommendations
    .filter((item) => item.ingredient.atlas)
    .slice(0, 6)
    .map((item) => ({
      id: item.ingredient.nodeId,
      name: humanize(item.ingredient.name),
      x: item.ingredient.atlas?.x ?? 0,
      y: item.ingredient.atlas?.y ?? 0,
      kind: "recommendation" as const,
      score: item.score,
    }));

  return [...pantryPoints, ...recommendationPoints];
}
