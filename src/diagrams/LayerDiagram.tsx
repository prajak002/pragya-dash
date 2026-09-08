import { useMemo } from "react";
import type { Edge } from "../canonical/types";
import { useTwinStore } from "../state/store";
import { GraphDiagram } from "./GraphDiagram";

const ROOTS: Record<Edge["kind"], string> = {
  mechanical: "PELVIS",
  power: "BATTERY",
  signal: "MCB",
};

const TITLES: Record<Edge["kind"], string> = {
  mechanical: "Mechanical chain — structure, joints & drivetrain",
  power: "Power path — battery to actuator",
  signal: "Signal / communication path — sensors, CAN buses, compute",
};

export function LayerDiagram({ kind }: { kind: Edge["kind"] }) {
  const model = useTwinStore((s) => s.model);

  const { nodeIds, edges } = useMemo(() => {
    if (!model) return { nodeIds: [], edges: [] as Edge[] };
    const edges = model.edges.filter((e) => e.kind === kind);
    const ids = new Set<string>([ROOTS[kind]]);
    for (const e of edges) {
      ids.add(e.from);
      ids.add(e.to);
    }
    return { nodeIds: Array.from(ids), edges };
  }, [model, kind]);

  if (!model) return null;

  return <GraphDiagram model={model} nodeIds={nodeIds} edges={edges} rootId={ROOTS[kind]} title={TITLES[kind]} />;
}
