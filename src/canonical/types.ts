// Canonical engineering model — shared types.
//
// This is the single source of truth the whole app reads from: the 3D
// viewport, every diagram layer (mechanical/electrical/power/signal), the
// component inspector, and the trace system all derive their view from the
// same `nodes` + `edges` graph built in canonical/model.ts. Nothing about a
// connection is hardcoded twice.

export type Side = "L" | "R" | "center";

export type NodeKind = "part" | "joint" | "electrical";

export type EvidenceClass =
  | "observed" // measured/derived directly from the Kalki source mesh
  | "asimov-1-reference" // copied 1:1 from Asimov-1's real, published spec
  | "illustrative"; // a reasonable placeholder with no direct source — flagged as such

export interface EvidenceNote {
  class: EvidenceClass;
  note: string;
}

/** A physical shell region — one of the 25 real K01..K25 body groups ingested from the Kalki mesh. */
export interface PartNode {
  kind: "part";
  id: string; // e.g. "HEAD" — matches the glTF mesh/node name from kalki_body.glb
  groupId: string; // "K01"
  name: string;
  region: string;
  side: Side;
  vertices: number;
  triangles: number;
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  explode: [number, number, number];
  observed: string;
  proposal: string;
  check: string;
}

/** A proposed rotary joint. Real numbers are copied from Asimov-1's URDF where a 1:1 joint exists; the two neck DOF are illustrative — the Asimov-1 README claims them but its own shipped URDF marks them fixed, which we surface rather than silently resolve. */
export interface JointNode {
  kind: "joint";
  id: string; // e.g. "right_shoulder_pitch"
  label: string;
  parentPart: string; // PartNode id
  childPart: string; // PartNode id
  side: Side;
  axis: [number, number, number];
  limitRad: [number, number];
  torqueNm: number;
  velocityRadS: number;
  canBus: string; // ElectricalNode id of the CAN bus this joint's driver hangs off
  evidence: EvidenceNote;
}

export type ElectricalRole =
  | "power-source"
  | "power-distribution"
  | "power-rail"
  | "controller"
  | "bus"
  | "compute"
  | "driver"
  | "encoder"
  | "sensor";

export interface ElectricalNode {
  kind: "electrical";
  id: string;
  label: string;
  role: ElectricalRole;
  detail: string;
  evidence: EvidenceNote;
  /** Where this notionally sits on the body, for 3D placement of compute/bus badges. */
  atPart?: string;
}

export type GraphNode = PartNode | JointNode | ElectricalNode;

export type EdgeKind = "mechanical" | "power" | "signal";

export interface Edge {
  from: string;
  to: string;
  kind: EdgeKind;
  /** Sub-classification for styling/labels, e.g. "drives", "senses", "supplies", "envelope-of". */
  role: string;
}

export interface Subsystem {
  id: string;
  label: string;
  memberIds: string[];
}

export interface CanonicalModel {
  nodes: Record<string, GraphNode>;
  edges: Edge[];
  subsystems: Subsystem[];
  bodyBounds: [[number, number, number], [number, number, number]];
  sourceMeta: {
    version: string;
    source: string;
    unitStatus: string;
    preservation: string;
  };
}
