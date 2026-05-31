"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useMemo, useState } from "react";
import { AtlasAtmosphere } from "./AtlasAtmosphere";
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
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#31483c] focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-[#fff9e9]"
      >
        Skip to main content
      </a>
    <main id="main" tabIndex={-1} className="relative min-h-screen text-[#27342e]">
      <AtlasAtmosphere />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-3 border-b border-[#6b8e9b]/25 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6b8e9b]">
              Larder Atlas
            </p>
            <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight text-[#31483c] sm:text-6xl [font-family:var(--font-display)]">
              Map what is on hand. Find what unlocks dinner.
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[#496359]">
            A soft atlas for turning what you already have into the next useful
            ingredient.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-lg border border-[#6b8e9b]/25 bg-[#fff9e9]/78 p-5 shadow-2xl shadow-[#6b8e9b]/20 backdrop-blur-xl"
          >
            <div>
              <label
                htmlFor="pantry"
                className="text-sm font-bold text-[#31483c]"
              >
                What is in your kitchen?
              </label>
              <textarea
                id="pantry"
                value={pantry}
                onChange={(event) => setPantry(event.target.value)}
                className="mt-3 min-h-36 w-full resize-none rounded-md border border-[#8ea889]/40 bg-[#fffdf5]/80 p-4 text-base leading-7 text-[#27342e] outline-none transition placeholder:text-[#8a9a8c] focus:border-[#b9a8d3] focus:ring-4 focus:ring-[#b9a8d3]/20"
                placeholder="rice, egg, cabbage, soy sauce"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {samplePantries.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setPantry(sample)}
                  className="cursor-pointer rounded-full border border-[#6b8e9b]/25 bg-[#e9f0df]/70 px-3 py-1.5 text-sm text-[#496359] transition hover:border-[#b9a8d3] hover:text-[#31483c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b8e9b]"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div>
              <p className="text-sm font-bold text-[#31483c]">Goal</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pantryGoals.map((item) => {
                  const isSelected = item.id === goal;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id)}
                      aria-pressed={isSelected}
                      className={[
                        "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b8e9b]",
                        isSelected
                          ? "border-[#b9a8d3] bg-[#b9a8d3] text-[#252033]"
                          : "border-[#6b8e9b]/25 bg-[#fffdf5]/65 text-[#496359] hover:border-[#b9a8d3] hover:text-[#31483c]",
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
              className="inline-flex h-12 cursor-pointer items-center justify-center rounded-md border border-[#31483c]/20 bg-[#31483c] px-5 text-sm font-bold text-[#fff9e9] shadow-lg shadow-[#6b8e9b]/20 transition hover:bg-[#496359] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b8e9b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Mapping pantry..." : "Analyze pantry"}
            </button>

            {error ? (
              <p className="rounded-md bg-[#f9d8d4] px-3 py-2 text-sm text-[#7a332d]">
                {error}
              </p>
            ) : null}
          </form>

          <section className="grid gap-5">
            <article className="rounded-lg border border-[#6b8e9b]/25 bg-[#fff9e9]/78 p-5 shadow-2xl shadow-[#6b8e9b]/20 backdrop-blur-xl">
              <p className="text-sm font-bold text-[#6b8e9b]">
                Smartest buy
              </p>
              {topRecommendation ? (
                <div className="mt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="text-4xl font-semibold tracking-tight text-[#31483c] [font-family:var(--font-display)]">
                      {humanize(topRecommendation.ingredient.name)}
                    </h2>
                    <span className="w-fit rounded-full bg-[#e9d7ef] px-3 py-1 text-sm font-bold text-[#5a4f75]">
                      score {topRecommendation.score.toFixed(3)}
                    </span>
                  </div>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-[#496359]">
                    {analysis?.explanation}
                  </p>
                </div>
              ) : (
                <EmptyState hasResults={hasResults} />
              )}
            </article>

            <div className="grid gap-5 xl:grid-cols-2">
              <article className="rounded-lg border border-[#6b8e9b]/25 bg-[#fff9e9]/78 p-5 shadow-2xl shadow-[#6b8e9b]/20 backdrop-blur-xl">
                <SectionTitle title="Matched pantry" />
                {matchedNames.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {matchedNames.map((name) => (
                      <span
                        key={name}
                        className="rounded-full bg-[#dcebd2] px-3 py-1.5 text-sm font-bold text-[#31483c]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#496359]">
                    Add ingredients and run the analysis.
                  </p>
                )}
                {analysis?.missing.length ? (
                  <p className="mt-4 text-sm text-[#7a5b30]">
                    Not found yet: {analysis.missing.join(", ")}
                  </p>
                ) : null}
              </article>

              <article className="rounded-lg border border-[#6b8e9b]/25 bg-[#fff9e9]/78 p-5 shadow-2xl shadow-[#6b8e9b]/20 backdrop-blur-xl">
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

        <section className="grid gap-5 rounded-lg border border-[#6b8e9b]/25 bg-[#fff9e9]/72 p-5 shadow-2xl shadow-[#6b8e9b]/20 backdrop-blur-xl lg:grid-cols-[1.35fr_0.65fr]">
          <PantryMap points={mapPoints} />
          <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <AtlasMetric label="Pantry" value={analysis?.matched.length ?? 0} />
            <AtlasMetric
              label="Suggestions"
              value={analysis?.recommendations.length ?? 0}
            />
            <AtlasMetric label="Mapped" value={mapPoints.length} />
          </div>
        </section>

        <section className="rounded-lg border border-[#6b8e9b]/25 bg-[#fff9e9]/78 p-5 shadow-2xl shadow-[#6b8e9b]/20 backdrop-blur-xl">
          <SectionTitle title="Top buys" />
          {analysis?.recommendations.length ? (
            <motion.div layout className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {analysis.recommendations.map((recommendation, index) => (
                <motion.article
                  key={recommendation.ingredient.nodeId}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 28,
                    delay: index * 0.03,
                  }}
                  className="rounded-md border border-[#6b8e9b]/20 bg-[#fffdf5]/72 p-4 shadow-lg shadow-[#6b8e9b]/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">
                      {humanize(recommendation.ingredient.name)}
                    </h3>
                    <span className="rounded-full bg-[#f4edf8] px-2 py-1 text-xs font-bold text-[#5a4f75]">
                      {recommendation.score.toFixed(3)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#6b8e9b]">
                    {humanize(recommendation.ingredient.primaryCategory)}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-5 text-[#496359]">
                    {recommendation.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <p className="mt-4 text-sm text-[#496359]">
              Recommendations will appear here after analysis.
            </p>
          )}
        </section>
      </div>
    </main>
    </>
  );
}

function EmptyState({ hasResults }: { hasResults: boolean }) {
  return (
    <p className="mt-4 text-base leading-7 text-[#496359]">
      {hasResults
        ? "No recommendation yet. Try adding a few more everyday ingredients."
        : "Enter a handful of ingredients to get the first useful addition."}
    </p>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-sm font-bold text-[#6b8e9b]">{title}</h2>;
}

function AtlasMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#b9a8d3]/30 bg-[#f4edf8]/65 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8f7899]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-[#31483c] [font-family:var(--font-display)]">
        {value}
      </p>
    </div>
  );
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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8ea889]">
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
              <span className="font-bold text-[#b07885]">{Math.round(item.score * 100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#496359]">Waiting for pantry input.</p>
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
