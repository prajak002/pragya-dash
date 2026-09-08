import type { ElectricalNode } from "./types";

// Proposed electrical/compute architecture, shaped directly on Asimov-1's
// real stack: a Power Distribution Board (PDB) sitting on a Motion Control
// Board (MCB, a Radxa CM5 carrier) exposing 6 CAN-via-SPI-bridge buses plus
// the real Asimov-1 port map (LL/RL/LA/RA/NP/NY/W), an onboard IMU on the
// MCB, and a head-mounted RPi5-class media/network unit for camera/mic/
// speaker — reachable from the MCB over Ethernet. This shape is copied from
// electrical/README.md in the asimov-1 repo; it is not derived from the
// Kalki mesh, which carries no electrical information at all.

const asimov = (note: string) => ({ class: "asimov-1-reference" as const, note });
const illustrative = (note: string) => ({ class: "illustrative" as const, note });

function e(
  id: string,
  label: string,
  role: ElectricalNode["role"],
  detail: string,
  evidence: ElectricalNode["evidence"],
  atPart?: string
): ElectricalNode {
  return { kind: "electrical", id, label, role, detail, evidence, atPart };
}

export const ELECTRICAL_NODES: ElectricalNode[] = [
  e("BATTERY", "Battery pack", "power-source", "Primary pack, supplies the PDB via an XT90(2+2) connector.", asimov("Asimov-1 electrical/README.md power input"), "PELVIS"),
  e("PDB", "Power Distribution Board", "power-distribution", "Sits atop the MCB in a 2-board stack; routes 5V to the MCB and switched power to each limb bus.", asimov("Asimov-1 Power Distribution Board"), "PELVIS"),
  e("BUS_48V", "Actuator power rail", "power-rail", "Illustrative high-voltage rail feeding joint drivers.", illustrative("Kalki carries no rated actuator voltage; rail shown for architecture only.")),
  e("BUS_5V", "Logic power rail", "power-rail", "5V logic/compute rail routed from the PDB.", asimov("Asimov-1 PDB routes 5V to the MCB")),
  e("MCB", "Motion Control Board", "controller", "Radxa CM5 carrier board; hosts the onboard IMU and all motor communication buses.", asimov("Asimov-1 Motion Control Board"), "PELVIS"),
  e("IMU", "IMU (6-DOF)", "sensor", "LSM6DSV IMU, located at the bottom of the MCB.", asimov("Asimov-1 electrical/README.md — LSM6DSV IMU"), "PELVIS"),

  e("CAN_LL", "CAN bus · LL", "bus", "Left leg joint bus.", asimov("Asimov-1 port map: LL = left leg bus")),
  e("CAN_RL", "CAN bus · RL", "bus", "Right leg joint bus.", asimov("Asimov-1 port map: RL = right leg bus")),
  e("CAN_LA", "CAN bus · LA", "bus", "Left arm joint bus.", asimov("Asimov-1 port map: LA = left arm bus")),
  e("CAN_RA", "CAN bus · RA", "bus", "Right arm joint bus.", asimov("Asimov-1 port map: RA = right arm bus")),
  e("CAN_NP", "CAN bus · NP", "bus", "Neck pitch connection on the torso bus.", asimov("Asimov-1 port map: NP = neck pitch")),
  e("CAN_NY", "CAN bus · NY", "bus", "Neck yaw connection on the torso bus.", asimov("Asimov-1 port map: NY = neck yaw")),
  e("CAN_W", "CAN bus · W", "bus", "Waist yaw connection on the torso bus.", asimov("Asimov-1 port map: W = waist yaw")),

  e("HEAD_COMPUTE", "Media/network unit (RPi5-class)", "compute", "Head-mounted compute for camera, stereo mic array and speaker; reaches the MCB over Ethernet.", asimov("Asimov-1 Media Unit — RPi5 in the head"), "HEAD"),
  e("CAMERA", "Monocular camera", "sensor", "2MP forward camera.", asimov("Asimov-1 spec: 2MP monocular camera"), "HEAD"),
  e("MIC_ARRAY", "Stereo microphone array", "sensor", "Stereo mic input to the head audio IC.", asimov("Asimov-1 spec: stereo microphone array"), "HEAD"),
  e("SPEAKER", "Speaker", "sensor", "10W 4-ohm speaker driven from the torso audio IC.", asimov("Asimov-1 spec: 10W 4-ohm speaker"), "CHEST"),
];

/** Per-joint driver + encoder pairs, generated for all 25 joints in joints.ts. */
export function jointElectricalId(jointId: string, part: "driver" | "encoder") {
  return `${jointId}_${part.toUpperCase()}`;
}
