"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AtlasAtmosphere } from "./AtlasAtmosphere";
import { PantryMap, type PantryMapPoint } from "./PantryMap";
import { RecipeGallery } from "./RecipeGallery";

type ThemeMode = "dark" | "light";

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
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);
  const [responseSamples, setResponseSamples] = useState<number[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("dark");
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem("larder-atlas-theme");

      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("larder-atlas-theme", theme);
  }, [theme]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const startedAt = performance.now();
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

      const responseMs = Math.round(performance.now() - startedAt);
      setLastResponseMs(responseMs);
      setResponseSamples((currentSamples) => [...currentSamples.slice(-9), responseMs]);
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

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return (
    <LayoutGroup>
      <main className="relative min-h-screen text-[var(--app-text)]">
        <AtlasAtmosphere theme={theme} />
        <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex min-h-14 items-center justify-between border-b border-[var(--app-border)]">
            <a
              href="#pantry-workbench"
              className="text-sm font-semibold uppercase text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-text)]"
            >
              Larder Atlas
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="cursor-pointer rounded-full border border-[var(--app-border)] px-3 py-1.5 text-sm font-semibold uppercase text-[var(--app-text-muted)] transition hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)] sm:hidden"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <div className="hidden items-center gap-7 text-sm font-semibold uppercase text-[var(--app-text-muted)] sm:flex">
              <a href="#pantry-workbench" className="transition hover:text-[var(--app-text)]">
                Build
              </a>
              <a href="#atlas" className="transition hover:text-[var(--app-text)]">
                Atlas
              </a>
              <a href="#top-pairs" className="transition hover:text-[var(--app-text)]">
                Pairs
              </a>
              <Link href="/recipes" className="transition hover:text-[var(--app-text)]">
                Gallery
              </Link>
              <a href="#about" className="transition hover:text-[var(--app-text)]">
                About
              </a>
              <button
                type="button"
                onClick={toggleTheme}
                className="cursor-pointer rounded-full border border-[var(--app-border)] px-3 py-1.5 text-[var(--app-text-muted)] transition hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
              >
                {theme === "dark" ? "Light" : "Dark"}
              </button>
            </div>
          </header>

          <section className="grid gap-10 border-b border-[var(--app-border)] py-10 lg:min-h-[680px] lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:py-16">
            <div className="max-w-5xl">
              <p className="text-xs font-semibold uppercase text-[var(--app-accent)]">
                Epicure system
              </p>
              <h1 className="mt-6 max-w-5xl text-6xl font-semibold leading-[0.9] text-[var(--app-text)] sm:text-8xl lg:text-9xl">
                Map the next ingredient.
              </h1>
              <div className="mt-8 grid max-w-3xl gap-5 md:grid-cols-[1fr_220px] md:items-end">
                <p className="text-xl leading-8 text-[var(--app-text-muted)] sm:text-2xl">
                  Ingredients in. One useful pair out.
                </p>
                <div className="border-l border-[var(--app-border)] pl-5 text-sm leading-6 text-[var(--app-text-faint)]">
                  Static Epicure data. Fast recommendations. No extra noise.
                </div>
              </div>
            </div>

            <motion.form
              layout
              id="pantry-workbench"
              onSubmit={handleSubmit}
              className="h-fit rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface-strong)] p-4 backdrop-blur-xl sm:p-5"
            >
              <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-4">
                <p className="text-xs font-semibold uppercase text-[var(--app-text-muted)]">
                  Build
                </p>
                <span className="rounded-full border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-semibold uppercase text-[var(--app-accent-text)]">
                  Live
                </span>
              </div>

              <label htmlFor="pantry" className="mt-5 block text-sm font-semibold text-[var(--app-text)]">
                Pantry
              </label>
              <textarea
                id="pantry"
                value={pantry}
                onChange={(event) => setPantry(event.target.value)}
                className="mt-3 min-h-36 w-full resize-none rounded-3xl border border-[var(--app-border)] bg-[var(--app-field)] p-4 text-base leading-7 text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-faint)] focus:border-[var(--app-border-strong)] focus:ring-4 focus:ring-[var(--app-accent-soft)]"
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
                  className="min-h-11 min-w-0 flex-1 rounded-full border border-[var(--app-border)] bg-[var(--app-field)] px-4 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-faint)] focus:border-[var(--app-border-strong)] focus:ring-4 focus:ring-[var(--app-accent-soft)]"
                  placeholder="Look up ingredient"
                />
                <button
                  type="button"
                  onClick={() => addIngredient(ingredientDraft)}
                  className="min-h-11 cursor-pointer rounded-full border border-[var(--app-border)] bg-[var(--app-inverse)] px-4 text-sm font-semibold text-[var(--app-inverse-text)] transition hover:bg-[var(--app-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
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
                      className="absolute left-0 right-20 top-13 z-30 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-popover)] p-1 shadow-2xl shadow-black/40 backdrop-blur-xl"
                    >
                      {ingredientSuggestions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          role="option"
                          aria-selected="false"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => addIngredient(name)}
                          className="block min-h-10 w-full cursor-pointer rounded-[20px] px-3 text-left text-sm font-semibold text-[var(--app-text-muted)] transition hover:bg-[var(--app-chip)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
                        >
                          {humanize(name)}
                        </button>
                      ))}
                      {hiddenSuggestionCount > 0 ? (
                        <p className="px-3 py-2 text-xs font-semibold text-[var(--app-text-faint)]">
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
                    className="min-h-11 cursor-pointer rounded-full border border-[var(--app-border)] bg-[var(--app-chip)] px-3 py-1.5 text-sm font-semibold text-[var(--app-text-muted)] transition hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
                  >
                    {sample}
                  </motion.button>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-[var(--app-text)]">Goal</p>
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
                          "relative min-h-11 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]",
                          isSelected
                            ? "border-[var(--app-border-strong)] text-[var(--app-inverse-text)]"
                            : "border-[var(--app-border)] bg-[var(--app-chip)] text-[var(--app-text-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]",
                        ].join(" ")}
                      >
                        {isSelected ? (
                          <motion.span
                            layoutId="selected-goal"
                            className="absolute inset-0 -z-10 rounded-full bg-[var(--app-inverse)]"
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
                className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--app-inverse)] px-5 text-sm font-semibold uppercase text-[var(--app-inverse-text)] transition hover:bg-[var(--app-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="mt-4 rounded-2xl border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--app-danger-text)]"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.form>
          </section>

          <section className="grid gap-5 border-b border-[var(--app-border)] py-5 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.section
              layout
              className="min-h-[260px] rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-[var(--app-text)] backdrop-blur-xl"
            >
              <SectionLabel inverted>Smartest pair</SectionLabel>
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
                      <h2 className="max-w-3xl text-5xl font-semibold leading-[0.9] text-[var(--app-text)] sm:text-7xl">
                        {humanize(topRecommendation.ingredient.name)}
                      </h2>
                      <span className="w-fit rounded-full border border-[var(--app-border)] bg-[var(--app-inverse)] px-3 py-1 text-sm font-semibold text-[var(--app-inverse-text)]">
                        {topRecommendation.score.toFixed(3)}
                      </span>
                    </div>
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--app-text-muted)]">
                      {analysis?.explanation}
                    </p>
                  </motion.div>
                ) : (
                  <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--app-text-muted)]">
                    Enter a few ingredients to get a practical first pair.
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
                        className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--app-text-muted)]"
                      >
                        {name}
                      </motion.span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--app-text-faint)]">Waiting for analysis.</p>
                )}
                {analysis?.missing.length ? (
                  <p className="mt-4 text-sm font-semibold text-[var(--app-accent-text)]">
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
            className="grid gap-5 border-b border-[var(--app-border)] py-5 lg:grid-cols-[1fr_320px]"
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
              <AppMetrics
                ingredientCount={ingredientNames.length}
                lastResponseMs={lastResponseMs}
                responseSamples={responseSamples}
              />
              <AtlasMetric label="Pantry" value={analysis?.matched.length ?? 0} />
              <AtlasMetric
                label="Suggestions"
                value={analysis?.recommendations.length ?? 0}
              />
              <AtlasMetric label="Mapped" value={mapPoints.length} />
            </div>
          </section>

          <section id="top-pairs" className="py-5">
            <SectionLabel>Top pairs</SectionLabel>
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
                      className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 backdrop-blur-xl"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-[var(--app-text)]">
                          {humanize(recommendation.ingredient.name)}
                        </h3>
                        <span className="rounded-full bg-[var(--app-inverse)] px-2 py-1 text-xs font-semibold text-[var(--app-inverse-text)]">
                          {recommendation.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[var(--app-accent)]">
                        {humanize(recommendation.ingredient.primaryCategory)}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm leading-5 text-[var(--app-text-muted)]">
                        {recommendation.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <p className="mt-4 text-sm text-[var(--app-text-faint)]">
                Recommendations will appear here after analysis.
              </p>
            )}
          </section>

          <RecipeGallery
            pantry={analysis?.matched.map((item) => item.ingredient) ?? []}
            recommendations={analysis?.recommendations ?? []}
          />

          <section id="about" className="border-t border-[var(--app-border)] py-8">
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <article className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 backdrop-blur-xl">
                <SectionLabel>About</SectionLabel>
                <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-none text-[var(--app-text)] sm:text-5xl">
                  Built on Epicure. Tuned for pantry decisions.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--app-text-muted)]">
                  Larder Atlas turns static Epicure ingredient data into a small
                  pantry decision tool. Epicure provides the ingredient embedding
                  space and metadata. Larder Atlas adds a practical recommendation
                  layer that favors useful next pairs over direct substitutes.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--app-text-faint)]">
                  The complementary scoring layer is a Larder Atlas product
                  heuristic. It is not a claim from the Epicure paper.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--app-text-faint)]">
                  The app metrics in the atlas are browser-observed timings for
                  this session. They describe Larder Atlas over bundled data, not
                  benchmark claims from the Epicure paper.
                </p>
              </article>

              <div className="grid gap-5">
                <InfoPanel title="Architecture">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ArchitectureItem
                      title="Next.js app"
                      body="Pantry input, visualizer, metrics, and references."
                    />
                    <ArchitectureItem
                      title="Static Epicure data"
                      body="Bundled ingredients, tags, embeddings, and atlas coordinates."
                    />
                    <ArchitectureItem
                      title="Serverless API"
                      body="Matches pantry text and ranks deterministic recommendations."
                    />
                    <ArchitectureItem
                      title="Client atlas"
                      body="Recursive graph, ingredient list, and selectable nodes."
                    />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--app-text-faint)]">
                    Current recommendations use local scoring and template
                    explanations. There is no live model call during recommendation.
                  </p>
                </InfoPanel>

                <InfoPanel title="References">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReferenceLink
                      href="https://github.com/KAIKAKU-AI/epicure-mcp"
                      label="Epicure MCP"
                      body="Public read-only MCP server for Epicure."
                      imageSrc="/epicure-mcp-logo.png"
                      imageAlt="Epicure MCP logo"
                    />
                    <ReferenceLink
                      href="https://arxiv.org/abs/2605.22391"
                      label="Epicure paper"
                      body="Navigating the emergent geometry of food ingredient embeddings."
                      imageSrc="/epicure-paper-preview.svg"
                      imageAlt="Epicure paper preview"
                    />
                  </div>
                </InfoPanel>
              </div>
            </div>
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
        inverted ? "text-[var(--app-text-muted)]" : "text-[var(--app-accent)]",
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
    <article className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 backdrop-blur-xl">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function ArchitectureItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-field)] p-4">
      <h3 className="text-sm font-semibold text-[var(--app-text)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--app-text-faint)]">{body}</p>
    </div>
  );
}

function ReferenceLink({
  href,
  label,
  body,
  imageSrc,
  imageAlt,
}: {
  href: string;
  label: string;
  body: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-field)] transition hover:border-[var(--app-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={imageAlt ?? ""}
          className="aspect-[16/9] w-full border-b border-[var(--app-border)] object-cover"
        />
      ) : null}
      <span className="block p-4">
        <span className="text-sm font-semibold text-[var(--app-text)]">{label}</span>
        <span className="mt-2 block text-sm leading-6 text-[var(--app-text-faint)]">
          {body}
        </span>
      </span>
    </a>
  );
}

function AtlasMetric({ label, value }: { label: string; value: number }) {
  return (
    <motion.div layout className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase text-[var(--app-accent)]">
        {label}
      </p>
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-4xl font-semibold text-[var(--app-text)]"
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
    <article className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 backdrop-blur-xl sm:col-span-3 lg:col-span-1">
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
            <EmptyListText>No pairs yet.</EmptyListText>
          )}
        </IngredientListGroup>

        {missing.length ? (
          <IngredientListGroup title="Missing">
            <div className="flex flex-wrap gap-2">
              {missing.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--app-border)] px-2.5 py-1 text-xs font-semibold text-[var(--app-text-faint)]"
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

function AppMetrics({
  ingredientCount,
  lastResponseMs,
  responseSamples,
}: {
  ingredientCount: number;
  lastResponseMs: number | null;
  responseSamples: number[];
}) {
  const averageResponseMs =
    responseSamples.length === 0
      ? null
      : Math.round(
          responseSamples.reduce((total, sample) => total + sample, 0) /
            responseSamples.length,
        );
  const fastestResponseMs =
    responseSamples.length === 0 ? null : Math.min(...responseSamples);

  return (
    <article className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 backdrop-blur-xl sm:col-span-3 lg:col-span-1">
      <SectionLabel>App metrics</SectionLabel>
      <div className="mt-4 grid gap-3">
        <MetricRow label="Ingredients" value={ingredientCount.toLocaleString()} />
        <MetricRow label="Model calls" value="0" />
        <MetricRow label="Data mode" value="Static" />
        <MetricRow
          label="Last response"
          value={lastResponseMs === null ? "Not measured" : `${lastResponseMs} ms`}
        />
        <MetricRow
          label="Session avg"
          value={averageResponseMs === null ? "Not measured" : `${averageResponseMs} ms`}
        />
        <MetricRow
          label="Fastest"
          value={fastestResponseMs === null ? "Not measured" : `${fastestResponseMs} ms`}
        />
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--app-text-faint)]">
        These are browser-observed Larder Atlas timings from this session.
      </p>
    </article>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--app-text)]">{value}</span>
    </div>
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
      <p className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">{title}</p>
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
        "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]",
        isSelected
          ? "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-text)]"
          : "border-[var(--app-border)] bg-[var(--app-field)] text-[var(--app-text-muted)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]",
      ].join(" ")}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="shrink-0 text-xs font-semibold text-[var(--app-text-faint)]">{detail}</span>
    </button>
  );
}

function EmptyListText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--app-text-faint)]">{children}</p>;
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
      <p className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">
        {label}
      </p>
      {visibleItems.length ? (
        <div className="mt-2 space-y-2">
          {visibleItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 text-sm text-[var(--app-text-muted)]"
            >
              <span>{humanize(item.name)}</span>
              <span className="font-semibold text-[var(--app-accent)]">{Math.round(item.score * 100)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--app-text-faint)]">Waiting for analysis.</p>
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
      category: humanize(item.ingredient.primaryCategory),
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
      category: humanize(item.ingredient.primaryCategory),
      x: item.ingredient.atlas?.x ?? 0,
      y: item.ingredient.atlas?.y ?? 0,
      kind: "recommendation" as const,
      score: item.score,
    }));

  return [...pantryPoints, ...recommendationPoints];
}
