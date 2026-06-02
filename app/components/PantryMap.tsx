"use client";

import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo } from "react";

export type PantryMapPoint = {
  id: number;
  name: string;
  category: string;
  x: number;
  y: number;
  kind: "pantry" | "recommendation";
  score?: number;
};

type PantryMapProps = {
  points: PantryMapPoint[];
  selectedPointId?: string;
  onSelectPoint?: (id: string) => void;
};

type IngredientNodeData = {
  name: string;
  kind: PantryMapPoint["kind"] | "branch" | "root";
  category?: string;
  score?: number;
};

const nodeTypes = {
  ingredient: IngredientNode,
};

export function PantryMap({ points, selectedPointId, onSelectPoint }: PantryMapProps) {
  const graph = useMemo(() => buildGraph(points), [points]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const selectedNode = useMemo(
    () =>
      selectedPointId
        ? nodes.find((node) => node.id === selectedPointId) ?? null
        : null,
    [nodes, selectedPointId],
  );

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setEdges, setNodes]);

  return (
    <div className="relative min-h-[560px] overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] backdrop-blur-md">
      <div className="absolute left-5 top-5 z-10 rounded-full border border-[var(--app-border)] bg-[var(--app-field)] px-4 py-2 text-xs font-semibold uppercase text-[var(--app-text-muted)] backdrop-blur-xl">
        Epicure atlas
      </div>

      {points.length ? (
        <ReactFlow
          aria-label="Ingredient relationship atlas"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => onSelectPoint?.(node.id)}
          nodesDraggable
          fitView
          fitViewOptions={{ padding: 0.28 }}
          minZoom={0.55}
          maxZoom={1.7}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--app-graph-grid)" gap={34} />
          <MiniMap
            nodeColor={(node) =>
              node.data.kind === "pantry"
                ? "#f8fafc"
                : node.data.kind === "root"
                  ? "var(--app-violet)"
                  : "var(--app-accent)"
            }
            maskColor="var(--app-graph-mask)"
            pannable
            zoomable
          />
          <Controls position="bottom-right" />
        </ReactFlow>
      ) : (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8 text-center text-sm leading-6 text-[var(--app-text-muted)]">
          Analyze a pantry to place ingredients and pairs on the map.
        </div>
      )}

      <div className="absolute bottom-5 left-5 z-10 flex gap-2 text-xs text-[var(--app-text-muted)]">
        <LegendDot className="bg-[var(--app-inverse)]" label="pantry" />
        <LegendDot className="bg-[var(--app-violet)]" label="branch" />
        <LegendDot className="bg-[var(--app-accent)]" label="pair" />
      </div>

      <AnimatePresence>
        {selectedNode ? (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="absolute left-5 right-5 top-20 z-20 rounded-3xl border border-[var(--app-border)] bg-[var(--app-popover)] p-4 text-sm text-[var(--app-text)] backdrop-blur-xl sm:left-auto sm:top-5 sm:w-60"
          >
            <p className="text-xs font-semibold uppercase text-[var(--app-violet)]">
              {selectedNode.data.kind}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--app-text)]">
              {selectedNode.data.name}
            </h3>
            {selectedNode.data.score ? (
              <p className="mt-2 text-[var(--app-text-muted)]">
                Score {selectedNode.data.score.toFixed(3)}
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-field)] px-2.5 py-1 backdrop-blur-md">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function IngredientNode({ data }: NodeProps<Node<IngredientNodeData>>) {
  const style =
    data.kind === "pantry"
      ? "border-[var(--app-border-strong)] bg-[var(--app-inverse)] text-[var(--app-inverse-text)]"
      : data.kind === "root"
        ? "border-[#b000ff]/45 bg-[var(--app-violet)]/16 text-[var(--app-accent-text)]"
        : data.kind === "branch"
          ? "border-[var(--app-border-strong)] bg-[var(--app-field)] text-[var(--app-text)]"
        : "border-[var(--app-accent)] bg-[var(--app-accent-soft)] text-[var(--app-accent-text)]";
  const dot =
    data.kind === "pantry"
      ? "bg-[var(--app-inverse-text)]"
      : data.kind === "root"
        ? "bg-[var(--app-violet)]"
        : data.kind === "branch"
          ? "bg-[var(--app-text-muted)]"
        : "bg-[var(--app-accent)]";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className={`min-w-36 max-w-48 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur-md ${style}`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className="truncate" title={data.name}>
          {data.name}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </motion.div>
  );
}

function buildGraph(points: PantryMapPoint[]): {
  nodes: Node<IngredientNodeData>[];
  edges: Edge[];
} {
  const pantry = points.filter((point) => point.kind === "pantry");
  const recommendations = points.filter((point) => point.kind === "recommendation");
  const groups = buildRecommendationGroups(pantry, recommendations);
  const nodes: Node<IngredientNodeData>[] = [];
  const edges: Edge[] = [];
  const rowHeight = 104;
  const branchGap = 36;
  const categoryGap = 18;
  const rootX = 0;
  const pantryX = 260;
  const branchX = 530;
  const recommendationX = 820;
  let cursorY = 0;

  for (const pantryPoint of pantry) {
    const categoryGroups = groups.get(pointId(pantryPoint)) ?? new Map();
    const categories = Array.from(categoryGroups.entries());
    const branchRows = Math.max(
      1,
      categories.reduce((total, [, children]) => total + Math.max(1, children.length), 0),
    );
    const branchTop = cursorY;
    const branchBottom = cursorY + (branchRows - 1) * rowHeight;
    const pantryY = (branchTop + branchBottom) / 2;
    let branchCursorY = branchTop;

    nodes.push({
      id: pointId(pantryPoint),
      type: "ingredient",
      position: { x: pantryX, y: pantryY },
      data: {
        name: pantryPoint.name,
        kind: pantryPoint.kind,
        category: pantryPoint.category,
        score: pantryPoint.score,
      },
    });

    edges.push({
      id: `root-${pointId(pantryPoint)}`,
      source: "root-pantry",
      target: pointId(pantryPoint),
      type: "smoothstep",
      style: { stroke: "var(--app-border-strong)", strokeWidth: 1.8 },
    });

    for (const [category, children] of categories) {
      const categoryRows = Math.max(1, children.length);
      const categoryTop = branchCursorY;
      const categoryBottom = categoryTop + (categoryRows - 1) * rowHeight;
      const categoryY = (categoryTop + categoryBottom) / 2;
      const branchId = branchNodeId(pantryPoint, category);

      nodes.push({
        id: branchId,
        type: "ingredient",
        position: { x: branchX, y: categoryY },
        data: {
          name: category,
          kind: "branch",
        },
      });

      edges.push({
        id: `${pointId(pantryPoint)}-${branchId}`,
        source: pointId(pantryPoint),
        target: branchId,
        label: "branch",
        type: "smoothstep",
        style: { stroke: "var(--app-border-strong)", strokeWidth: 1.8 },
        labelStyle: { fill: "var(--app-text-muted)", fontSize: 11, fontWeight: 700 },
        labelBgStyle: { fill: "var(--app-graph-label-bg)", fillOpacity: 0.74 },
      });

      for (const [index, recommendation] of children.entries()) {
        const recommendationY = categoryTop + index * rowHeight;

        nodes.push({
          id: pointId(recommendation),
          type: "ingredient",
          position: { x: recommendationX, y: recommendationY },
          data: {
            name: recommendation.name,
            kind: recommendation.kind,
            category: recommendation.category,
            score: recommendation.score,
          },
        });

        edges.push({
          id: `${branchId}-${pointId(recommendation)}`,
          source: branchId,
          target: pointId(recommendation),
          label: "pair",
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--app-accent)" },
          style: { stroke: "var(--app-accent)", strokeWidth: 2.4 },
          labelStyle: { fill: "var(--app-accent-text)", fontSize: 11, fontWeight: 700 },
          labelBgStyle: { fill: "var(--app-graph-label-bg)", fillOpacity: 0.74 },
        });
      }

      branchCursorY += categoryRows * rowHeight + categoryGap;
    }

    cursorY += branchRows * rowHeight + branchGap + categories.length * categoryGap;
  }

  if (!pantry.length && recommendations.length) {
    const categoryGroups = groupByCategory(recommendations);
    let branchCursorY = 0;

    for (const [category, children] of categoryGroups.entries()) {
      const categoryRows = Math.max(1, children.length);
      const categoryTop = branchCursorY;
      const categoryBottom = categoryTop + (categoryRows - 1) * rowHeight;
      const categoryY = (categoryTop + categoryBottom) / 2;
      const branchId = `branch-orphan-${slugify(category)}`;

      nodes.push({
        id: branchId,
        type: "ingredient",
        position: { x: branchX, y: categoryY },
        data: {
          name: category,
          kind: "branch",
        },
      });

      edges.push({
        id: `root-${branchId}`,
        source: "root-pantry",
        target: branchId,
        type: "smoothstep",
        style: { stroke: "var(--app-border-strong)", strokeWidth: 1.8 },
      });

      for (const [index, recommendation] of children.entries()) {
        nodes.push({
          id: pointId(recommendation),
          type: "ingredient",
          position: { x: recommendationX, y: categoryTop + index * rowHeight },
          data: {
            name: recommendation.name,
            kind: recommendation.kind,
            category: recommendation.category,
            score: recommendation.score,
          },
        });

        edges.push({
          id: `${branchId}-${pointId(recommendation)}`,
          source: branchId,
          target: pointId(recommendation),
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--app-accent)" },
          style: { stroke: "var(--app-accent)", strokeWidth: 2.2 },
        });
      }

      branchCursorY += categoryRows * rowHeight + categoryGap;
    }

    cursorY = branchCursorY;
  }

  const rootY = Math.max(0, (cursorY - branchGap - rowHeight) / 2);

  nodes.unshift({
    id: "root-pantry",
    type: "ingredient",
    position: { x: rootX, y: rootY },
    data: {
      name: "pantry",
      kind: "root",
    },
    draggable: true,
  });
  return { nodes, edges };
}

function buildRecommendationGroups(
  pantry: PantryMapPoint[],
  recommendations: PantryMapPoint[],
) {
  const groups = new Map<string, Map<string, PantryMapPoint[]>>(
    pantry.map((pantryPoint) => [pointId(pantryPoint), new Map()]),
  );

  for (const recommendation of recommendations) {
    const nearest = findNearestPoint(recommendation, pantry);
    const key = nearest ? pointId(nearest) : pointId(pantry[0]);

    if (key) {
      const categoryGroups = groups.get(key);
      const category = recommendation.category || "Pair";
      const children = categoryGroups?.get(category) ?? [];
      categoryGroups?.set(category, [...children, recommendation]);
    }
  }

  return groups;
}

function groupByCategory(points: PantryMapPoint[]) {
  return points.reduce((groups, point) => {
    const category = point.category || "Pair";
    const current = groups.get(category) ?? [];
    groups.set(category, [...current, point]);

    return groups;
  }, new Map<string, PantryMapPoint[]>());
}

function findNearestPoint(
  target: PantryMapPoint,
  candidates: PantryMapPoint[],
): PantryMapPoint | undefined {
  return candidates
    .map((candidate) => ({
      candidate,
      distance: Math.hypot(target.x - candidate.x, target.y - candidate.y),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.candidate;
}

function pointId(point: PantryMapPoint) {
  return `${point.kind}-${point.id}`;
}

function branchNodeId(point: PantryMapPoint, category: string) {
  return `branch-${point.id}-${slugify(category)}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
