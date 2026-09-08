import { Text, useAnimations, useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { KALKI_CONFIGURATIONS } from "../canonical/configurations";
import { useTwinStore } from "../state/store";

const CONFIGS_URL = `${import.meta.env.BASE_URL}assets/kalki_four_configurations.glb`;

const LABELS: Record<string, string> = Object.fromEntries(KALKI_CONFIGURATIONS.map((c) => [c.id, c.label]));

function ConfigNodes({ nodes }: { nodes: Record<string, THREE.Object3D> }) {
  const selectedId = useTwinStore((s) => s.selectedId);
  const hoveredId = useTwinStore((s) => s.hoveredId);
  const select = useTwinStore((s) => s.select);
  const hover = useTwinStore((s) => s.hover);

  return (
    <>
      {Object.entries(LABELS).map(([nodeName, label]) => {
        const node = nodes[nodeName];
        if (!node) return null;
        const isActive = selectedId === nodeName || hoveredId === nodeName;
        return (
          <group key={nodeName}>
            <primitive
              object={node}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                select(nodeName);
              }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                hover(nodeName);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                hover(null);
                document.body.style.cursor = "auto";
              }}
            />
            <Text
              position={[node.position.x, 2.05, node.position.z]}
              fontSize={0.09}
              color={isActive ? "#a994ff" : "#7dd3e3"}
              anchorX="center"
              anchorY="middle"
            >
              {label}
            </Text>
          </group>
        );
      })}
    </>
  );
}

/**
 * The four-configuration turntable gallery. Shares the app's single
 * persistent Canvas/WebGL context (see viewport/Scene.tsx) rather than
 * mounting its own — a second independently-created WebGLRenderer reliably
 * triggered a real "Context Lost" event when switching layers, so this
 * scene is just conditionally-visible content inside the one shared canvas.
 */
export function ConfigurationsScene({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(CONFIGS_URL) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
    nodes: Record<string, THREE.Object3D>;
  };
  const { actions } = useAnimations(gltf.animations, group);

  useEffect(() => {
    if (!active) return;
    const first = Object.values(actions)[0];
    first?.reset().play();
  }, [actions, active]);

  return (
    <group visible={active}>
      <hemisphereLight args={["#3a4a66", "#0b0f16", 0.6]} />
      <directionalLight position={[2, 3, 2]} intensity={2} />
      <directionalLight position={[-2, 1, -2]} intensity={0.5} color="#7dd3e3" />
      <group ref={group}>
        <ConfigNodes nodes={gltf.nodes} />
      </group>
    </group>
  );
}

useGLTF.preload(CONFIGS_URL);
