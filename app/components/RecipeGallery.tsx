"use client";

import { useEffect, useState } from "react";
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
  const [loadingId, setLoadingId] = useState("");
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setImages(readImageCache());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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

  return (
    <section id="recipes" className="border-b border-[var(--app-border)] py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--app-accent)]">
            Recipe gallery
          </p>
          <h2 className="mt-2 text-4xl font-semibold leading-none text-[var(--app-text)]">
            Template recipes, no AI call.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[var(--app-text-faint)]">
          Drafted from the current pantry and top recommendations. These are
          deterministic recipe templates for V1.
        </p>
      </div>

      {recipes.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {recipes.map((recipe) => (
            <article
              key={recipe.id}
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

              <div className="mt-5 grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">
                    Ingredients
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-5 text-[var(--app-text-muted)]">
                    {recipe.ingredients.map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
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
          ))}
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
