import type { JointNode, Side } from "./types";

// Proposed 25-DOF skeleton overlaid on Kalki's 25 body-shell regions.
//
// Numbers for the 23 joints that have a direct 1:1 match in Asimov-1's real
// URDF (sim-model/urdf/asimov_1.urdf) are copied verbatim: axis, angle limit
// (rad), rated torque (Nm) and rated velocity (rad/s). Two joints — neck
// yaw/pitch — have no real revolute counterpart: Asimov-1's own README
// claims "2 DOF neck (neck yaw, neck pitch)" but its shipped URDF marks both
// neck joints as `fixed`. We keep the neck actuated here (matching the
// README's stated spec and Kalki's own COLLAR/HEAD split) but tag it
// `illustrative` and say so — rather than quietly picking a side of that
// discrepancy.

const asimov = (note: string) => ({ class: "asimov-1-reference" as const, note });
const illustrative = (note: string) => ({ class: "illustrative" as const, note });

function j(
  id: string,
  label: string,
  parentPart: string,
  childPart: string,
  side: Side,
  axis: [number, number, number],
  limitRad: [number, number],
  torqueNm: number,
  velocityRadS: number,
  canBus: string,
  evidence: JointNode["evidence"]
): JointNode {
  return {
    kind: "joint",
    id,
    label,
    parentPart,
    childPart,
    side,
    axis,
    limitRad,
    torqueNm,
    velocityRadS,
    canBus,
    evidence,
  };
}

export const JOINTS: JointNode[] = [
  j(
    "waist_yaw",
    "Waist yaw",
    "PELVIS",
    "ABDOMEN",
    "center",
    [0, 0, 1],
    [-1.570796, 1.570796],
    40,
    12.57,
    "CAN_W",
    asimov("Asimov-1 waist_yaw_joint")
  ),
  j(
    "neck_yaw",
    "Neck yaw",
    "CHEST",
    "COLLAR",
    "center",
    [0, 0, 1],
    [-1.396, 1.396],
    3,
    6,
    "CAN_NY",
    illustrative(
      "Asimov-1's README specs 2 actuated neck DOF, but its own shipped URDF marks both neck joints fixed. Range/torque here are a reasonable placeholder, not sourced from either document."
    )
  ),
  j(
    "neck_pitch",
    "Neck pitch",
    "COLLAR",
    "HEAD",
    "center",
    [1, 0, 0],
    [-0.35, 0.7],
    3,
    6,
    "CAN_NP",
    illustrative(
      "Asimov-1's README specs 2 actuated neck DOF, but its own shipped URDF marks both neck joints fixed. Range/torque here are a reasonable placeholder, not sourced from either document."
    )
  ),

  // Right arm
  j("right_shoulder_pitch", "R shoulder pitch", "CHEST", "SHOULDER_R", "R", [0, -1, 0], [-0.872665, 3.141593], 30, 3.98, "CAN_RA", asimov("Asimov-1 right_shoulder_pitch_joint")),
  j("right_shoulder_roll", "R shoulder roll", "SHOULDER_R", "UPPER_ARM_R", "R", [-1, 0, 0], [0, 1.570796], 25, 12.25, "CAN_RA", asimov("Asimov-1 right_shoulder_roll_joint")),
  j("right_shoulder_yaw", "R shoulder yaw", "UPPER_ARM_R", "UPPER_ARM_R", "R", [0, 0, -1], [-1.570796, 1.570796], 20, 5.45, "CAN_RA", asimov("Asimov-1 right_shoulder_yaw_joint")),
  j("right_elbow", "R elbow", "UPPER_ARM_R", "FOREARM_R", "R", [0, 1, 0], [-2.443461, 0], 12, 9.32, "CAN_RA", asimov("Asimov-1 right_elbow_joint")),
  j("right_wrist_yaw", "R wrist yaw", "FOREARM_R", "HAND_R", "R", [0.766044, 0, -0.642788], [-3.141593, 3.141593], 12, 9.32, "CAN_RA", asimov("Asimov-1 right_wrist_yaw_joint")),

  // Left arm (mirrored)
  j("left_shoulder_pitch", "L shoulder pitch", "CHEST", "SHOULDER_L", "L", [0, 1, 0], [-3.141593, 0.872665], 30, 3.98, "CAN_LA", asimov("Asimov-1 left_shoulder_pitch_joint")),
  j("left_shoulder_roll", "L shoulder roll", "SHOULDER_L", "UPPER_ARM_L", "L", [-1, 0, 0], [-1.570796, 0], 25, 12.25, "CAN_LA", asimov("Asimov-1 left_shoulder_roll_joint")),
  j("left_shoulder_yaw", "L shoulder yaw", "UPPER_ARM_L", "UPPER_ARM_L", "L", [0, 0, -1], [-1.570796, 1.570796], 20, 5.45, "CAN_LA", asimov("Asimov-1 left_shoulder_yaw_joint")),
  j("left_elbow", "L elbow", "UPPER_ARM_L", "FOREARM_L", "L", [0, -1, 0], [0, 2.443461], 12, 9.32, "CAN_LA", asimov("Asimov-1 left_elbow_joint")),
  j("left_wrist_yaw", "L wrist yaw", "FOREARM_L", "HAND_L", "L", [0.766044, 0, -0.642788], [-3.141593, 3.141593], 12, 9.32, "CAN_LA", asimov("Asimov-1 left_wrist_yaw_joint")),

  // Right leg
  j("right_hip_pitch", "R hip pitch", "PELVIS", "THIGH_R", "R", [0, -1, 0], [-1, 2.094395], 45, 12.57, "CAN_RL", asimov("Asimov-1 right_hip_pitch_joint")),
  j("right_hip_roll", "R hip roll", "THIGH_R", "THIGH_R", "R", [1, 0, 0], [-0.785398, 0.785398], 45, 3.98, "CAN_RL", asimov("Asimov-1 right_hip_roll_joint")),
  j("right_hip_yaw", "R hip yaw", "THIGH_R", "THIGH_R", "R", [0, 0, -1], [-0.785398, 0.785398], 28, 5.45, "CAN_RL", asimov("Asimov-1 right_hip_yaw_joint")),
  j("right_knee", "R knee", "THIGH_R", "SHIN_R", "R", [0, -1, 0], [-1.5, 0], 45, 12.25, "CAN_RL", asimov("Asimov-1 right_knee_joint")),
  j("right_ankle_pitch", "R ankle pitch", "SHIN_R", "FOOT_R", "R", [0, -1, 0], [-0.35, 0.35], 40, 9.32, "CAN_RL", asimov("Asimov-1 right_ankle_pitch_joint")),
  j("right_ankle_roll", "R ankle roll", "SHIN_R", "FOOT_R", "R", [-1, 0, 0], [-0.1, 0.1], 17, 9.32, "CAN_RL", asimov("Asimov-1 right_ankle_roll_joint")),

  // Left leg (mirrored)
  j("left_hip_pitch", "L hip pitch", "PELVIS", "THIGH_L", "L", [0, 1, 0], [-2.094395, 1], 45, 12.57, "CAN_LL", asimov("Asimov-1 left_hip_pitch_joint")),
  j("left_hip_roll", "L hip roll", "THIGH_L", "THIGH_L", "L", [1, 0, 0], [-0.785398, 0.785398], 45, 3.98, "CAN_LL", asimov("Asimov-1 left_hip_roll_joint")),
  j("left_hip_yaw", "L hip yaw", "THIGH_L", "THIGH_L", "L", [0, 0, -1], [-0.785398, 0.785398], 28, 5.45, "CAN_LL", asimov("Asimov-1 left_hip_yaw_joint")),
  j("left_knee", "L knee", "THIGH_L", "SHIN_L", "L", [0, 1, 0], [0, 1.5], 45, 12.25, "CAN_LL", asimov("Asimov-1 left_knee_joint")),
  j("left_ankle_pitch", "L ankle pitch", "SHIN_L", "FOOT_L", "L", [0, 1, 0], [-0.35, 0.35], 40, 9.32, "CAN_LL", asimov("Asimov-1 left_ankle_pitch_joint")),
  j("left_ankle_roll", "L ankle roll", "SHIN_L", "FOOT_L", "L", [-1, 0, 0], [-0.1, 0.1], 17, 9.32, "CAN_LL", asimov("Asimov-1 left_ankle_roll_joint")),
];

/** Envelope shell parts that visually cover a joint but carry no independent DOF of their own (ELBOW_*, KNEE_*, ANKLE_* covers). */
export const JOINT_ENVELOPES: Record<string, string> = {
  ELBOW_R: "right_elbow",
  ELBOW_L: "left_elbow",
  KNEE_R: "right_knee",
  KNEE_L: "left_knee",
  ANKLE_R: "right_ankle_pitch",
  ANKLE_L: "left_ankle_pitch",
};
