import { create } from "zustand";
import { JOINTS } from "../canonical/joints";

export interface JointTelemetry {
  angleDeg: number;
  velocityRadS: number;
  estimatedTorqueNm: number;
  mechPowerW: number;
  elecPowerW: number;
  currentA: number;
}

interface TelemetryState {
  joints: Record<string, JointTelemetry>;
  setJointTelemetry(jointId: string, data: JointTelemetry): void;
}

// Physically-motivated but explicitly-assumed constants — named here so
// they're never confused with measured values. See PhysicsBody.tsx's
// JointMotor for how these feed from the live simulation.
export const ACTUATOR_EFFICIENCY = 0.75; // typical geared BLDC actuator, not measured
export const IDLE_DRAW_W = 1.5; // small standby draw per driver so a resting joint doesn't read exactly 0 W
export const BUS_VOLTAGE_V = 48; // matches BUS_48V in electrical.ts

export const useTelemetryStore = create<TelemetryState>((set) => ({
  joints: {},
  setJointTelemetry(jointId, data) {
    set((s) => ({ joints: { ...s.joints, [jointId]: data } }));
  },
}));

/** Driver/encoder ids follow `${jointId}_DRIVER` / `${jointId}_ENCODER` (electrical.ts's jointElectricalId) — this reverses that. */
export function jointIdFromElectricalId(id: string): string | null {
  if (id.endsWith("_DRIVER")) return id.slice(0, -"_DRIVER".length);
  if (id.endsWith("_ENCODER")) return id.slice(0, -"_ENCODER".length);
  return null;
}

/** Total live system power draw across all 25 joints, in watts. */
export function totalPowerW(joints: Record<string, JointTelemetry>): number {
  let total = 0;
  for (const j of JOINTS) {
    total += joints[j.id]?.elecPowerW ?? 0;
  }
  return total;
}

/** Live power draw summed per CAN bus, in watts. */
export function busPowerW(joints: Record<string, JointTelemetry>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const j of JOINTS) {
    const w = joints[j.id]?.elecPowerW ?? 0;
    result[j.canBus] = (result[j.canBus] ?? 0) + w;
  }
  return result;
}
