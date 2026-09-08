import type { CanonicalModel } from "./types";

// Computes explode-view offsets for the four limb chains from each part's
// real bounding box, instead of the manifest's hand-authored `explode`
// vectors — the arm chain's vectors were found identical across all four
// segments (a real bug, fixed by hand earlier), which is exactly the class
// of error this makes structurally impossible: magnitude is derived from
// actual part size along the chain's axis, so consecutive parts can never
// overlap regardless of how the body mesh is re-ingested or re-segmented
// later. Loosely modeled on the "shelf packing" idea from the Core Matter
// Humanoid Atlas reference (pack by real extent, not guessed constants),
// adapted to keep our anatomical/radial 3D explode style rather than
// flattening everything onto one plane.

interface ChainSpec {
  ids: string[]; // ordered proximal -> distal
  axis: [number, number, number]; // unit direction of travel along the limb
  lateral: [number, number, number]; // fixed "away from body" offset, constant for the whole chain
}

const GAP_M = 0.015;

const CHAINS: ChainSpec[] = [
  { ids: ["SHOULDER_R", "UPPER_ARM_R", "ELBOW_R", "FOREARM_R", "HAND_R"], axis: [-1, 0, 0], lateral: [0, 0.02, 0.05] },
  { ids: ["SHOULDER_L", "UPPER_ARM_L", "ELBOW_L", "FOREARM_L", "HAND_L"], axis: [1, 0, 0], lateral: [0, 0.02, 0.05] },
  { ids: ["THIGH_R", "KNEE_R", "SHIN_R", "ANKLE_R", "FOOT_R"], axis: [0, -1, 0], lateral: [-0.14, 0, 0.06] },
  { ids: ["THIGH_L", "KNEE_L", "SHIN_L", "ANKLE_L", "FOOT_L"], axis: [0, -1, 0], lateral: [0.14, 0, 0.06] },
];

/** Half the part's extent projected onto a (unit) axis. */
function halfExtentAlong(min: [number, number, number], max: [number, number, number], axis: [number, number, number]): number {
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return Math.abs(size[0] * axis[0] + size[1] * axis[1] + size[2] * axis[2]) / 2;
}

/**
 * Explode vectors for every part in the four limb chains, packed so
 * consecutive parts along each chain never overlap. Parts not covered by a
 * chain (the torso stack) aren't included — they keep the manifest's
 * hand-authored vectors, which don't follow a simple linear pattern and
 * already don't collide.
 */
export function computeChainExplodeVectors(model: CanonicalModel): Record<string, [number, number, number]> {
  const result: Record<string, [number, number, number]> = {};
  for (const chain of CHAINS) {
    let cumulative = 0;
    let prevHalfExtent = 0;
    chain.ids.forEach((id, i) => {
      const part = model.nodes[id];
      if (!part || part.kind !== "part") return;
      const halfExtent = halfExtentAlong(part.min, part.max, chain.axis);
      cumulative += (i === 0 ? 0 : prevHalfExtent) + GAP_M + halfExtent;
      result[id] = [
        chain.axis[0] * cumulative + chain.lateral[0],
        chain.axis[1] * cumulative + chain.lateral[1],
        chain.axis[2] * cumulative + chain.lateral[2],
      ];
      prevHalfExtent = halfExtent;
    });
  }
  return result;
}
