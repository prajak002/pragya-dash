import { useMemo } from "react";
import type { Edge } from "../canonical/types";
import { useTwinStore } from "../state/store";
import { GraphDiagram } from "./GraphDiagram";

function chainToGraph(chain: Edge[] | null) {
  if (!chain || chain.length === 0) return null;
  const ids = new Set<string>();
  for (const e of chain) {
    ids.add(e.from);
    ids.add(e.to);
  }
  return { nodeIds: Array.from(ids), edges: chain };
}

export function TraceDiagram() {
  const model = useTwinStore((s) => s.model);
  const trace = useTwinStore((s) => s.trace);
  const traceRootId = useTwinStore((s) => s.traceRootId);

  const mech = useMemo(() => chainToGraph(trace?.mechanical ?? null), [trace]);
  const power = useMemo(() => chainToGraph(trace?.power ?? null), [trace]);
  const signal = useMemo(() => chainToGraph(trace?.signal ?? null), [trace]);

  if (!model) return null;

  if (!traceRootId) {
    return (
      <div className="diagram-empty">
        Select a component in the 3D view, then it will be traced across mechanical, power and signal
        paths simultaneously.
      </div>
    );
  }

  const focus = trace?.focusPart ?? traceRootId;

  return (
    <div className="trace-columns">
      <GraphDiagram
        model={model}
        nodeIds={mech?.nodeIds ?? []}
        edges={mech?.edges ?? []}
        rootId={focus}
        title="Mechanical → root"
        emptyMessage="No mechanical path from this component."
      />
      <GraphDiagram
        model={model}
        nodeIds={power?.nodeIds ?? []}
        edges={power?.edges ?? []}
        rootId={power?.nodeIds[0] ?? focus}
        title="Power → battery"
        emptyMessage="No power path from this component."
      />
      <GraphDiagram
        model={model}
        nodeIds={signal?.nodeIds ?? []}
        edges={signal?.edges ?? []}
        rootId={signal?.nodeIds[0] ?? focus}
        title="Signal → controller"
        emptyMessage="No signal path from this component."
      />
    </div>
  );
}
