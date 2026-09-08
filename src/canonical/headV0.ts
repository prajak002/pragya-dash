// Kalki V0 — Stage 1 (Head) real CAD-sourced parts, from the PRAGYA
// "Kalki V0 | Stage 1 – Head (3D Printable Parts)" reference sheet.
//
// Unlike the rest of the canonical model (an AI-generated concept mesh,
// re-segmented and reference-informed by Asimov-1 for the mechanical/
// electrical layers), this is real, dimensioned, 3D-printable open-hardware
// CAD — the actual first stage of the sovereign "Kalki V0" build. Kept as
// its own small dataset rather than merged into the 25-part body model:
// different project, different evidentiary status, shouldn't be conflated.

export interface HeadV0Part {
  id: string; // matches assets/head_v0/<id>.glb
  name: string;
  subtitle: string;
  widthMm: number; // stated width from the reference sheet
  heightMm: number; // shared head height, 310mm for all 4
  keyFeatures: string[];
}

export const HEAD_V0_HEIGHT_MM = 310;

export const HEAD_V0_PARTS: HeadV0Part[] = [
  {
    id: "H1",
    name: "Front Visor Shell",
    subtitle: "Glossy front visor and facial shell",
    widthMm: 180,
    heightMm: HEAD_V0_HEIGHT_MM,
    keyFeatures: [
      "Glossy visor surface (tinted)",
      "Mounting tabs and screw bosses",
      "2.5–3 mm shell thickness",
      "Mating edges for H3/H4 side shells",
      "Clearance for cameras and sensors",
      "Lightweight 3D printable design",
    ],
  },
  {
    id: "H2",
    name: "Rear Head Shell",
    subtitle: "Cranial cover with ventilation",
    widthMm: 180,
    heightMm: HEAD_V0_HEIGHT_MM,
    keyFeatures: [
      "Covers top and rear of head",
      "Ventilation slots",
      "Internal mounting bosses",
      "2.5–3 mm shell thickness",
      "Mating edges for H3/H4 side shells",
      "Neck interface opening",
    ],
  },
  {
    id: "H3",
    name: "Left Side Shell",
    subtitle: "Left temporal shell (surrounds sensor module)",
    widthMm: 160,
    heightMm: HEAD_V0_HEIGHT_MM,
    keyFeatures: [
      "Surrounds left sensor/ear module",
      "Mounting points and alignment pins",
      "2.5–3 mm shell thickness",
      "Mating edges for H1 visor and H2 rear shell",
      "Clearance for sensor module (not included)",
      "Cable routing space",
    ],
  },
  {
    id: "H4",
    name: "Right Side Shell",
    subtitle: "Right temporal shell (surrounds sensor module)",
    widthMm: 160,
    heightMm: HEAD_V0_HEIGHT_MM,
    keyFeatures: [
      "Surrounds right sensor/ear module",
      "Mounting points and alignment pins",
      "2.5–3 mm shell thickness",
      "Mating edges for H1 visor and H2 rear shell",
      "Clearance for sensor module (not included)",
      "Cable routing space",
    ],
  },
];

export const HEAD_V0_PRINT_RECOMMENDATIONS = {
  material: "PLA+ / PETG / ABS / Nylon",
  layerHeight: "0.16 – 0.20 mm",
  infill: "15 – 25% (gyroid)",
  postProcessing: "Sanding, primer, paint",
  fasteners: "M2.5 / M3 inserts + screws",
};

export const HEAD_V0_URL = (id: string) => `${import.meta.env.BASE_URL}assets/head_v0/${id}.glb`;
