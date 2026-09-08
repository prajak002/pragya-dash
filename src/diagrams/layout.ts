import type { CanonicalModel, Edge, GraphNode } from "../canonical/types";

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  depth: number;
}

export interface DiagramLayout {
  nodes: LayoutNode[];
  width: number;
  height: number;
}

const COL_SPACING = 190;
const ROW_SPACING = 46;
const MARGIN = 70;

/** Deterministic layered-column layout: BFS depth from `rootId` over the given edges decides the column, position within a column is stable-sorted by side then label. No crossing-minimization — graphs here are small enough that a stable sort reads fine. */
export function layoutGraph(model: CanonicalModel, nodeIds: string[], edges: Edge[], rootId: string): DiagramLayout {
  const idSet = new Set(nodeIds);
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    if (!adjacency.has(e.to)) adjacency.set(e.to, []);
    adjacency.get(e.from)!.push(e.to);
    adjacency.get(e.to)!.push(e.from);
  }

  const depth = new Map<string, number>();
  if (idSet.has(rootId)) {
    depth.set(rootId, 0);
    const queue = [rootId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of adjacency.get(cur) ?? []) {
        if (!depth.has(next)) {
          depth.set(next, (depth.get(cur) ?? 0) + 1);
          queue.push(next);
        }
      }
    }
  }
  // any nodes unreachable from root (shouldn't normally happen) get pushed to the last column
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  for (const id of nodeIds) {
    if (!depth.has(id)) depth.set(id, maxDepth + 1);
  }
  maxDepth = Math.max(maxDepth, ...Array.from(depth.values()));

  const byDepth = new Map<number, string[]>();
  for (const id of nodeIds) {
    const d = depth.get(id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }

  const sortKey = (id: string) => {
    const node = model.nodes[id];
    const side = node && "side" in node ? node.side : "center";
    const sideRank = side === "L" ? 0 : side === "center" ? 1 : 2;
    const label = labelOf(node);
    return `${sideRank}-${label}`;
  };

  const layoutNodes: LayoutNode[] = [];
  let maxRows = 1;
  for (const [d, ids] of byDepth.entries()) {
    ids.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    maxRows = Math.max(maxRows, ids.length);
    ids.forEach((id, i) => {
      const yOffset = (i - (ids.length - 1) / 2) * ROW_SPACING;
      layoutNodes.push({ id, x: MARGIN + d * COL_SPACING, y: yOffset, depth: d });
    });
  }

  // re-center y around a common baseline
  const height = maxRows * ROW_SPACING + MARGIN * 2;
  const centerY = height / 2;
  for (const n of layoutNodes) n.y += centerY;

  const width = MARGIN * 2 + (maxDepth + 1) * COL_SPACING;

  return { nodes: layoutNodes, width, height };
}

export function labelOf(node: GraphNode | undefined): string {
  if (!node) return "?";
  if (node.kind === "part") return node.name;
  if (node.kind === "joint") return node.label;
  return node.label;
}

export function colorOf(node: GraphNode | undefined): string {
  if (!node) return "#4c596c";
  if (node.kind === "part") return "#a994ff";
  if (node.kind === "joint") return node.evidence.class === "illustrative" ? "#e2b66c" : "#7dd3e3";
  switch (node.role) {
    case "power-source":
    case "power-distribution":
    case "power-rail":
      return "#e2b66c";
    case "bus":
      return "#7dd3e3";
    case "driver":
    case "encoder":
      return "#c084fc";
    case "compute":
    case "controller":
      return "#6ee7b7";
    case "sensor":
      return "#f472b6";
    default:
      return "#95a2b5";
  }
}
