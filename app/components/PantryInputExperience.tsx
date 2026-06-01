"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

export function PantryInputExperience({ ingredientNames }: { ingredientNames: string[] }) {
  const [pantry, setPantry] = useState(samplePantries[0]);
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [goal, setGoal] = useState<PantryGoal>("more_meals");
  const [analysis, setAnalysis] = useState<RecommendResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const reduceMotion = useReducedMotion();
  const shouldAnimate = isMounted && !reduceMotion;
  const topRecommendation = analysis?.recommendations[0];
  const matchedNames = useMemo(
    () => analysis?.matched.map((item) => humanize(item.ingredient.name)) ?? [],
    [analysis],
  );
  const mapPoints = useMemo(() => buildMapPoints(analysis), [analysis]);
  const ingredientSuggestions = useMemo(() => {
    const query = ingredientDraft.trim().toLowerCase();

    if (query.length < 1) {
      return [];
    }

    return ingredientNames
      .filter((name) => name.toLowerCase().startsWith(query))
      .slice(0, 6);
  }, [ingredientDraft, ingredientNames]);
  const hiddenSuggestionCount = useMemo(() => {
    const query = ingredientDraft.trim().toLowerCase();

    if (query.length < 1) {
      return 0;
    }

    return Math.max(
      0,
      ingredientNames.filter((name) => name.toLowerCase().startsWith(query)).length -
        ingredientSuggestions.length,
    );
  }, [ingredientDraft, ingredientNames, ingredientSuggestions.length]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsMounted(true), 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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
      setSelectedPointId("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function addIngredient(value: string) {
    const nextIngredient = value.trim();

    if (!nextIngredient) {
      return;
    }

    setPantry((currentPantry) => {
      const currentItems = currentPantry
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const hasIngredient = currentItems.some(
        (item) => item.toLowerCase() === nextIngredient.toLowerCase(),
      );

      if (hasIngredient) {
        return currentPantry;
      }

      return [...currentItems, nextIngredient].join(", ");
    });
    setIngredientDraft("");
    setIsLookupOpen(false);
  }

  return (
    <LayoutGroup>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-[#050505]"
      >
        Skip to main content
      </a>
      <main id="main" tabIndex={-1} className="relative min-h-screen text-white">
        <AtlasAtmosphere />
        <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex min-h-14 items-center justify-between border-b border-white/10">
            <a
              href="#pantry-workbench"
              className="text-sm font-semibold uppercase text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Larder Atlas
            </a>
            <div className="hidden items-center gap-7 text-sm font-semibold uppercase text-white/52 sm:flex">
              <a href="#pantry-workbench" className="transition hover:text-white">
                Build
              </a>
              <a href="#atlas" className="transition hover:text-white">
                Atlas
              </a>
              <a href="#top-buys" className="transition hover:text-white">
                Buys
              </a>
            </div>
          </header>

          <section className="grid gap-10 border-b border-white/10 py-10 lg:min-h-[680px] lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:py-16">
            <div className="max-w-5xl">
              <p className="text-xs font-semibold uppercase text-[#ff1fd6]">
                Epicure system
              </p>
              <h1 className="mt-6 max-w-5xl text-6xl font-semibold leading-[0.9] text-white sm:text-8xl lg:text-9xl">
                Map the next ingredient.
              </h1>
              <div className="mt-8 grid max-w-3xl gap-5 md:grid-cols-[1fr_220px] md:items-end">
                <p className="text-xl leading-8 text-white/68 sm:text-2xl">
                  Ingredients in. One useful buy out.
                </p>
                <div className="border-l border-white/12 pl-5 text-sm leading-6 text-white/46">
                  Static Epicure data. Fast recommendations. No extra noise.
                </div>
              </div>
            </div>

            <motion.form
              layout
              id="pantry-workbench"
              onSubmit={handleSubmit}
              className="h-fit rounded-[28px] border border-white/12 bg-white/[0.06] p-4 backdrop-blur-xl sm:p-5"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="text-xs font-semibold uppercase text-white/52">
                  Build
                </p>
                <span className="rounded-full border border-[#ff1fd6]/40 bg-[#ff1fd6]/12 px-3 py-1 text-xs font-semibold uppercase text-[#ffe0fb]">
                  Live
                </span>
              </div>

              <label htmlFor="pantry" className="mt-5 block text-sm font-semibold text-white">
                Pantry
              </label>
              <textarea
                id="pantry"
                value={pantry}
                onChange={(event) => setPantry(event.target.value)}
                className="mt-3 min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-4 text-base leading-7 text-white outline-none transition placeholder:text-white/34 focus:border-white/34 focus:ring-4 focus:ring-[#ff1fd6]/18"
                placeholder="rice, egg, cabbage, soy sauce"
              />

              <div className="relative mt-3 flex gap-2">
                <label htmlFor="ingredient-lookup" className="sr-only">
                  Add ingredient
                </label>
                <input
                  id="ingredient-lookup"
                  value={ingredientDraft}
                  role="combobox"
                  aria-expanded={isLookupOpen && ingredientSuggestions.length > 0}
                  aria-controls="ingredient-suggestions"
                  autoComplete="off"
                  onChange={(event) => {
                    setIngredientDraft(event.target.value);
                    setIsLookupOpen(true);
                  }}
                  onFocus={() => setIsLookupOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addIngredient(ingredientSuggestions[0] ?? ingredientDraft);
                    }

                    if (event.key === "Escape") {
                      setIsLookupOpen(false);
                    }
                  }}
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition placeholder:text-white/34 focus:border-white/34 focus:ring-4 focus:ring-[#ff1fd6]/18"
                  placeholder="Look up ingredient"
                />
                <button
                  type="button"
                  onClick={() => addIngredient(ingredientDraft)}
                  className="min-h-11 cursor-pointer rounded-full border border-white/12 bg-white px-4 text-sm font-semibold text-[#050505] transition hover:bg-[#ffe0fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Add
                </button>
                <AnimatePresence>
                  {isLookupOpen && ingredientSuggestions.length > 0 ? (
                    <motion.div
                      id="ingredient-suggestions"
                      role="listbox"
                      initial={shouldAnimate ? { opacity: 0, y: -4 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldAnimate ? { opacity: 0, y: -4 } : undefined}
                      className="absolute left-0 right-20 top-13 z-30 overflow-hidden rounded-3xl border border-white/10 bg-[#101014]/96 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl"
                    >
                      {ingredientSuggestions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => addIngredient(name)}
                          className="block min-h-10 w-full cursor-pointer rounded-[20px] px-3 text-left text-sm font-semibold text-white/72 transition hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          {humanize(name)}
                        </button>
                      ))}
                      {hiddenSuggestionCount > 0 ? (
                        <p className="px-3 py-2 text-xs font-semibold text-white/38">
                          {hiddenSuggestionCount} more matches
                        </p>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {samplePantries.map((sample) => (
                  <motion.button
                    key={sample}
                    type="button"
                    onClick={() => setPantry(sample)}
                    whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
                    className="min-h-11 cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-white/58 transition hover:border-white/24 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {sample}
                  </motion.button>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-white">Goal</p>
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
                        whileTap={shouldAnimate ? { scale: 0.97 } : undefined}
                        className={[
                          "relative min-h-11 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                          isSelected
                            ? "border-white/24 text-[#050505]"
                            : "border-white/10 bg-white/[0.04] text-white/58 hover:border-white/24 hover:text-white",
                        ].join(" ")}
                      >
                        {isSelected ? (
                          <motion.span
                            layoutId="selected-goal"
                            className="absolute inset-0 -z-10 rounded-full bg-white"
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
                whileTap={shouldAnimate && !isLoading ? { scale: 0.98 } : undefined}
                className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-white px-5 text-sm font-semibold uppercase text-[#050505] transition hover:bg-[#ffe0fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="mt-4 rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/12 px-3 py-2 text-sm font-semibold text-[#fecdd3]"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.form>
          </section>

          <section className="grid gap-5 border-b border-white/10 py-5 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.section
              layout
              className="min-h-[260px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 text-white backdrop-blur-xl"
            >
              <SectionLabel inverted>Smartest buy</SectionLabel>
              <AnimatePresence mode="wait">
                {topRecommendation ? (
                  <motion.div
                    key={topRecommendation.ingredient.nodeId}
                      initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldAnimate ? { opacity: 0, y: -8 } : undefined}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                    className="mt-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <h2 className="max-w-3xl text-5xl font-semibold leading-[0.9] text-white sm:text-7xl">
                        {humanize(topRecommendation.ingredient.name)}
                      </h2>
                      <span className="w-fit rounded-full border border-white/16 bg-white px-3 py-1 text-sm font-semibold text-[#050505]">
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
                        className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-semibold text-white/72"
                      >
                        {name}
                      </motion.span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/48">Waiting for analysis.</p>
                )}
                {analysis?.missing.length ? (
                  <p className="mt-4 text-sm font-semibold text-[#f0d8ff]">
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
            className="grid gap-5 border-b border-white/10 py-5 lg:grid-cols-[1fr_320px]"
          >
            <PantryMap
              points={mapPoints}
              selectedPointId={selectedPointId}
              onSelectPoint={setSelectedPointId}
            />
            <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <IngredientList
                analysis={analysis}
                selectedPointId={selectedPointId}
                onSelectPoint={setSelectedPointId}
              />
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
                      initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldAnimate ? { opacity: 0, y: -8 } : undefined}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 28,
                        delay: index * 0.025,
                      }}
                      className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-white">
                          {humanize(recommendation.ingredient.name)}
                        </h3>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#050505]">
                          {recommendation.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#ff1fd6]">
                        {humanize(recommendation.ingredient.primaryCategory)}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-5 text-white/56">
                        {recommendation.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <p className="mt-4 text-sm text-white/48">
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
        "text-xs font-semibold uppercase",
        inverted ? "text-white/58" : "text-[#ff1fd6]",
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
    <article className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function AtlasMetric({ label, value }: { label: string; value: number }) {
  return (
    <motion.div layout className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase text-[#ff1fd6]">
        {label}
      </p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-4xl font-semibold text-white"
      >
        {value}
      </motion.p>
    </motion.div>
  );
}

function IngredientList({
  analysis,
  selectedPointId,
  onSelectPoint,
}: {
  analysis: RecommendResponse | null;
  selectedPointId: string;
  onSelectPoint: (id: string) => void;
}) {
  const matched = analysis?.matched ?? [];
  const recommendations = analysis?.recommendations ?? [];
  const missing = analysis?.missing ?? [];

  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl sm:col-span-3 lg:col-span-1">
      <SectionLabel>Ingredients</SectionLabel>
      <div className="mt-4 space-y-5">
        <IngredientListGroup title="Matched">
          {matched.length ? (
            matched.map((item) => {
              const id = pointKey("pantry", item.ingredient.nodeId);

              return (
                <IngredientListButton
                  key={id}
                  isSelected={selectedPointId === id}
                  label={humanize(item.ingredient.name)}
                  detail={humanize(item.ingredient.primaryCategory)}
                  onClick={() => onSelectPoint(id)}
                />
              );
            })
          ) : (
            <EmptyListText>Waiting for analysis.</EmptyListText>
          )}
        </IngredientListGroup>

        <IngredientListGroup title="Recommended">
          {recommendations.length ? (
            recommendations.slice(0, 6).map((item) => {
              const id = pointKey("recommendation", item.ingredient.nodeId);

              return (
                <IngredientListButton
                  key={id}
                  isSelected={selectedPointId === id}
                  label={humanize(item.ingredient.name)}
                  detail={item.score.toFixed(3)}
                  onClick={() => onSelectPoint(id)}
                />
              );
            })
          ) : (
            <EmptyListText>No buys yet.</EmptyListText>
          )}
        </IngredientListGroup>

        {missing.length ? (
          <IngredientListGroup title="Missing">
            <div className="flex flex-wrap gap-2">
              {missing.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/46"
                >
                  {item}
                </span>
              ))}
            </div>
          </IngredientListGroup>
        ) : null}
      </div>
    </article>
  );
}

function IngredientListGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase text-white/38">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function IngredientListButton({
  label,
  detail,
  isSelected,
  onClick,
}: {
  label: string;
  detail: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        isSelected
          ? "border-[#ff1fd6]/55 bg-[#ff1fd6]/16 text-white"
          : "border-white/8 bg-black/20 text-white/68 hover:border-white/18 hover:text-white",
      ].join(" ")}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="shrink-0 text-xs font-semibold text-white/42">{detail}</span>
    </button>
  );
}

function EmptyListText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-white/42">{children}</p>;
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
      <p className="text-xs font-semibold uppercase text-white/42">
        {label}
      </p>
      {visibleItems.length ? (
        <div className="mt-2 space-y-2">
          {visibleItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 text-sm text-white/58"
            >
              <span>{humanize(item.name)}</span>
              <span className="font-semibold text-[#ff1fd6]">{Math.round(item.score * 100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/48">Waiting for analysis.</p>
      )}
    </div>
  );
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function pointKey(kind: "pantry" | "recommendation", id: number) {
  return `${kind}-${id}`;
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
