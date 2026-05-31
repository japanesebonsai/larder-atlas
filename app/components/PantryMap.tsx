"use client";

export type PantryMapPoint = {
  id: number;
  name: string;
  x: number;
  y: number;
  kind: "pantry" | "recommendation";
  score?: number;
};

type PantryMapProps = {
  points: PantryMapPoint[];
};

export function PantryMap({ points }: PantryMapProps) {
  const bounds = getBounds(points);

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-[#d8d0be] bg-[#f4f7ed]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(79,88,75,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(79,88,75,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute left-4 top-4 z-10 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#65745b] shadow-sm">
        Epicure atlas preview
      </div>

      {points.length ? (
        points.map((point) => {
          const position = projectPoint(point, bounds);

          return (
            <button
              key={`${point.kind}-${point.id}`}
              type="button"
              className={[
                "absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-semibold shadow-sm transition hover:z-30 hover:scale-105",
                point.kind === "pantry"
                  ? "border-[#2f5f5b] bg-[#d9efec] text-[#163f3b]"
                  : "border-[#9d632a] bg-[#fff0cf] text-[#623b13]",
              ].join(" ")}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
              }}
              title={point.score ? `${point.name}: ${point.score}` : point.name}
            >
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  point.kind === "pantry" ? "bg-[#2f5f5b]" : "bg-[#c7782b]",
                ].join(" ")}
              />
              {point.name}
            </button>
          );
        })
      ) : (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8 text-center text-sm leading-6 text-[#687263]">
          Run a pantry analysis to place your ingredients and best buys on the
          Epicure map.
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 flex gap-2 text-xs text-[#596153]">
        <LegendDot className="bg-[#2f5f5b]" label="pantry" />
        <LegendDot className="bg-[#c7782b]" label="recommended" />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function projectPoint(
  point: PantryMapPoint,
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  },
) {
  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxY - bounds.minY || 1;
  const left = 10 + ((point.x - bounds.minX) / width) * 80;
  const top = 90 - ((point.y - bounds.minY) / height) * 80;

  return { left, top };
}

function getBounds(points: PantryMapPoint[]) {
  if (!points.length) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
