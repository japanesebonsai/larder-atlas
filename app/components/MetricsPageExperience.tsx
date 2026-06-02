"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { AtlasAtmosphere } from "./AtlasAtmosphere";

type BenchmarkPayload = {
  note: string;
  generatedAt: string;
  summary: {
    runs: number;
    totalDurationMs: number;
    averageMs: number;
    fastestMs: number;
    slowestMs: number;
    modelCalls: number;
  };
  runs: Array<{
    pantry: string;
    goal: string;
    durationMs: number;
    matched: number;
    recommendations: number;
  }>;
};

export function MetricsPageExperience() {
  const [benchmark, setBenchmark] = useState<BenchmarkPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem("larder-atlas-theme");

      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }

      void loadBenchmark();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("larder-atlas-theme", theme);
  }, [theme]);

  async function loadBenchmark() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/benchmarks");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? payload.error ?? "Unable to run benchmark.");
      }

      setBenchmark(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to run benchmark.");
    } finally {
      setIsLoading(false);
    }
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
              className="text-sm font-semibold uppercase text-[var(--app-text-muted)] transition hover:text-[var(--app-text)]"
            >
              Main
            </Link>
            <a
              href="https://github.com/japanesebonsai/larder-atlas"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-full border border-[var(--app-border)] px-4 py-2 text-sm font-semibold text-[var(--app-text-muted)] transition hover:border-[var(--app-accent)] hover:text-[var(--app-text)] sm:inline-flex"
            >
              <Star aria-hidden="true" className="size-3.5" strokeWidth={2} />
              Star on GitHub
            </a>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className="cursor-pointer rounded-full border border-[var(--app-border)] px-3 py-2 text-sm font-semibold uppercase text-[var(--app-text-muted)] transition hover:text-[var(--app-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text)]"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </nav>
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase text-[var(--app-accent)]">
            App benchmarks
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
            <h1 className="max-w-4xl text-6xl font-semibold leading-[0.9] text-[var(--app-text)] sm:text-8xl">
              Local scoring speed.
            </h1>
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[var(--app-text-faint)]">
                Repeatable pantry samples measured against bundled Epicure data and
                deterministic Larder Atlas scoring.
              </p>
              <button
                type="button"
                onClick={loadBenchmark}
                disabled={isLoading}
                className="min-h-11 cursor-pointer rounded-full border border-[var(--app-border)] bg-[var(--app-inverse)] px-4 text-sm font-semibold text-[var(--app-inverse-text)] transition hover:bg-[var(--app-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Running..." : "Run benchmark"}
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-[24px] border border-[var(--app-danger-border)] bg-[var(--app-danger-soft)] p-5 text-sm font-semibold text-[var(--app-danger-text)]">
            {error}
          </p>
        ) : null}

        {benchmark ? (
          <section className="space-y-5 pb-12">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard label="Runs" value={benchmark.summary.runs} />
              <MetricCard label="Average" value={`${benchmark.summary.averageMs} ms`} />
              <MetricCard label="Fastest" value={`${benchmark.summary.fastestMs} ms`} />
              <MetricCard label="Slowest" value={`${benchmark.summary.slowestMs} ms`} />
              <MetricCard label="Total" value={`${benchmark.summary.totalDurationMs} ms`} />
              <MetricCard label="Model calls" value={benchmark.summary.modelCalls} />
            </div>

            <p className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 text-sm leading-6 text-[var(--app-text-faint)]">
              {benchmark.note}
            </p>

            <div className="grid gap-3">
              {benchmark.runs.map((run) => (
                <article
                  key={`${run.pantry}-${run.goal}`}
                  className="grid gap-3 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm text-[var(--app-text-muted)] backdrop-blur-xl md:grid-cols-[1fr_120px_120px_120px]"
                >
                  <div>
                    <p className="font-semibold text-[var(--app-text)]">{run.pantry}</p>
                    <p className="mt-1 text-xs font-semibold uppercase text-[var(--app-text-faint)]">
                      {run.goal.replaceAll("_", " ")}
                    </p>
                  </div>
                  <MetricInline label="Time" value={`${run.durationMs} ms`} />
                  <MetricInline label="Matched" value={run.matched} />
                  <MetricInline label="Pairs" value={run.recommendations} />
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase text-[var(--app-accent)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[var(--app-text)]">{value}</p>
    </article>
  );
}

function MetricInline({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[var(--app-text-faint)]">{label}</p>
      <p className="mt-1 font-semibold text-[var(--app-text)]">{value}</p>
    </div>
  );
}
