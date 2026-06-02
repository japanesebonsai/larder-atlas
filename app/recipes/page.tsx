import Link from "next/link";
import { SavedRecipeGallery } from "@/app/components/SavedRecipeGallery";

export default function RecipesPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 py-5 text-[var(--app-text)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute right-[-22vw] top-[-28vw] h-[58vw] w-[58vw] rounded-full bg-[radial-gradient(circle_at_45%_45%,rgba(255,56,205,0.9),rgba(145,35,255,0.74)_36%,rgba(255,255,255,0)_67%)] blur-2xl" />
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
