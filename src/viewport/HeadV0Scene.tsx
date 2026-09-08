import { OrbitControls, Text, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { HEAD_V0_HEIGHT_MM, HEAD_V0_PARTS, HEAD_V0_URL } from "../canonical/headV0";
import { useTwinStore } from "../state/store";

const SPACING_M = 0.42; // real head height (0.31m) + clear margin between parts
const TARGET_HEIGHT_M = HEAD_V0_HEIGHT_MM / 1000;

/**
 * The four source GLBs come from independent CAD/mesh exports with no shared
 * unit convention or origin — their raw bounding boxes disagree by up to ~3.5x
 * even though the reference sheet states all four share a 310mm head height.
 * Rather than trust the source scale, every part is normalized here: scaled
 * so its own bounding-box height matches the sheet's stated 310mm, and
 * recentered on its own bounding-box center, so all four align consistently
 * regardless of what units/pivot the source file used.
 */
function useNormalizedTransform(scene: THREE.Object3D) {
  return useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = size.y > 0 ? TARGET_HEIGHT_M / size.y : 1;
    return { scale, center };
  }, [scene]);
}

function HeadPart({ id, index }: { id: string; index: number }) {
  const gltf = useGLTF(HEAD_V0_URL(id));
  const { scale, center } = useNormalizedTransform(gltf.scene);
  const x = (index - (HEAD_V0_PARTS.length - 1) / 2) * SPACING_M;
  const selectedId = useTwinStore((s) => s.selectedId);
  const hoveredId = useTwinStore((s) => s.hoveredId);
  const select = useTwinStore((s) => s.select);
  const hover = useTwinStore((s) => s.hover);
  const isActive = selectedId === id || hoveredId === id;

  return (
    <group
      position={[x, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        select(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover(id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        hover(null);
        document.body.style.cursor = "auto";
      }}
    >
      <group scale={isActive ? scale * 1.06 : scale}>
        <primitive object={gltf.scene} position={[-center.x, -center.y, -center.z]} />
      </group>
      <Text position={[0, TARGET_HEIGHT_M / 2 + 0.04, 0]} fontSize={0.028} color={isActive ? "#a994ff" : "#7dd3e3"} anchorX="center" anchorY="middle">
        {id}
      </Text>
    </group>
  );
}

function HeadV0Content() {
  return (
    <>
      {HEAD_V0_PARTS.map((p, i) => (
        <HeadPart key={p.id} id={p.id} index={i} />
      ))}
    </>
  );
}

function Loader() {
  return (
    <mesh>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial color="#a994ff" wireframe />
    </mesh>
  );
}

/**
 * A dedicated, self-contained scene for the real Kalki V0 Stage-1 head CAD
 * parts (H1-H4) — deliberately its own <Canvas>, not merged into the main
 * Scene.tsx. Those parts are decimated to ~40k triangles each (down from
 * raw exports of up to 3M triangles — the raw files visibly strained this
 * browser), so a second canvas here is safe; it isn't the "huge unscaled
 * mesh" situation that caused the earlier Configurations-gallery context
 * loss. HeadV0Board (the panel this pairs with) is where per-part specs
 * and real print recommendations are shown.
 */
export function HeadV0Scene() {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 32, near: 0.01, far: 20, position: [0, 0.1, 2.4] }}>
      <color attach="background" args={["#0b1017"]} />
      <hemisphereLight args={["#3a4a66", "#0b0f16", 0.7]} />
      <directionalLight position={[1, 2, 1.5]} intensity={2} />
      <directionalLight position={[-1, 0.5, -1]} intensity={0.5} color="#7dd3e3" />
      <Suspense fallback={<Loader />}>
        <HeadV0Content />
      </Suspense>
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} minDistance={0.3} maxDistance={6} />
    </Canvas>
  );
}

HEAD_V0_PARTS.forEach((p) => useGLTF.preload(HEAD_V0_URL(p.id)));
