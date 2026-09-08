import { useMemo } from "react";
import type { CanonicalModel, Edge } from "../canonical/types";
import { jointIdFromElectricalId, useTelemetryStore } from "../state/telemetry";
import { useTwinStore } from "../state/store";
import { colorOf, labelOf, layoutGraph } from "./layout";

interface GraphDiagramProps {
  model: CanonicalModel;
  nodeIds: string[];
  edges: Edge[];
  rootId: string;
  title: string;
  emptyMessage?: string;
}

const NODE_W = 152;
const NODE_H = 36;

function liveSubLabel(model: CanonicalModel, nodeId: string, telemetry: ReturnType<typeof useTelemetryStore.getState>["joints"]): string | null {
  const node = model.nodes[nodeId];
  if (!node || node.kind !== "electrical") return null;
  const jointId = jointIdFromElectricalId(nodeId);
  if (!jointId) return null;
  const t = telemetry[jointId];
  if (!t) return null;
  if (node.role === "driver") return `${t.elecPowerW.toFixed(1)} W · ${t.currentA.toFixed(2)} A`;
  if (node.role === "encoder") return `${t.angleDeg.toFixed(1)}°`;
  return null;
}

export function GraphDiagram({ model, nodeIds, edges, rootId, title, emptyMessage }: GraphDiagramProps) {
  const selectedId = useTwinStore((s) => s.selectedId);
  const hoveredId = useTwinStore((s) => s.hoveredId);
  const select = useTwinStore((s) => s.select);
  const hover = useTwinStore((s) => s.hover);
  const telemetry = useTelemetryStore((s) => s.joints);

  const layout = useMemo(() => layoutGraph(model, nodeIds, edges, rootId), [model, nodeIds, edges, rootId]);
  const posById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);

  if (nodeIds.length === 0) {
    return <div className="diagram-empty">{emptyMessage ?? "Nothing to show for this component yet."}</div>;
  }

  return (
    <div className="diagram-scroll">
      <div className="diagram-title">{title}</div>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="diagram-svg"
      >
        <g>
          {edges.map((e, i) => {
            const a = posById.get(e.from);
            const b = posById.get(e.to);
            if (!a || !b) return null;
            const active = selectedId === e.from || selectedId === e.to || hoveredId === e.from || hoveredId === e.to;
            const midX = (a.x + b.x) / 2;
            const path = `M ${a.x + NODE_W / 2} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - NODE_W / 2} ${b.y}`;
            return (
              <g key={`${e.from}-${e.to}-${i}`}>
                <path
                  d={path}
                  className={`diagram-edge diagram-edge--${e.kind}${active ? " diagram-edge--active" : ""}`}
                  fill="none"
                />
              </g>
            );
          })}
        </g>
        <g>
          {layout.nodes.map((ln) => {
            const node = model.nodes[ln.id];
            const color = colorOf(node);
            const label = labelOf(node);
            const sub = liveSubLabel(model, ln.id, telemetry);
            const isSelected = selectedId === ln.id;
            const isHovered = hoveredId === ln.id;
            return (
              <g
                key={ln.id}
                transform={`translate(${ln.x - NODE_W / 2}, ${ln.y - NODE_H / 2})`}
                className="diagram-node"
                onMouseEnter={() => hover(ln.id)}
                onMouseLeave={() => hover(null)}
                onClick={() => select(ln.id)}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={6}
                  fill={isSelected ? color : "#151e2b"}
                  stroke={color}
                  strokeWidth={isSelected || isHovered ? 2 : 1}
                  opacity={isSelected ? 0.9 : 1}
                />
                <text
                  x={NODE_W / 2}
                  y={sub ? NODE_H / 2 - 3 : NODE_H / 2 + 4}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill={isSelected ? "#0b1017" : "#dbe3ef"}
                  fontFamily="Inter, Segoe UI, Arial, sans-serif"
                >
                  {label.length > 22 ? label.slice(0, 21) + "…" : label}
                </text>
                {sub && (
                  <text
                    x={NODE_W / 2}
                    y={NODE_H / 2 + 11}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="monospace"
                    fill={isSelected ? "#0b1017" : "#7dd3e3"}
                  >
                    {sub}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
