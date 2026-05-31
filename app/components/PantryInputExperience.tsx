"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();
  const topRecommendation = analysis?.recommendations[0];
  const matchedNames = useMemo(
    () => analysis?.matched.map((item) => humanize(item.ingredient.name)) ?? [],
    [analysis],
  );
  const mapPoints = useMemo(() => buildMapPoints(analysis), [analysis]);

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

  return (
    <LayoutGroup>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#111111] focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>
      <main id="main" tabIndex={-1} className="relative min-h-screen text-[#151515]">
        <AtlasAtmosphere />
        <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8">
          <header className="flex min-h-16 items-center justify-between border-b border-[#151515]/15">
            <a
              href="#pantry-workbench"
              className="text-sm font-bold uppercase text-[#151515] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#151515]"
            >
              Larder Atlas
            </a>
            <div className="hidden items-center gap-6 text-sm font-bold uppercase text-[#151515]/65 sm:flex">
              <a href="#pantry-workbench" className="transition hover:text-[#151515]">
                Workbench
              </a>
              <a href="#atlas" className="transition hover:text-[#151515]">
                Atlas
              </a>
              <a href="#top-buys" className="transition hover:text-[#151515]">
                Buys
              </a>
            </div>
          </header>

          <section className="grid gap-8 border-b border-[#151515]/15 py-8 lg:min-h-[620px] lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-end lg:py-12">
            <div className="max-w-5xl">
              <p className="text-xs font-bold uppercase text-[#d82f86]">
                Larder Atlas
              </p>
              <h1 className="mt-4 max-w-5xl text-6xl font-bold uppercase leading-[0.78] text-[#151515] sm:text-8xl lg:text-9xl [font-family:var(--font-display)]">
                Pantry, mapped.
              </h1>
              <div className="mt-8 grid max-w-4xl gap-5 md:grid-cols-[1fr_260px] md:items-end">
                <p className="text-xl leading-8 text-[#2f2f2f] sm:text-2xl">
                  A compact ingredient workbench for turning what you already
                  have into the next useful buy.
                </p>
                <div className="border-l border-[#151515]/20 pl-5 text-sm leading-6 text-[#4b4b4b]">
                  Epicure data gives the structure. Larder Atlas makes the next
                  move visible.
                </div>
              </div>
            </div>

            <motion.form
              layout
              id="pantry-workbench"
              onSubmit={handleSubmit}
              className="h-fit border border-[#151515]/20 bg-[#fffaf0]/88 p-4 shadow-[10px_10px_0_#151515] backdrop-blur-md sm:p-5"
            >
              <div className="flex items-center justify-between border-b border-[#151515]/15 pb-4">
                <p className="text-xs font-bold uppercase text-[#151515]/65">
                  Workbench
                </p>
                <span className="rounded-full bg-[#151515] px-3 py-1 text-xs font-bold uppercase text-white">
                  Live
                </span>
              </div>

              <label htmlFor="pantry" className="mt-5 block text-sm font-bold text-[#151515]">
                Pantry ingredients
              </label>
              <textarea
                id="pantry"
                value={pantry}
                onChange={(event) => setPantry(event.target.value)}
                className="mt-3 min-h-36 w-full resize-none border border-[#151515]/20 bg-white/78 p-4 text-base leading-7 text-[#151515] outline-none transition placeholder:text-[#777] focus:border-[#151515] focus:ring-4 focus:ring-[#ec4899]/18"
                placeholder="rice, egg, cabbage, soy sauce"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {samplePantries.map((sample) => (
                  <motion.button
                    key={sample}
                    type="button"
                    onClick={() => setPantry(sample)}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    className="min-h-11 cursor-pointer rounded-full border border-[#151515]/18 bg-white/72 px-3 py-1.5 text-sm font-semibold text-[#3f3f3f] transition hover:border-[#151515] hover:text-[#151515] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515]"
                  >
                    {sample}
                  </motion.button>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-sm font-bold text-[#151515]">Goal</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {pantryGoals.map((item) => {
                    const isSelected = item.id === goal;

                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        layout
                        onClick={() => setGoal(item.id)}
                        aria-pressed={isSelected}
                        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                        className={[
                          "relative min-h-11 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#151515]",
                          isSelected
                            ? "border-[#151515] text-white"
                            : "border-[#151515]/18 bg-white/70 text-[#3f3f3f] hover:border-[#151515] hover:text-[#151515]",
                        ].join(" ")}
                      >
                        {isSelected ? (
                          <motion.span
                            layoutId="selected-goal"
                            className="absolute inset-0 -z-10 rounded-full bg-[#151515]"
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          />
                        ) : null}
                        {item.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={reduceMotion || isLoading ? undefined : { scale: 0.98 }}
                className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center bg-[#ec4899] px-5 text-sm font-bold uppercase text-white shadow-[5px_5px_0_#151515] transition hover:bg-[#d82f86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#151515] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Mapping pantry..." : "Analyze pantry"}
              </motion.button>

              <AnimatePresence>
                {error ? (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-4 border border-[#9f1d35]/25 bg-[#ffe1e7] px-3 py-2 text-sm font-semibold text-[#7b1730]"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.form>
          </section>

          <section className="grid gap-5 border-b border-[#151515]/15 py-5 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.section
              layout
              className="min-h-[260px] border border-[#151515]/15 bg-[#151515] p-5 text-white shadow-[8px_8px_0_rgba(236,72,153,0.35)]"
            >
              <SectionLabel inverted>Smartest buy</SectionLabel>
              <AnimatePresence mode="wait">
                {topRecommendation ? (
                  <motion.div
                    key={topRecommendation.ingredient.nodeId}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                    className="mt-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <h2 className="max-w-3xl text-5xl font-bold uppercase leading-[0.9] text-white sm:text-7xl [font-family:var(--font-display)]">
                        {humanize(topRecommendation.ingredient.name)}
                      </h2>
                      <span className="w-fit rounded-full border border-white/25 bg-white px-3 py-1 text-sm font-bold text-[#151515]">
                        {topRecommendation.score.toFixed(3)}
                      </span>
                    </div>
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-white/72">
                      {analysis?.explanation}
                    </p>
                  </motion.div>
                ) : (
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
                    Enter a few ingredients to get a practical first buy.
                  </p>
                )}
              </AnimatePresence>
            </motion.section>

            <div className="grid gap-5">
              <InfoPanel title="Matched pantry">
                {matchedNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {matchedNames.map((name) => (
                      <motion.span
                        layout
                        key={name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-full border border-[#151515]/15 bg-white px-3 py-1.5 text-sm font-bold text-[#151515]"
                      >
                        {name}
                      </motion.span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#5a5a5a]">Waiting for analysis.</p>
                )}
                {analysis?.missing.length ? (
                  <p className="mt-4 text-sm font-semibold text-[#8a4c14]">
                    Not found yet: {analysis.missing.join(", ")}
                  </p>
                ) : null}
              </InfoPanel>

              <InfoPanel title="Pantry shape">
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
              </InfoPanel>
            </div>
          </section>

          <section
            id="atlas"
            className="grid gap-5 border-b border-[#151515]/15 py-5 lg:grid-cols-[1fr_220px]"
          >
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

          <section id="top-buys" className="py-5">
            <SectionLabel>Top buys</SectionLabel>
            {analysis?.recommendations.length ? (
              <motion.div layout className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {analysis.recommendations.map((recommendation, index) => (
                    <motion.article
                      key={recommendation.ingredient.nodeId}
                      layout
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                        delay: index * 0.025,
                      }}
                      className="border border-[#151515]/15 bg-[#fffaf0]/84 p-4 shadow-[4px_4px_0_rgba(21,21,21,0.12)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-[#151515]">
                          {humanize(recommendation.ingredient.name)}
                        </h3>
                        <span className="rounded-full bg-[#151515] px-2 py-1 text-xs font-bold text-white">
                          {recommendation.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-[#d82f86]">
                        {humanize(recommendation.ingredient.primaryCategory)}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-5 text-[#4b4b4b]">
                        {recommendation.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <p className="mt-4 text-sm text-[#5a5a5a]">
                Recommendations will appear here after analysis.
              </p>
            )}
          </section>
        </div>
      </main>
    </LayoutGroup>
  );
}

function SectionLabel({
  children,
  inverted = false,
}: {
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <p
      className={[
        "text-xs font-bold uppercase",
        inverted ? "text-white/60" : "text-[#d82f86]",
      ].join(" ")}
    >
      {children}
    </p>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="border border-[#151515]/15 bg-[#fffaf0]/82 p-5 shadow-[5px_5px_0_rgba(21,21,21,0.1)] backdrop-blur-md">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function AtlasMetric({ label, value }: { label: string; value: number }) {
  return (
    <motion.div layout className="border border-[#151515]/15 bg-[#fffaf0]/84 p-4 shadow-[4px_4px_0_rgba(21,21,21,0.1)]">
      <p className="text-xs font-bold uppercase text-[#d82f86]">
        {label}
      </p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-4xl font-bold text-[#151515] [font-family:var(--font-display)]"
      >
        {value}
      </motion.p>
    </motion.div>
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
    <div className="mt-4 first:mt-0">
      <p className="text-xs font-bold uppercase text-[#151515]/52">
        {label}
      </p>
      {visibleItems.length ? (
        <div className="mt-2 space-y-2">
          {visibleItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 text-sm text-[#4b4b4b]"
            >
              <span>{humanize(item.name)}</span>
              <span className="font-bold text-[#d82f86]">{Math.round(item.score * 100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#5a5a5a]">Waiting for analysis.</p>
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
