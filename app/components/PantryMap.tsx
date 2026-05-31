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
import { useEffect, useMemo, useState } from "react";

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

type IngredientNodeData = {
  name: string;
  kind: PantryMapPoint["kind"] | "bridge";
  score?: number;
};

const nodeTypes = {
  ingredient: IngredientNode,
};

export function PantryMap({ points }: PantryMapProps) {
  const graph = useMemo(() => buildGraph(points), [points]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);
  const [selectedNode, setSelectedNode] = useState<Node<IngredientNodeData> | null>(
    null,
  );

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setEdges, setNodes]);

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-white/10 bg-black/35">
      <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd6bd] shadow-sm backdrop-blur-md">
        Interactive Epicure atlas
      </div>

      {points.length ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNode(node as Node<IngredientNodeData>)}
          fitView
          fitViewOptions={{ padding: 0.28 }}
          minZoom={0.55}
          maxZoom={1.7}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#5e473d" gap={26} />
          <MiniMap
            nodeColor={(node) =>
              node.data.kind === "pantry"
                ? "#2f5f5b"
                : node.data.kind === "bridge"
                  ? "#ffd6bd"
                  : "#faad93"
            }
            maskColor="rgba(5, 5, 5, 0.74)"
            pannable
            zoomable
          />
          <Controls position="bottom-right" />
        </ReactFlow>
      ) : (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8 text-center text-sm leading-6 text-[#d9c4b7]">
          Run a pantry analysis to place your ingredients and best buys on the
          Epicure map.
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 flex gap-2 text-xs text-[#d9c4b7]">
        <LegendDot className="bg-[#2f5f5b]" label="pantry" />
        <LegendDot className="bg-[#7f6b42]" label="branch" />
        <LegendDot className="bg-[#c7782b]" label="recommended" />
      </div>

      <AnimatePresence>
        {selectedNode ? (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="absolute left-4 right-4 top-16 z-20 rounded-lg border border-white/10 bg-[#0d0b0a]/90 p-3 text-sm text-[#fff8ec] shadow-2xl shadow-black/40 backdrop-blur-xl sm:left-auto sm:top-4 sm:w-56"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd6bd]">
              {selectedNode.data.kind}
            </p>
            <h3 className="mt-1 font-semibold text-[#fff8ec]">
              {selectedNode.data.name}
            </h3>
            {selectedNode.data.score ? (
              <p className="mt-2 text-[#d9c4b7]">
                Recommendation score {selectedNode.data.score.toFixed(3)}
              </p>
            ) : null}
          <p className="mt-2 text-[#d9c4b7]">
              Drag nodes to untangle the branch and inspect ingredient links.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
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

function IngredientNode({ data }: NodeProps<Node<IngredientNodeData>>) {
  const style =
    data.kind === "pantry"
      ? "border-[#63b2a9] bg-[#123b38] text-[#d9efec]"
      : data.kind === "bridge"
        ? "border-[#ffd6bd] bg-[#3a221a] text-[#fff8ec]"
        : "border-[#faad93] bg-[#4a2319] text-[#ffd6bd]";
  const dot =
    data.kind === "pantry"
      ? "bg-[#2f5f5b]"
      : data.kind === "bridge"
        ? "bg-[#ffd6bd]"
        : "bg-[#faad93]";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 360, damping: 26 }}
      className={`min-w-32 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm ${style}`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span>{data.name}</span>
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
  const bounds = getBounds(points);
  const nodes: Node<IngredientNodeData>[] = points.map((point) => ({
    id: pointId(point),
    type: "ingredient",
    position: projectToCanvas(point, bounds, points),
    data: {
      name: point.name,
      kind: point.kind,
      score: point.score,
    },
  }));
  const edges: Edge[] = [];

  for (const recommendation of recommendations) {
    const nearest = findNearestPoint(recommendation, pantry);

    if (!nearest) {
      continue;
    }

    edges.push({
      id: `${pointId(nearest)}-${pointId(recommendation)}`,
      source: pointId(nearest),
      target: pointId(recommendation),
      label: "closest pantry link",
      type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#faad93" },
        style: { stroke: "#faad93", strokeWidth: 2.4 },
        labelStyle: { fill: "#ffd6bd", fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "#0d0b0a", fillOpacity: 0.82 },
    });
  }

  if (pantry.length > 1) {
    const bridge = buildBridgeNode(pantry, bounds);
    nodes.push(bridge);
    edges.push(
      ...pantry.map((point) => ({
        id: `${bridge.id}-${pointId(point)}`,
        source: bridge.id,
        target: pointId(point),
        type: "smoothstep",
        style: { stroke: "#ffd6bd", strokeDasharray: "5 5", strokeWidth: 1.7 },
      })),
    );
  }

  return { nodes, edges };
}

function buildBridgeNode(
  pantry: PantryMapPoint[],
  bounds: ReturnType<typeof getBounds>,
): Node<IngredientNodeData> {
  const center = {
    id: -1,
    name: "pantry center",
    kind: "bridge" as const,
    x: pantry.reduce((sum, point) => sum + point.x, 0) / pantry.length,
    y: pantry.reduce((sum, point) => sum + point.y, 0) / pantry.length,
  };

  return {
    id: "branch-pantry-center",
    type: "ingredient",
    position: projectToCanvas(center, bounds, pantry),
    data: {
      name: "pantry center",
      kind: "bridge",
    },
    draggable: true,
  };
}

function projectToCanvas(
  point: Pick<PantryMapPoint, "x" | "y"> & { kind: IngredientNodeData["kind"] },
  bounds: ReturnType<typeof getBounds>,
  allPoints: Array<Pick<PantryMapPoint, "x" | "y"> & { kind: IngredientNodeData["kind"] }>,
) {
  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxY - bounds.minY || 1;
  const baseX = ((point.x - bounds.minX) / width) * 720;
  const baseY = (1 - (point.y - bounds.minY) / height) * 320;

  if (point.kind !== "recommendation") {
    return { x: baseX, y: baseY };
  }

  const pantryCenter = centerOf(allPoints.filter((candidate) => candidate.kind === "pantry"));
  const directionX = point.x - pantryCenter.x || 0.2;
  const directionY = point.y - pantryCenter.y || 0.2;
  const length = Math.hypot(directionX, directionY) || 1;

  return {
    x: baseX + (directionX / length) * 64,
    y: baseY - (directionY / length) * 36,
  };
}

function centerOf(points: Array<Pick<PantryMapPoint, "x" | "y">>) {
  if (!points.length) {
    return { x: 0, y: 0 };
  }

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
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

function getBounds(points: Array<Pick<PantryMapPoint, "x" | "y">>) {
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
