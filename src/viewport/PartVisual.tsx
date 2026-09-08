import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useTwinStore } from "../state/store";

/**
 * The material/selection/hover/trace-highlight/material-mode logic for one
 * Kalki body part — shared between the exploded-kinematic view
 * (KalkiBody.tsx, which wraps this in a position-animated group) and the
 * physics-driven view (PhysicsBody.tsx, which wraps this in a RigidBody).
 * This component itself never sets position — whichever parent renders it
 * owns that.
 */
export interface PartVisualProps {
  name: string;
  geometry: THREE.BufferGeometry;
  baseMaterial: THREE.Material;
}

export function traceHasNode(name: string): boolean {
  const { trace } = useTwinStore.getState();
  if (!trace) return false;
  if (trace.focusPart === name) return true;
  for (const chain of [trace.mechanical, trace.power, trace.signal]) {
    if (!chain) continue;
    for (const e of chain) {
      if (e.from === name || e.to === name) return true;
    }
  }
  return false;
}

export function PartVisual({ name, geometry, baseMaterial }: PartVisualProps) {
  const material = useMemo(() => (baseMaterial as THREE.MeshStandardMaterial).clone(), [baseMaterial]);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const { selectedId, hoveredId, materialMode } = useTwinStore.getState();
    const mat = material as THREE.MeshStandardMaterial;
    const isSelected = selectedId === name;
    const isHovered = hoveredId === name;
    const isTraced = traceHasNode(name);

    const glow = isSelected ? 0.6 : isTraced ? 0.32 : isHovered ? 0.16 : 0;
    mat.emissive.setRGB(glow * 0.62, glow * 0.5, glow);
    mat.wireframe = materialMode === "wire";
    mat.transparent = materialMode === "xray";
    mat.opacity = materialMode === "xray" ? 0.22 : 1;
    mat.depthWrite = materialMode !== "xray";
  });

  return (
    <mesh
      ref={meshRef}
      name={name}
      geometry={geometry}
      material={material}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        if (useTwinStore.getState().layer === "configurations") return;
        e.stopPropagation();
        useTwinStore.getState().hover(name);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        if (useTwinStore.getState().layer === "configurations") return;
        e.stopPropagation();
        useTwinStore.getState().hover(null);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        if (useTwinStore.getState().layer === "configurations") return;
        e.stopPropagation();
        useTwinStore.getState().select(name);
      }}
    />
  );
}
