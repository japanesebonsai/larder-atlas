"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AtlasAtmosphere } from "./AtlasAtmosphere";
import { SavedRecipeGallery } from "./SavedRecipeGallery";

type ThemeMode = "dark" | "light";

export function RecipesPageExperience() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

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

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 text-[var(--app-text)] sm:px-6 lg:px-8">
      <AtlasAtmosphere theme={theme} />
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="flex min-h-16 items-center justify-between border-b border-[var(--app-border)]">
          <Link href="/" className="text-sm font-semibold uppercase text-[var(--app-text)]">
            Larder Atlas
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-sm font-semibold uppercase text-[var(--app-text-muted)] transition hover:text-[var(--app-text)] sm:inline"
            >
              Main
            </Link>
            <Link
              href="/#recipes"
              className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--app-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
            >
              Generate recipes
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="cursor-pointer rounded-full border border-[var(--app-border)] px-3 py-2 text-sm font-semibold uppercase text-[var(--app-text-muted)] transition hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </nav>
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase text-[var(--app-accent)]">
            Global recipe gallery
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
            <h1 className="max-w-4xl text-6xl font-semibold leading-[0.9] text-[var(--app-text)] sm:text-8xl">
              Saved pantry recipes.
            </h1>
            <p className="text-sm leading-6 text-[var(--app-text-faint)]">
              Recipes saved from generated pantry cards appear here for everyone.
              Search by ingredient, title, cuisine, or instruction.
            </p>
          </div>
        </section>

        <SavedRecipeGallery />
      </div>
    </main>
  );
}
