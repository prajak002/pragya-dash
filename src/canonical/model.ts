import type { CanonicalModel, Edge, GraphNode, PartNode, Side, Subsystem } from "./types";
import { JOINTS, JOINT_ENVELOPES } from "./joints";
import { ELECTRICAL_NODES, jointElectricalId } from "./electrical";

interface RawManifestGroup {
  id: string;
  key: string;
  name: string;
  region: string;
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  explode: [number, number, number];
  vertices: number;
  triangles: number;
  observed: string;
  proposal: string;
  check: string;
}

interface RawManifest {
  version: string;
  source: string;
  unitStatus: string;
  bodyBounds: [[number, number, number], [number, number, number]];
  preservation: string;
  groups: RawManifestGroup[];
}

function sideOf(key: string): Side {
  if (key.endsWith("_R")) return "R";
  if (key.endsWith("_L")) return "L";
  return "center";
}

function partFromGroup(g: RawManifestGroup): PartNode {
  return {
    kind: "part",
    id: g.key,
    groupId: g.id,
    name: g.name,
    region: g.region,
    side: sideOf(g.key),
    vertices: g.vertices,
    triangles: g.triangles,
    min: g.min,
    max: g.max,
    center: g.center,
    explode: g.explode,
    observed: g.observed,
    proposal: g.proposal,
    check: g.check,
  };
}

function addEdge(edges: Edge[], from: string, to: string, kind: Edge["kind"], role: string) {
  edges.push({ from, to, kind, role });
}

export function buildCanonicalModel(manifest: RawManifest): CanonicalModel {
  const nodes: Record<string, GraphNode> = {};
  const edges: Edge[] = [];

  // --- physical parts ---
  for (const g of manifest.groups) {
    const part = partFromGroup(g);
    nodes[part.id] = part;
  }

  // --- joints + mechanical edges ---
  for (const joint of JOINTS) {
    nodes[joint.id] = joint;
    addEdge(edges, joint.parentPart, joint.id, "mechanical", "parent-link");
    addEdge(edges, joint.id, joint.childPart, "mechanical", "child-link");
  }

  // Rigid (no-DOF) structural links that JOINTS doesn't cover: the torso
  // shells move together as one rigid body above the waist joint, so
  // ABDOMEN<->CHEST needs its own edge or the mechanical graph is split in
  // two at the torso (every arm/head path would fail to reach PELVIS).
  addEdge(edges, "ABDOMEN", "CHEST", "mechanical", "rigid-link");
  for (const [envelopePart, jointId] of Object.entries(JOINT_ENVELOPES)) {
    if (nodes[envelopePart]) {
      addEdge(edges, envelopePart, jointId, "mechanical", "envelope-of");
    }
  }

  // --- electrical / compute nodes ---
  for (const en of ELECTRICAL_NODES) {
    nodes[en.id] = en;
  }

  // top-level power + signal backbone
  addEdge(edges, "BATTERY", "PDB", "power", "supplies");
  addEdge(edges, "PDB", "BUS_48V", "power", "distributes");
  addEdge(edges, "PDB", "BUS_5V", "power", "distributes");
  addEdge(edges, "BUS_5V", "MCB", "power", "powers");
  addEdge(edges, "MCB", "IMU", "signal", "reads");
  addEdge(edges, "MCB", "HEAD_COMPUTE", "signal", "ethernet");
  addEdge(edges, "BUS_5V", "HEAD_COMPUTE", "power", "powers");
  addEdge(edges, "HEAD_COMPUTE", "CAMERA", "signal", "reads");
  addEdge(edges, "HEAD_COMPUTE", "MIC_ARRAY", "signal", "reads");
  addEdge(edges, "HEAD_COMPUTE", "SPEAKER", "signal", "drives");
  addEdge(edges, "BUS_5V", "SPEAKER", "power", "powers");

  const CAN_BUSES = ["CAN_LL", "CAN_RL", "CAN_LA", "CAN_RA", "CAN_NP", "CAN_NY", "CAN_W"];
  for (const bus of CAN_BUSES) {
    addEdge(edges, "MCB", bus, "signal", "hosts");
  }

  // --- per-joint driver + encoder ---
  for (const joint of JOINTS) {
    const driverId = jointElectricalId(joint.id, "driver");
    const encoderId = jointElectricalId(joint.id, "encoder");

    nodes[driverId] = {
      kind: "electrical",
      id: driverId,
      label: `${joint.label} driver`,
      role: "driver",
      detail: `Rated ${joint.torqueNm} Nm / ${joint.velocityRadS.toFixed(2)} rad/s.`,
      evidence: joint.evidence,
      atPart: joint.childPart,
    };
    nodes[encoderId] = {
      kind: "electrical",
      id: encoderId,
      label: `${joint.label} encoder`,
      role: "encoder",
      detail: "Joint position feedback.",
      evidence: joint.evidence,
      atPart: joint.childPart,
    };

    addEdge(edges, "BUS_48V", driverId, "power", "supplies");
    addEdge(edges, joint.canBus, driverId, "signal", "commands");
    addEdge(edges, driverId, joint.id, "power", "actuates");
    addEdge(edges, joint.id, encoderId, "signal", "senses");
    addEdge(edges, encoderId, joint.canBus, "signal", "reports");
  }

  // --- subsystems (System Explorer groupings) ---
  const partIds = manifest.groups.map((g) => g.key);
  const jointIds = JOINTS.map((j) => j.id);
  const driverIds = JOINTS.map((j) => jointElectricalId(j.id, "driver"));
  const encoderIds = JOINTS.map((j) => jointElectricalId(j.id, "encoder"));

  const subsystems: Subsystem[] = [
    { id: "structure", label: "Structure", memberIds: partIds },
    { id: "actuation", label: "Actuation", memberIds: [...jointIds, ...driverIds] },
    { id: "sensing", label: "Sensing", memberIds: [...encoderIds, "IMU", "CAMERA", "MIC_ARRAY"] },
    { id: "power", label: "Power", memberIds: ["BATTERY", "PDB", "BUS_48V", "BUS_5V"] },
    { id: "compute", label: "Compute", memberIds: ["MCB", "HEAD_COMPUTE"] },
    { id: "communication", label: "Communication", memberIds: CAN_BUSES },
  ];

  return {
    nodes,
    edges,
    subsystems,
    bodyBounds: manifest.bodyBounds,
    sourceMeta: {
      version: manifest.version,
      source: manifest.source,
      unitStatus: manifest.unitStatus,
      preservation: manifest.preservation,
    },
  };
}

export async function fetchCanonicalModel(): Promise<CanonicalModel> {
  const res = await fetch(`${import.meta.env.BASE_URL}assets/kalki_manifest.json`);
  if (!res.ok) throw new Error(`Failed to load kalki_manifest.json: ${res.status}`);
  const manifest = (await res.json()) as RawManifest;
  return buildCanonicalModel(manifest);
}

/** Convenience: outgoing+incoming edges touching a node, of any kind. */
export function neighborsOf(model: CanonicalModel, nodeId: string, kindFilter?: Edge["kind"]): Edge[] {
  return model.edges.filter((e) => (e.from === nodeId || e.to === nodeId) && (!kindFilter || e.kind === kindFilter));
}

/**
 * Shortest path between two nodes restricted to one edge kind (BFS,
 * unweighted). Returns the ordered edges of the path, or null if the two
 * nodes aren't connected through that kind of edge. This is what "Trace"
 * uses per-layer — deliberately NOT a full connected-subgraph flood, since
 * the whole robot is one connected mechanical tree and a flood would just
 * select everything.
 */
export function shortestPath(model: CanonicalModel, fromId: string, toId: string, kindFilter: Edge["kind"]): Edge[] | null {
  if (fromId === toId) return [];
  const cameFromEdge = new Map<string, Edge>();
  const visited = new Set<string>([fromId]);
  const queue = [fromId];

  while (queue.length) {
    const current = queue.shift()!;
    for (const e of neighborsOf(model, current, kindFilter)) {
      const other = e.from === current ? e.to : e.from;
      if (visited.has(other)) continue;
      visited.add(other);
      cameFromEdge.set(other, e);
      if (other === toId) {
        const path: Edge[] = [e];
        let cursor = current;
        while (cursor !== fromId) {
          const prevEdge = cameFromEdge.get(cursor)!;
          path.unshift(prevEdge);
          cursor = prevEdge.from === cursor ? prevEdge.to : prevEdge.from;
        }
        return path;
      }
      queue.push(other);
    }
  }
  return null;
}

/** The joint immediately "above" a part in the kinematic tree (the joint whose childPart is this part), if any. */
export function drivingJointFor(model: CanonicalModel, partId: string): string | null {
  const joint = model.edges.find((e) => e.kind === "mechanical" && e.role === "child-link" && e.to === partId);
  return joint ? joint.from : null;
}

export interface TraceResult {
  focusPart: string | null;
  mechanical: Edge[] | null;
  power: Edge[] | null;
  signal: Edge[] | null;
}

const ROOT_PART = "PELVIS";
const ROOT_COMPUTE = "MCB";
const ROOT_POWER = "BATTERY";

/**
 * Given any selected node (part, joint, or electrical component), computes
 * up to three independent chains: the mechanical path to the root part
 * (PELVIS), the power path from the nearest joint driver back to the
 * battery, and the signal path from the nearest sensor/encoder back to the
 * motion controller. Each is computed independently so "Trace -> Electrical"
 * never pulls in unrelated mechanical structure and vice versa.
 */
export function traceFromComponent(model: CanonicalModel, nodeId: string): TraceResult {
  const node = model.nodes[nodeId];
  if (!node) return { focusPart: null, mechanical: null, power: null, signal: null };

  let focusPart: string | null = null;
  let joint: string | null = null;

  if (node.kind === "part") {
    focusPart = node.id;
    joint = drivingJointFor(model, node.id);
  } else if (node.kind === "joint") {
    focusPart = node.childPart;
    joint = node.id;
  } else {
    focusPart = node.atPart ?? null;
    joint = focusPart ? drivingJointFor(model, focusPart) : null;
  }

  const mechanical = focusPart ? shortestPath(model, focusPart, ROOT_PART, "mechanical") : null;

  let power: Edge[] | null = null;
  let signal: Edge[] | null = null;

  if (node.kind === "electrical" && (node.role === "driver" || node.role === "encoder")) {
    // already an electrical leaf — trace directly from it
    power = node.role === "driver" ? shortestPath(model, node.id, ROOT_POWER, "power") : null;
    signal = node.role === "encoder" ? shortestPath(model, node.id, ROOT_COMPUTE, "signal") : null;
  } else if (joint) {
    const driverId = `${joint}_DRIVER`;
    const encoderId = `${joint}_ENCODER`;
    if (model.nodes[driverId]) power = shortestPath(model, driverId, ROOT_POWER, "power");
    if (model.nodes[encoderId]) signal = shortestPath(model, encoderId, ROOT_COMPUTE, "signal");
  } else if (node.kind === "electrical") {
    power = shortestPath(model, node.id, ROOT_POWER, "power");
    signal = shortestPath(model, node.id, ROOT_COMPUTE, "signal");
  } else if (focusPart === ROOT_PART) {
    power = shortestPath(model, "PDB", ROOT_POWER, "power");
    signal = shortestPath(model, "MCB", ROOT_COMPUTE, "signal");
  }

  return { focusPart, mechanical, power, signal };
}

/** All node ids touched by a TraceResult, for cross-highlighting in the 3D view + diagrams. */
export function traceNodeIds(trace: TraceResult): Set<string> {
  const ids = new Set<string>();
  if (trace.focusPart) ids.add(trace.focusPart);
  for (const chain of [trace.mechanical, trace.power, trace.signal]) {
    if (!chain) continue;
    for (const e of chain) {
      ids.add(e.from);
      ids.add(e.to);
    }
  }
  return ids;
}
