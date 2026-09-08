import { JOINTS, JOINT_ENVELOPES } from "./joints";
import type { JointNode } from "./types";

/**
 * Derives a proper articulated rigid-body chain from the kinematic/electrical
 * JOINTS model. JOINTS deliberately has several joints share the same
 * parentPart/childPart with a *different* joint (e.g. right_hip_pitch,
 * right_hip_roll, right_hip_yaw all live "at" PELVIS/THIGH_R) because 3
 * stacked DOF sit at one visual joint location. Physically those need 3
 * separate rigid bodies chained in sequence — Rapier has nothing to attach
 * 3 independent revolute joints to otherwise. This file is the single place
 * that resolves that; nothing else re-derives it.
 */

export interface PhysicsBodyDef {
  id: string; // "PELVIS" | a K-part id (e.g. "THIGH_R") | `${jointId}__stage`
  isStage: boolean; // true = anonymous chain link: no mesh, no collider
  partIds: string[]; // K-part ids whose meshes are welded to this body (0 for stage bodies)
}

export interface PhysicsJointDef {
  joint: JointNode;
  bodyA: string; // PhysicsBodyDef.id this joint's parent side attaches to
  bodyB: string; // PhysicsBodyDef.id this joint's child side attaches to
}

export interface PhysicsChain {
  bodies: PhysicsBodyDef[];
  joints: PhysicsJointDef[];
  /** Every one of the 25 K-parts (mesh-carrying or envelope) mapped to the body that carries it. */
  partToBody: Record<string, string>;
}

const ROOT_PART = "PELVIS";
/** ABDOMEN and CHEST are linked only by a rigid mechanical edge (model.ts), not a JOINTS entry — one welded body carries both meshes. */
const RIGID_WELDS: [string, string][] = [["ABDOMEN", "CHEST"]];

function buildChain(): PhysicsChain {
  const bodies: PhysicsBodyDef[] = [];
  const bodyById = new Map<string, PhysicsBodyDef>();
  const addBody = (id: string, isStage: boolean, partIds: string[] = []) => {
    const body: PhysicsBodyDef = { id, isStage, partIds };
    bodies.push(body);
    bodyById.set(id, body);
    return body;
  };

  addBody(ROOT_PART, false, [ROOT_PART]);

  // Track, per part, which body is currently its "output" as we walk JOINTS
  // in order — this is what correctly threads hip_pitch -> hip_roll ->
  // hip_yaw through 3 distinct bodies instead of collapsing them, since each
  // subsequent joint sharing that childPart looks up the cursor left by the
  // previous one rather than a fixed part->body mapping.
  const currentBodyForPart = new Map<string, string>([[ROOT_PART, ROOT_PART]]);

  // CHEST is never a JOINTS childPart (it's linked to ABDOMEN only by the
  // rigid mechanical edge in model.ts) but IS used as a parentPart before
  // ABDOMEN's own joint (waist_yaw) would otherwise alias it — resolved
  // lazily, on first lookup, rather than after the whole walk, since by
  // then it's too late for the joints that need it as a parent.
  const resolvePart = (part: string): string | undefined => {
    if (currentBodyForPart.has(part)) return currentBodyForPart.get(part);
    const weld = RIGID_WELDS.find(([, welded]) => welded === part);
    if (!weld) return undefined;
    const resolved = resolvePart(weld[0]);
    if (resolved) currentBodyForPart.set(part, resolved);
    return resolved;
  };

  // Last JOINTS index touching each childPart — that occurrence is the "real"
  // output (gets the mesh); earlier occurrences are anonymous stage bodies.
  const lastChildIndex = new Map<string, number>();
  JOINTS.forEach((joint, i) => lastChildIndex.set(joint.childPart, i));

  const physicsJoints: PhysicsJointDef[] = [];

  JOINTS.forEach((joint, i) => {
    const parentBodyId = resolvePart(joint.parentPart);
    if (!parentBodyId) {
      throw new Error(`physicsChain: joint "${joint.id}" references parentPart "${joint.parentPart}" before it was resolved`);
    }
    const isFinal = lastChildIndex.get(joint.childPart) === i;
    const outputId = isFinal ? joint.childPart : `${joint.id}__stage`;

    if (!bodyById.has(outputId)) {
      addBody(outputId, !isFinal, isFinal ? [joint.childPart] : []);
    }
    currentBodyForPart.set(joint.childPart, outputId);
    physicsJoints.push({ joint, bodyA: parentBodyId, bodyB: outputId });
  });

  // resolvePart already lazily mapped the welded part (e.g. CHEST) to its
  // target body's id during the walk above — this just adds its mesh to
  // that body's visual partIds, which resolvePart alone doesn't do.
  for (const [a, b] of RIGID_WELDS) {
    const target = bodyById.get(resolvePart(a)!);
    if (!target) throw new Error(`physicsChain: rigid weld references unresolved part "${a}"`);
    target.partIds.push(b);
  }

  // Envelope covers (ELBOW_*, KNEE_*, ANKLE_*) move with the limb they sit on.
  for (const [envelopePart, jointId] of Object.entries(JOINT_ENVELOPES)) {
    const hostJoint = JOINTS.find((j) => j.id === jointId);
    if (!hostJoint) throw new Error(`physicsChain: JOINT_ENVELOPES references unknown joint "${jointId}"`);
    const hostBodyId = currentBodyForPart.get(hostJoint.childPart);
    if (!hostBodyId) throw new Error(`physicsChain: envelope host body for "${envelopePart}" not resolved`);
    const hostBody = bodyById.get(hostBodyId)!;
    hostBody.partIds.push(envelopePart);
    currentBodyForPart.set(envelopePart, hostBodyId);
  }

  const partToBody: Record<string, string> = {};
  for (const [part, bodyId] of currentBodyForPart.entries()) {
    partToBody[part] = bodyId;
  }

  return { bodies, joints: physicsJoints, partToBody };
}

export const PHYSICS_CHAIN: PhysicsChain = buildChain();
