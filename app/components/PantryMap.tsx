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
    <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-[#d8d0be] bg-[#f4f7ed]">
      <div className="absolute left-4 top-4 z-10 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#65745b] shadow-sm">
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
          <Background color="#c8d1bc" gap={26} />
          <MiniMap
            nodeColor={(node) =>
              node.data.kind === "pantry"
                ? "#2f5f5b"
                : node.data.kind === "bridge"
                  ? "#7f6b42"
                  : "#c7782b"
            }
            maskColor="rgba(248, 246, 240, 0.7)"
            pannable
            zoomable
          />
          <Controls position="bottom-right" />
        </ReactFlow>
      ) : (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-8 text-center text-sm leading-6 text-[#687263]">
          Run a pantry analysis to place your ingredients and best buys on the
          Epicure map.
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10 flex gap-2 text-xs text-[#596153]">
        <LegendDot className="bg-[#2f5f5b]" label="pantry" />
        <LegendDot className="bg-[#7f6b42]" label="branch" />
        <LegendDot className="bg-[#c7782b]" label="recommended" />
      </div>

      {selectedNode ? (
        <div className="absolute right-4 top-4 z-20 w-52 rounded-lg border border-[#d8d0be] bg-white/95 p-3 text-sm shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8c917f]">
            {selectedNode.data.kind}
          </p>
          <h3 className="mt-1 font-semibold text-[#1f2520]">
            {selectedNode.data.name}
          </h3>
          {selectedNode.data.score ? (
            <p className="mt-2 text-[#596153]">
              Recommendation score {selectedNode.data.score.toFixed(3)}
            </p>
          ) : null}
          <p className="mt-2 text-[#596153]">
            Drag nodes to untangle the branch and inspect ingredient links.
          </p>
        </div>
      ) : null}
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
      ? "border-[#2f5f5b] bg-[#d9efec] text-[#163f3b]"
      : data.kind === "bridge"
        ? "border-[#7f6b42] bg-[#eee5cf] text-[#493d25]"
        : "border-[#9d632a] bg-[#fff0cf] text-[#623b13]";
  const dot =
    data.kind === "pantry"
      ? "bg-[#2f5f5b]"
      : data.kind === "bridge"
        ? "bg-[#7f6b42]"
        : "bg-[#c7782b]";

  return (
    <div
      className={`min-w-32 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm ${style}`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span>{data.name}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
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
    position: projectToCanvas(point, bounds),
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
      markerEnd: { type: MarkerType.ArrowClosed, color: "#9d632a" },
      style: { stroke: "#b98a52", strokeWidth: 2 },
      labelStyle: { fill: "#6d5a36", fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: "#fffdf8", fillOpacity: 0.85 },
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
        style: { stroke: "#9aa38e", strokeDasharray: "5 5", strokeWidth: 1.5 },
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
    position: projectToCanvas(center, bounds),
    data: {
      name: "pantry center",
      kind: "bridge",
    },
    draggable: true,
  };
}

function projectToCanvas(
  point: Pick<PantryMapPoint, "x" | "y">,
  bounds: ReturnType<typeof getBounds>,
) {
  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxY - bounds.minY || 1;

  return {
    x: ((point.x - bounds.minX) / width) * 720,
    y: (1 - (point.y - bounds.minY) / height) * 320,
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
