"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  buildTemplateRecipes,
  type TemplateRecipe,
  type RecipeIngredient,
} from "@/lib/pantry/recipe-template";

type RecipeGalleryProps = {
  pantry: RecipeIngredient[];
  recommendations: Array<{
    ingredient: RecipeIngredient;
    score: number;
  }>;
};

const imageCacheKey = "larder-atlas-recipe-images";
const maxCachedImages = 6;

export function RecipeGallery({ pantry, recommendations }: RecipeGalleryProps) {
  const recipes = buildTemplateRecipes({ pantry, recommendations });
  const [images, setImages] = useState<Record<string, string>>({});
  const [polishedRecipes, setPolishedRecipes] = useState<Record<string, TemplateRecipe>>({});
  const [savedRecipeKeys, setSavedRecipeKeys] = useState<Set<string>>(new Set());
  const [isRecipeStorageConfigured, setIsRecipeStorageConfigured] = useState(true);
  const [loadingId, setLoadingId] = useState("");
  const [polishingId, setPolishingId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setImages(readImageCache());
      void loadSavedRecipes();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function loadSavedRecipes() {
    try {
      const response = await fetch("/api/recipes");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? payload.error ?? "Unable to load saved recipes.");
      }

      setIsRecipeStorageConfigured(Boolean(payload.configured));
      setSavedRecipeKeys(
        new Set(
          (payload.recipes ?? []).map((recipe: TemplateRecipe) =>
            recipeKey(recipe.title, recipe.nextBuy),
          ),
        ),
      );
    } catch {
      setIsRecipeStorageConfigured(false);
    }
  }

  async function generateImage(recipe: TemplateRecipe) {
    setLoadingId(recipe.id);
    setErrorById((current) => ({ ...current, [recipe.id]: "" }));

    try {
      const response = await fetch("/api/recipe-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: recipe.title,
          ingredients: recipe.ingredients,
          cuisine: recipe.cuisine,
          type: recipe.type,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.image) {
        throw new Error(payload.message ?? payload.error ?? "Image generation failed.");
      }

      setImages((current) => {
        const nextImages = trimImageCache({
          ...current,
          [recipe.id]: payload.image,
        });

        writeImageCache(nextImages);

        return nextImages;
      });
    } catch (caught) {
      setErrorById((current) => ({
        ...current,
        [recipe.id]: caught instanceof Error ? caught.message : "Image generation failed.",
      }));
    } finally {
      setLoadingId("");
    }
  }

  async function saveRecipe(recipe: TemplateRecipe) {
    setSavingId(recipe.id);
    setErrorById((current) => ({ ...current, [recipe.id]: "" }));
    const isPolished = Boolean(polishedRecipes[recipe.id]);

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...recipe,
          imageUrl: images[recipe.id],
          source: isPolished ? "cloudflare-kimi" : "template",
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.recipe) {
        throw new Error(payload.message ?? payload.error ?? "Recipe save failed.");
      }

      setIsRecipeStorageConfigured(true);
      setSavedRecipeKeys((current) => {
        const nextKeys = new Set(current);
        nextKeys.add(recipeKey(recipe.title, recipe.nextBuy));

        return nextKeys;
      });
    } catch (caught) {
      setErrorById((current) => ({
        ...current,
        [recipe.id]: caught instanceof Error ? caught.message : "Recipe save failed.",
      }));
    } finally {
      setSavingId("");
    }
  }

  async function polishRecipe(recipe: TemplateRecipe) {
    setPolishingId(recipe.id);
    setErrorById((current) => ({ ...current, [recipe.id]: "" }));

    try {
      const response = await fetch("/api/recipe-polish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recipe),
      });
      const payload = await response.json();

      if (!response.ok || !payload.recipe) {
        throw new Error(payload.message ?? payload.error ?? "Recipe polish failed.");
      }

      setPolishedRecipes((current) => ({
        ...current,
        [recipe.id]: {
          ...recipe,
          ...payload.recipe,
          id: recipe.id,
          type: recipe.type,
          cuisine: recipe.cuisine,
          servings: recipe.servings,
          time: recipe.time,
          pantryUsed: recipe.pantryUsed,
          nextBuy: recipe.nextBuy,
          tags: [...recipe.tags, "Kimi polish"].filter(
            (tag, index, tags) => tags.indexOf(tag) === index,
          ),
        },
      }));
    } catch (caught) {
      setErrorById((current) => ({
        ...current,
        [recipe.id]: caught instanceof Error ? caught.message : "Recipe polish failed.",
      }));
    } finally {
      setPolishingId("");
    }
  }

  return (
    <section id="recipes" className="border-b border-[var(--app-border)] py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--app-accent)]">
            Recipe gallery
          </p>
          <h2 className="mt-2 text-4xl font-semibold leading-none text-[var(--app-text)]">
            Template recipes, optional Kimi polish.
          </h2>
        </div>
        <div className="flex max-w-sm flex-col items-start gap-3">
          <p className="text-sm leading-6 text-[var(--app-text-faint)]">
            Drafted from the current pantry and top recommendations. These are
            deterministic recipes enriched with Epicure tags, with optional
            Cloudflare Kimi rewriting.
          </p>
          <Link
            href="/recipes"
            className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
          >
            View global gallery
          </Link>
        </div>
      </div>

      {recipes.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {recipes.map((templateRecipe) => {
            const recipe = polishedRecipes[templateRecipe.id] ?? templateRecipe;
            const isPolished = Boolean(polishedRecipes[templateRecipe.id]);

            return (
            <article
              key={templateRecipe.id}
              className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 backdrop-blur-xl"
            >
              <div className="mb-5 overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-field)]">
                {images[recipe.id] ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={images[recipe.id]}
                      alt=""
                      className="aspect-[16/9] w-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase text-white backdrop-blur">
                      Cached image
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] flex-col items-center justify-center gap-3 px-5 text-center">
                    <p className="max-w-xs text-sm leading-6 text-[var(--app-text-faint)]">
                      Optional AI image generation can create a visual for this
                      recipe when Cloudflare Workers AI is configured.
                    </p>
                    <button
                      type="button"
                      onClick={() => generateImage(recipe)}
                      disabled={loadingId === recipe.id}
                      className="min-h-10 cursor-pointer rounded-full border border-[var(--app-border)] bg-[var(--app-inverse)] px-4 text-sm font-semibold text-[var(--app-inverse-text)] transition hover:bg-[var(--app-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingId === recipe.id ? "Generating..." : "Generate image"}
                    </button>
                    {errorById[recipe.id] ? (
                      <p className="text-xs leading-5 text-[var(--app-danger-text)]">
                        {errorById[recipe.id]}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">
                    {recipe.type} / {recipe.servings} servings / {recipe.time}
                  </p>
                  <h3 className="mt-2 text-3xl font-semibold leading-none text-[var(--app-text)]">
                    {recipe.title}
                  </h3>
                </div>
                <span className="w-fit rounded-full border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-accent-text)]">
                  {recipe.cuisine}
                </span>
              </div>
              <TagList tags={recipe.tags} />
              <p className="mt-4 rounded-[20px] border border-[var(--app-border)] bg-[var(--app-field)] p-3 text-sm leading-6 text-[var(--app-text-muted)]">
                {recipe.rationale}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveRecipe(recipe)}
                  disabled={
                    savingId === recipe.id ||
                    savedRecipeKeys.has(recipeKey(recipe.title, recipe.nextBuy))
                  }
                  className="min-h-10 cursor-pointer rounded-full border border-[var(--app-border)] bg-[var(--app-inverse)] px-4 text-sm font-semibold text-[var(--app-inverse-text)] transition hover:bg-[var(--app-accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savedRecipeKeys.has(recipeKey(recipe.title, recipe.nextBuy))
                    ? "Saved"
                    : savingId === recipe.id
                      ? "Saving..."
                      : "Save recipe"}
                </button>
                {!isRecipeStorageConfigured ? (
                  <span className="text-xs font-semibold text-[var(--app-text-faint)]">
                    Database not configured
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => polishRecipe(recipe)}
                  disabled={polishingId === recipe.id}
                  className="min-h-10 cursor-pointer rounded-full border border-[var(--app-border)] px-4 text-sm font-semibold text-[var(--app-text-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {polishingId === recipe.id
                    ? "Polishing..."
                    : isPolished
                      ? "Polish again"
                      : "Polish with Kimi"}
                </button>
                {isPolished ? (
                  <span className="text-xs font-semibold text-[var(--app-text-faint)]">
                    Cloudflare Kimi draft
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">
                    Ingredients
                  </p>
                  <GroupedIngredients
                    ingredients={recipe.ingredients}
                    pantryCount={recipe.pantryUsed.length}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">
                    Instructions
                  </p>
                  <ol className="mt-3 space-y-2 text-sm leading-5 text-[var(--app-text-muted)]">
                    {recipe.instructions.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-sm text-[var(--app-text-faint)]">
          Run a pantry analysis to generate template recipes.
        </p>
      )}

    </section>
  );
}

function readImageCache() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedImages = window.localStorage.getItem(imageCacheKey);

    if (!storedImages) {
      return {};
    }

    const parsedImages = JSON.parse(storedImages);

    if (!parsedImages || typeof parsedImages !== "object") {
      return {};
    }

    return parsedImages as Record<string, string>;
  } catch {
    return {};
  }
}

function writeImageCache(images: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(imageCacheKey, JSON.stringify(trimImageCache(images)));
  } catch {
    window.localStorage.removeItem(imageCacheKey);
  }
}

function trimImageCache(images: Record<string, string>) {
  return Object.fromEntries(Object.entries(images).slice(-maxCachedImages));
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-[var(--app-border)] bg-[var(--app-field)] px-3 py-1 text-xs font-semibold text-[var(--app-text-muted)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function GroupedIngredients({
  ingredients,
  pantryCount,
}: {
  ingredients: string[];
  pantryCount: number;
}) {
  const sections = [
    { title: "Pair", items: ingredients.slice(0, 1) },
    { title: "Pantry base", items: ingredients.slice(1, 1 + pantryCount) },
    { title: "Finish", items: ingredients.slice(1 + pantryCount) },
  ].filter((section) => section.items.length);

  return (
    <div className="mt-3 space-y-4 text-sm leading-5 text-[var(--app-text-muted)]">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[11px] font-semibold uppercase text-[var(--app-text-faint)]">
            {section.title}
          </p>
          <ul className="mt-2 space-y-2">
            {section.items.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function recipeKey(title: string, nextBuy: string) {
  return `${title}:${nextBuy}`;
}
