"use client";

import { useEffect, useState } from "react";
import type { TemplateRecipe } from "@/lib/pantry/recipe-template";

export type SavedRecipe = TemplateRecipe & {
  imageUrl?: string | null;
  source: string;
  createdAt: string;
};

export function SavedRecipeGallery() {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [isConfigured, setIsConfigured] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const cuisineOptions = uniqueOptions(savedRecipes.map((recipe) => recipe.cuisine));
  const typeOptions = uniqueOptions(savedRecipes.map((recipe) => recipe.type));
  const filteredRecipes = savedRecipes.filter((recipe) => {
    const searchText = [
      recipe.title,
      recipe.type,
      recipe.cuisine,
      recipe.nextBuy,
      ...recipe.ingredients,
      ...recipe.instructions,
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = searchText.includes(query.trim().toLowerCase());
    const matchesCuisine = cuisineFilter === "all" || recipe.cuisine === cuisineFilter;
    const matchesType = typeFilter === "all" || recipe.type === typeFilter;

    return matchesQuery && matchesCuisine && matchesType;
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/recipes");
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(
              payload.message ?? payload.error ?? "Unable to load saved recipes.",
            );
          }

          setIsConfigured(Boolean(payload.configured));
          setSavedRecipes(payload.recipes ?? []);
        } catch {
          setIsConfigured(false);
        } finally {
          setIsLoading(false);
        }
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (isLoading) {
    return (
      <p className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-sm text-[var(--app-text-faint)]">
        Loading saved recipes.
      </p>
    );
  }

  if (!savedRecipes.length) {
    return (
      <p className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-sm text-[var(--app-text-faint)]">
        {isConfigured
          ? "Saved recipes will appear here."
          : "Connect Supabase to save and display generated recipes."}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-5 grid gap-3 rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 backdrop-blur-xl lg:grid-cols-[1fr_220px_220px]">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">
            Search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Recipe, ingredient, instruction"
            className="mt-2 min-h-12 w-full rounded-full border border-[var(--app-border)] bg-[var(--app-field)] px-4 text-sm font-semibold text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-text-faint)] focus:border-[var(--app-accent)]"
          />
        </label>

        <FilterSelect
          label="Cuisine"
          value={cuisineFilter}
          options={cuisineOptions}
          onChange={setCuisineFilter}
        />
        <FilterSelect
          label="Type"
          value={typeFilter}
          options={typeOptions}
          onChange={setTypeFilter}
        />
      </div>

      {filteredRecipes.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <article
              key={recipe.id}
              className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 backdrop-blur-xl"
            >
              {recipe.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.imageUrl}
                  alt=""
                  className="mb-5 aspect-[16/9] w-full rounded-[22px] object-cover"
                />
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">
                    {recipe.type} / {recipe.servings} servings / {recipe.time}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold leading-none text-[var(--app-text)]">
                    {recipe.title}
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-[var(--app-accent)] bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-accent-text)]">
                  {recipe.cuisine}
                </span>
              </div>

              <div className="mt-5 grid gap-5">
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
        <p className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-sm text-[var(--app-text-faint)]">
          No saved recipes match the current filters.
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full cursor-pointer rounded-full border border-[var(--app-border)] bg-[var(--app-field)] px-4 text-sm font-semibold text-[var(--app-text)] outline-none transition focus:border-[var(--app-accent)]"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
