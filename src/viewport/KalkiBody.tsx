import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useTwinStore } from "../state/store";
import { PartVisual } from "./PartVisual";

export const KALKI_BODY_URL = `${import.meta.env.BASE_URL}assets/kalki_body.glb`;

interface ExplodedPartProps {
  name: string;
  geometry: THREE.BufferGeometry;
  baseMaterial: THREE.Material;
  explodeDir: [number, number, number];
}

/**
 * The exploded-inspection view: parts fly apart along their manifest-defined
 * explode vector, driven purely by the explode slider — this is a diagram,
 * not physics, so it stays a simple animated `position`, independent of the
 * physics rig in PhysicsBody.tsx.
 */
function ExplodedPart({ name, geometry, baseMaterial, explodeDir }: ExplodedPartProps) {
  const groupRef = useRef<THREE.Group>(null);
  const explodeCurrent = useRef(0);

  useFrame((_, delta) => {
    const explodeTarget = useTwinStore.getState().explode;
    explodeCurrent.current += (explodeTarget - explodeCurrent.current) * Math.min(1, delta * 4);
    groupRef.current?.position.set(
      explodeDir[0] * explodeCurrent.current,
      explodeDir[1] * explodeCurrent.current,
      explodeDir[2] * explodeCurrent.current
    );
  });

  return (
    <group ref={groupRef}>
      <PartVisual name={name} geometry={geometry} baseMaterial={baseMaterial} />
    </group>
  );
}

export function KalkiBody() {
  const gltf = useGLTF(KALKI_BODY_URL) as unknown as {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.Material>;
  };
  const model = useTwinStore((s) => s.model);
  if (!model) return null;

  const baseMaterial = gltf.materials["Kalki_Body_Material"];
  const parts = Object.values(model.nodes).filter((n): n is Extract<typeof n, { kind: "part" }> => n.kind === "part");

  return (
    <group name="kalki-body-exploded">
      {parts.map((part) => {
        const meshNode = gltf.nodes[part.id];
        if (!meshNode) return null;
        return (
          <ExplodedPart
            key={part.id}
            name={part.id}
            geometry={meshNode.geometry}
            baseMaterial={baseMaterial}
            explodeDir={part.explode}
          />
        );
      })}
    </group>
  );
}

useGLTF.preload(KALKI_BODY_URL);
