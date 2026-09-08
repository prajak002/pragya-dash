// Kalki "Four Configurations" gallery — four illustrative hardware variants
// rendered from a single merged GLB (public/assets/kalki_four_configurations.glb).
// Unlike headV0.ts (real, dimensioned, sourced CAD), there is no spec sheet
// backing these descriptions: they're proposed use-case framings for each
// named variant, not measurements. Keep the "illustrative" evidence class
// honest rather than implying these are validated products.

export interface KalkiConfiguration {
  id: string; // matches the GLB's named root node
  label: string;
  tagline: string;
  useCase: string;
  keyFeatures: string[];
  materials: string;
}

export const KALKI_CONFIGURATIONS: KalkiConfiguration[] = [
  {
    id: "Kalki_Weave",
    label: "Kalki Weave",
    tagline: "Soft-shell everyday form",
    useCase: "General-purpose indoor assistance — home, office, and lab environments where a low-intimidation profile matters.",
    keyFeatures: [
      "Fabric-covered soft shell over the structural frame",
      "Matte finish, minimal visible seams",
      "Full 25-DOF mobility retained under the shell",
    ],
    materials: "Woven textile outer layer, printed/molded frame underneath",
  },
  {
    id: "Kinetic_Armor",
    label: "Kinetic Armor",
    tagline: "Hard-shell protective form",
    useCase: "Environments with incidental impact risk — workshops, warehouses, outdoor fieldwork — where the shell itself needs to take hits.",
    keyFeatures: [
      "Rigid segmented plate shell over every major body region",
      "Exposed joint venting for actuator cooling",
      "Higher shell thickness at impact-prone regions (shoulders, forearms, shins)",
    ],
    materials: "Rigid polymer or composite plate armor, joint-following segmentation",
  },
  {
    id: "Hospitality",
    label: "Hospitality",
    tagline: "Light, approachable service form",
    useCase: "Front-of-house and guest-facing roles — reception, hospitality, retail — where visual approachability matters most.",
    keyFeatures: [
      "Light-colored, smooth-finish shell",
      "Reduced visual bulk relative to Kinetic Armor",
      "Optimized for close-proximity human interaction",
    ],
    materials: "Smooth painted polymer shell, minimal exposed mechanism",
  },
  {
    id: "Field_Warrior",
    label: "Field Warrior",
    tagline: "Rugged outdoor/tactical form",
    useCase: "Outdoor and rough-terrain deployment — inspection, security, disaster response — prioritizing durability over aesthetics.",
    keyFeatures: [
      "Camouflage-pattern rugged shell",
      "Reinforced lower-body plating for terrain contact",
      "Weather- and abrasion-resistant finish",
    ],
    materials: "Reinforced composite shell, textured/patterned coating",
  },
];

export const KALKI_CONFIGURATIONS_BY_ID: Record<string, KalkiConfiguration> = Object.fromEntries(
  KALKI_CONFIGURATIONS.map((c) => [c.id, c]),
);
