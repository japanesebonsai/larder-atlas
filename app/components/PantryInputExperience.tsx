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
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#24443f] focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>
      <main id="main" tabIndex={-1} className="relative min-h-screen text-[#21332f]">
        <AtlasAtmosphere />
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <header className="grid gap-4 border-b border-[#9eb7ad]/35 pb-5 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#5f837b]">
                Larder Atlas
              </p>
              <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight text-[#243f37] sm:text-5xl [font-family:var(--font-display)]">
                A quiet map for the next useful ingredient.
              </h1>
            </div>
            <p className="text-sm leading-6 text-[#4f675f]">
              Enter a pantry, choose a direction, and see what the Epicure map
              thinks will unlock the most options.
            </p>
          </header>

          <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
            <motion.form
              layout
              onSubmit={handleSubmit}
              className="h-fit rounded-lg border border-[#9eb7ad]/35 bg-[#fffdf5]/86 p-5 shadow-xl shadow-[#6b8e9b]/12 backdrop-blur-md"
            >
              <label htmlFor="pantry" className="text-sm font-bold text-[#243f37]">
                Pantry ingredients
              </label>
              <textarea
                id="pantry"
                value={pantry}
                onChange={(event) => setPantry(event.target.value)}
                className="mt-3 min-h-36 w-full resize-none rounded-md border border-[#9eb7ad]/45 bg-white/80 p-4 text-base leading-7 text-[#21332f] outline-none transition placeholder:text-[#84958c] focus:border-[#6b8e9b] focus:ring-4 focus:ring-[#6b8e9b]/15"
                placeholder="rice, egg, cabbage, soy sauce"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                {samplePantries.map((sample) => (
                  <motion.button
                    key={sample}
                    type="button"
                    onClick={() => setPantry(sample)}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    className="min-h-10 cursor-pointer rounded-full border border-[#9eb7ad]/35 bg-[#eef4e8] px-3 py-1.5 text-sm text-[#4f675f] transition hover:border-[#6b8e9b] hover:text-[#243f37] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b8e9b]"
                  >
                    {sample}
                  </motion.button>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-sm font-bold text-[#243f37]">Goal</p>
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
                          "relative min-h-10 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b8e9b]",
                          isSelected
                            ? "border-[#6b8e9b] text-white"
                            : "border-[#9eb7ad]/35 bg-white/70 text-[#4f675f] hover:border-[#6b8e9b] hover:text-[#243f37]",
                        ].join(" ")}
                      >
                        {isSelected ? (
                          <motion.span
                            layoutId="selected-goal"
                            className="absolute inset-0 -z-10 rounded-full bg-[#426f67]"
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
                className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-md bg-[#24443f] px-5 text-sm font-bold text-white shadow-lg shadow-[#6b8e9b]/20 transition hover:bg-[#315c53] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b8e9b] disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="mt-4 rounded-md bg-[#f9d8d4] px-3 py-2 text-sm text-[#7a332d]"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.form>

            <div className="grid gap-5">
              <motion.section
                layout
                className="rounded-lg border border-[#9eb7ad]/35 bg-[#fffdf5]/86 p-5 shadow-xl shadow-[#6b8e9b]/12 backdrop-blur-md"
              >
                <SectionLabel>Smartest buy</SectionLabel>
                <AnimatePresence mode="wait">
                  {topRecommendation ? (
                    <motion.div
                      key={topRecommendation.ingredient.nodeId}
                      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                      transition={{ type: "spring", stiffness: 280, damping: 26 }}
                      className="mt-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <h2 className="text-4xl font-semibold text-[#243f37] [font-family:var(--font-display)]">
                          {humanize(topRecommendation.ingredient.name)}
                        </h2>
                        <span className="w-fit rounded-full bg-[#edf0ff] px-3 py-1 text-sm font-bold text-[#535f86]">
                          {topRecommendation.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="mt-3 max-w-3xl text-base leading-7 text-[#4f675f]">
                        {analysis?.explanation}
                      </p>
                    </motion.div>
                  ) : (
                    <p className="mt-3 text-base leading-7 text-[#4f675f]">
                      Enter a few ingredients to get a practical first buy.
                    </p>
                  )}
                </AnimatePresence>
              </motion.section>

              <section className="grid gap-5 xl:grid-cols-2">
                <InfoPanel title="Matched pantry">
                  {matchedNames.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {matchedNames.map((name) => (
                        <motion.span
                          layout
                          key={name}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="rounded-full bg-[#dcebd2] px-3 py-1.5 text-sm font-bold text-[#243f37]"
                        >
                          {name}
                        </motion.span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#4f675f]">Waiting for analysis.</p>
                  )}
                  {analysis?.missing.length ? (
                    <p className="mt-4 text-sm text-[#7a5b30]">
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
              </section>
            </div>
          </section>

          <section className="grid gap-5 rounded-lg border border-[#9eb7ad]/35 bg-[#fffdf5]/78 p-5 shadow-xl shadow-[#6b8e9b]/12 backdrop-blur-md lg:grid-cols-[1fr_220px]">
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

          <section className="rounded-lg border border-[#9eb7ad]/35 bg-[#fffdf5]/86 p-5 shadow-xl shadow-[#6b8e9b]/12 backdrop-blur-md">
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
                      className="rounded-md border border-[#9eb7ad]/25 bg-white/72 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-[#243f37]">
                          {humanize(recommendation.ingredient.name)}
                        </h3>
                        <span className="rounded-full bg-[#edf0ff] px-2 py-1 text-xs font-bold text-[#535f86]">
                          {recommendation.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-[#6b8e9b]">
                        {humanize(recommendation.ingredient.primaryCategory)}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-5 text-[#4f675f]">
                        {recommendation.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <p className="mt-4 text-sm text-[#4f675f]">
                Recommendations will appear here after analysis.
              </p>
            )}
          </section>
        </div>
      </main>
    </LayoutGroup>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b8e9b]">
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
    <article className="rounded-lg border border-[#9eb7ad]/35 bg-[#fffdf5]/86 p-5 shadow-xl shadow-[#6b8e9b]/12 backdrop-blur-md">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function AtlasMetric({ label, value }: { label: string; value: number }) {
  return (
    <motion.div layout className="rounded-md border border-[#9eb7ad]/25 bg-white/65 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b8e9b]">
        {label}
      </p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-3xl font-semibold text-[#243f37] [font-family:var(--font-display)]"
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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8ea889]">
        {label}
      </p>
      {visibleItems.length ? (
        <div className="mt-2 space-y-2">
          {visibleItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 text-sm text-[#4f675f]"
            >
              <span>{humanize(item.name)}</span>
              <span className="font-bold text-[#9a6471]">{Math.round(item.score * 100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#4f675f]">Waiting for analysis.</p>
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
