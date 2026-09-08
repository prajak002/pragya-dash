import type { CanonicalModel, ElectricalNode, EvidenceNote, GraphNode } from "./types";
import { neighborsOf } from "./model";
import { labelOf } from "../diagrams/layout";

// Derives "hookup-guide" style pinout callouts for a board node directly from
// the canonical model's edges — nothing here is hand-authored per board, so
// a callout can never drift out of sync with the electrical graph. Board
// nodes with many same-kind neighbors (e.g. MCB hosting 7 CAN buses) get
// collapsed into one grouped callout, matching how a real hookup guide
// numbers a connector bank once rather than pin-by-pin.

const BOARD_ROLES: ElectricalNode["role"][] = ["controller", "power-distribution", "compute"];

export function isBoardNode(node: GraphNode | undefined): boolean {
  return !!node && node.kind === "electrical" && BOARD_ROLES.includes(node.role);
}

export interface BoardCallout {
  num: number;
  label: string;
  detail: string;
  direction: "in" | "out";
  evidence: EvidenceNote;
}

function busGroupLabel(count: number): string {
  return `CAN bus header${count > 1 ? "s" : ""} (×${count})`;
}

export function boardCallouts(model: CanonicalModel, boardId: string): BoardCallout[] {
  const edges = neighborsOf(model, boardId).filter((e) => e.kind === "power" || e.kind === "signal");

  interface Group {
    label: string;
    detail: string;
    direction: "in" | "out";
    evidence: EvidenceNote;
    order: number;
  }
  const groups = new Map<string, Group>();
  let order = 0;

  for (const e of edges) {
    const incoming = e.to === boardId;
    const otherId = incoming ? e.from : e.to;
    const other = model.nodes[otherId];
    if (!other || other.kind === "part") continue;

    const isBus = other.kind === "electrical" && other.role === "bus";
    const key = isBus ? `bus:${e.role}:${incoming ? "in" : "out"}` : `${otherId}`;

    if (isBus) {
      const existing = groups.get(key);
      if (existing) {
        const n = Number(existing.detail.match(/×(\d+)/)?.[1] ?? "1") + 1;
        existing.detail = `${busGroupLabel(n)} — one per limb/torso bus.`;
        existing.label = busGroupLabel(n);
      } else {
        groups.set(key, {
          label: busGroupLabel(1),
          detail: `${busGroupLabel(1)} — one per limb/torso bus.`,
          direction: incoming ? "in" : "out",
          evidence: other.evidence,
          order: order++,
        });
      }
      continue;
    }

    if (!groups.has(key)) {
      groups.set(key, {
        label: labelOf(other),
        detail: other.kind === "electrical" ? other.detail : "",
        direction: incoming ? "in" : "out",
        evidence: other.evidence,
        order: order++,
      });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map((g, i) => ({ num: i + 1, label: g.label, detail: g.detail, direction: g.direction, evidence: g.evidence }));
}
