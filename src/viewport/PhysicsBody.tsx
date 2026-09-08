import { useGLTF } from "@react-three/drei";
import {
  CuboidCollider,
  Physics,
  RigidBody,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  useRevoluteJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { createRef, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { PHYSICS_CHAIN, type PhysicsJointDef } from "../canonical/physicsChain";
import type { CanonicalModel } from "../canonical/types";
import { useTwinStore } from "../state/store";
import { ACTUATOR_EFFICIENCY, BUS_VOLTAGE_V, IDLE_DRAW_W, useTelemetryStore } from "../state/telemetry";
import { KALKI_BODY_URL } from "./KalkiBody";
import { PartVisual } from "./PartVisual";

type Vec3 = [number, number, number];
const midpoint = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

/**
 * Extracts the rotation angle (radians) of a relative quaternion around a
 * known axis. Valid when the quaternion is (close to) a pure rotation about
 * that axis, which a correctly constrained revolute joint guarantees — this
 * is how joint angle is read back for telemetry, since Rapier's compat
 * bindings don't expose a direct joint-angle getter.
 */
function twistAngle(qRel: THREE.Quaternion, axis: THREE.Vector3): number {
  const along = qRel.x * axis.x + qRel.y * axis.y + qRel.z * axis.z;
  return 2 * Math.atan2(along, qRel.w);
}

interface ResolvedBody {
  position: Vec3;
  colliderHalfExtents: Vec3 | null; // null for stage bodies (no collider)
}

/**
 * Places every body in the physics chain at a real, meaningful world
 * position — mesh bodies at the union bounding-box center of the parts they
 * carry (from the canonical model's real min/max), stage bodies at the
 * shared pivot of the joint that outputs them (the same "midpoint of
 * parent/child part centers" heuristic JointSkeleton used, which for
 * stacked same-part joints like hip roll/yaw correctly collapses to one
 * shared pivot — physically right, since those DOF axes really do
 * intersect at ~one point on a real hip/shoulder).
 */
function resolvePositions(model: CanonicalModel): Record<string, ResolvedBody> {
  const result: Record<string, ResolvedBody> = {};

  for (const body of PHYSICS_CHAIN.bodies) {
    if (body.isStage) continue;
    let min: Vec3 = [Infinity, Infinity, Infinity];
    let max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const partId of body.partIds) {
      const part = model.nodes[partId];
      if (!part || part.kind !== "part") continue;
      min = [Math.min(min[0], part.min[0]), Math.min(min[1], part.min[1]), Math.min(min[2], part.min[2])];
      max = [Math.max(max[0], part.max[0]), Math.max(max[1], part.max[1]), Math.max(max[2], part.max[2])];
    }
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const halfExtents: Vec3 = [
      Math.max(0.008, ((max[0] - min[0]) / 2) * 0.85),
      Math.max(0.008, ((max[1] - min[1]) / 2) * 0.85),
      Math.max(0.008, ((max[2] - min[2]) / 2) * 0.85),
    ];
    result[body.id] = { position: center, colliderHalfExtents: halfExtents };
  }

  // Stage bodies: positioned at the pivot of the one joint that outputs them.
  for (const pj of PHYSICS_CHAIN.joints) {
    const bodyDef = PHYSICS_CHAIN.bodies.find((b) => b.id === pj.bodyB);
    if (!bodyDef?.isStage) continue;
    const parentPart = model.nodes[pj.joint.parentPart];
    const childPart = model.nodes[pj.joint.childPart];
    const pivot =
      parentPart?.kind === "part" && childPart?.kind === "part"
        ? midpoint(parentPart.center, childPart.center)
        : ([0, 0, 0] as Vec3);
    result[bodyDef.id] = { position: pivot, colliderHalfExtents: null };
  }

  return result;
}

function jointPivot(model: CanonicalModel, pj: PhysicsJointDef): Vec3 {
  const parentPart = model.nodes[pj.joint.parentPart];
  const childPart = model.nodes[pj.joint.childPart];
  if (parentPart?.kind === "part" && childPart?.kind === "part") {
    return midpoint(parentPart.center, childPart.center);
  }
  return [0, 0, 0];
}

interface JointMotorProps {
  pj: PhysicsJointDef;
  bodyRefs: Record<string, RefObject<RapierRigidBody | null>>;
  positions: Record<string, ResolvedBody>;
  model: CanonicalModel;
}

/**
 * One real revolute joint, motor-driven back toward the rest pose (angle 0)
 * with stiffness/damping scaled from that joint's real rated torque/
 * velocity — stronger real joints (hips, knees) hold pose more firmly than
 * weaker ones (wrists), which is the visible point of using real numbers
 * here rather than a uniform spring constant. Rapier's compat bindings
 * don't expose a direct motor max-force clamp (verified against the
 * installed .d.ts), so the hard torque rating is enforced downstream, in
 * the telemetry estimate, not by the engine itself.
 */
function JointMotor({ pj, bodyRefs, positions, model }: JointMotorProps) {
  const pivot = jointPivot(model, pj);
  const anchorA = sub(pivot, positions[pj.bodyA]?.position ?? [0, 0, 0]);
  const anchorB = sub(pivot, positions[pj.bodyB]?.position ?? [0, 0, 0]);

  const jointRef = useRevoluteJoint(
    bodyRefs[pj.bodyA] as RefObject<RapierRigidBody>,
    bodyRefs[pj.bodyB] as RefObject<RapierRigidBody>,
    [anchorA, anchorB, pj.joint.axis, pj.joint.limitRad]
  );

  const stiffness = Math.max(6, pj.joint.torqueNm * 6);
  const damping = Math.max(2, pj.joint.torqueNm * 1.5);
  const axisVec = useMemo(() => new THREE.Vector3(...pj.joint.axis).normalize(), [pj.joint.axis]);
  const prevAngle = useRef(0);
  const stepCount = useRef(0);

  // Rapier steps the world itself (see the "updateLoop: follow" note on
  // <Physics> — it manages its own useFrame internally); joint motor config
  // and telemetry reads use the library's dedicated step hooks rather than a
  // second, independent useFrame, so they're guaranteed to run in lockstep
  // with the actual simulation step instead of racing it.
  useBeforePhysicsStep(() => {
    jointRef.current?.configureMotor(0, 0, stiffness, damping);
  });

  useAfterPhysicsStep((world) => {
    // Telemetry: throttled to every 4th step — plenty for readable live
    // numbers without a store write every step for 25 joints.
    stepCount.current += 1;
    if (stepCount.current % 4 !== 0) return;

    const bodyA = bodyRefs[pj.bodyA]?.current;
    const bodyB = bodyRefs[pj.bodyB]?.current;
    if (!bodyA || !bodyB) return;

    const rotA = bodyA.rotation();
    const rotB = bodyB.rotation();
    const qA = new THREE.Quaternion(rotA.x, rotA.y, rotA.z, rotA.w);
    const qB = new THREE.Quaternion(rotB.x, rotB.y, rotB.z, rotB.w);
    const qRel = qA.invert().multiply(qB);
    const angle = twistAngle(qRel, axisVec);

    const dt = Math.max(1 / 240, world.timestep * 4); // 4 steps elapsed since last sample
    // Joints with a full ±π range (the wrists) can cross twistAngle's atan2
    // wraparound boundary, producing a spurious huge single-step delta.
    // Clamped to 2x the joint's own rated speed — a real joint physically
    // cannot exceed that, so this rejects the wraparound artifact using the
    // same "trust the real spec" approach already used for torque, not an
    // arbitrary fudge factor.
    const rawVelocity = (angle - prevAngle.current) / dt;
    const velocityCap = pj.joint.velocityRadS * 2;
    const angularVelocity = Math.max(-velocityCap, Math.min(velocityCap, rawVelocity));
    prevAngle.current = angle;

    const estimatedTorqueNm = Math.max(
      -pj.joint.torqueNm,
      Math.min(pj.joint.torqueNm, stiffness * -angle + damping * -angularVelocity)
    );
    const mechPowerW = Math.abs(estimatedTorqueNm * angularVelocity);
    const elecPowerW = mechPowerW / ACTUATOR_EFFICIENCY + IDLE_DRAW_W;
    const currentA = elecPowerW / BUS_VOLTAGE_V;

    useTelemetryStore.getState().setJointTelemetry(pj.joint.id, {
      angleDeg: (angle * 180) / Math.PI,
      velocityRadS: angularVelocity,
      estimatedTorqueNm,
      mechPowerW,
      elecPowerW,
      currentA,
    });
  });

  return null;
}

/**
 * The real physics rig: one <Physics> world, one RigidBody per node in
 * PHYSICS_CHAIN (fixed at the pelvis, dynamic elsewhere), one revolute
 * joint per real JOINTS entry. Visible only at rest pose (explode <= 0.05)
 * — see Scene.tsx for why exploded view stays a separate, simpler kinematic
 * group rather than fighting the physics sim for control of positions.
 */
export function PhysicsBody() {
  const gltf = useGLTF(KALKI_BODY_URL) as unknown as {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.Material>;
  };
  const model = useTwinStore((s) => s.model);

  const bodyRefs = useMemo(() => {
    const refs: Record<string, RefObject<RapierRigidBody | null>> = {};
    for (const body of PHYSICS_CHAIN.bodies) refs[body.id] = createRef<RapierRigidBody>();
    return refs;
  }, []);

  const positions = useMemo(() => (model ? resolvePositions(model) : null), [model]);

  if (!model || !positions) return null;
  const baseMaterial = gltf.materials["Kalki_Body_Material"];

  return (
    <Physics gravity={[0, -9.81, 0]}>
      {PHYSICS_CHAIN.bodies.map((body) => {
        const info = positions[body.id];
        if (!info) return null;
        const isRoot = body.id === "PELVIS";
        const localOffset: Vec3 = [-info.position[0], -info.position[1], -info.position[2]];
        return (
          <RigidBody
            key={body.id}
            ref={bodyRefs[body.id]}
            type={isRoot ? "fixed" : "dynamic"}
            position={info.position}
            colliders={false}
            canSleep={false}
            linearDamping={0.5}
            angularDamping={0.8}
          >
            {info.colliderHalfExtents && <CuboidCollider args={info.colliderHalfExtents} />}
            {body.partIds.map((partId) => {
              const meshNode = gltf.nodes[partId];
              if (!meshNode) return null;
              return (
                <group key={partId} position={localOffset}>
                  <PartVisual name={partId} geometry={meshNode.geometry} baseMaterial={baseMaterial} />
                </group>
              );
            })}
          </RigidBody>
        );
      })}

      {PHYSICS_CHAIN.joints.map((pj) => (
        <JointMotor key={pj.joint.id} pj={pj} bodyRefs={bodyRefs} positions={positions} model={model} />
      ))}
    </Physics>
  );
}
