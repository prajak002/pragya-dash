import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useTwinStore } from "../state/store";
import { CameraRig } from "./CameraRig";
import { ConfigurationsScene } from "./ConfigurationsScene";
import { KalkiBody } from "./KalkiBody";
import { PhysicsBody } from "./PhysicsBody";

function Loader3D() {
  return (
    <mesh>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color="#a994ff" wireframe />
    </mesh>
  );
}

function SceneContent() {
  const layer = useTwinStore((s) => s.layer);
  const explode = useTwinStore((s) => s.explode);
  const isConfigurations = layer === "configurations";
  const isExploded = explode > 0.05;

  return (
    <>
      {/* Real physics: gravity + motor-driven joints, torque-informed. Active at rest pose only —
          exploding parts apart isn't physically coherent with real joint constraints, so that stays
          the separate deterministic kinematic view below. Conditionally mounted rather than just
          hidden — both views load the same kalki_body.glb via useGLTF, and having both mounted
          simultaneously (one merely `visible={false}`) raced on that shared GLTF load. This isn't
          the second-<Canvas> context-loss issue from the Configurations gallery — no WebGL context
          is created or destroyed here, just a React subtree — so unmount/remount is safe. The
          physics sim does reset pose on remount, an acceptable trade for correctness. */}
      {!isConfigurations && !isExploded && <PhysicsBody />}

      {/* Exploded inspection view: deterministic explode-offset positions, driven by the slider. */}
      {!isConfigurations && isExploded && <KalkiBody />}

      <ConfigurationsScene active={isConfigurations} />
    </>
  );
}

/**
 * The app's single, persistent WebGL canvas. Every layer (assembly, exploded,
 * the diagram layers, and the configurations gallery) renders into this same
 * Canvas/renderer — we intentionally never mount a second <Canvas>, since
 * doing so was observed to trigger a real WebGLRenderer "Context Lost" event
 * when switching layers. Per-layer content is toggled with `visible`, not by
 * mounting/unmounting.
 */
export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ fov: 34, near: 0.01, far: 50, position: [1, 0.6, 1.4] }}
    >
      <color attach="background" args={["#0b1017"]} />
      <fog attach="fog" args={["#0b1017", 3, 9]} />
      <hemisphereLight args={["#3a4a66", "#0b0f16", 0.55]} />
      <directionalLight position={[1.6, 2.4, 1.2]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-1.4, 0.6, -1.2]} intensity={0.4} color="#7dd3e3" />

      <Suspense fallback={<Loader3D />}>
        <SceneContent />
      </Suspense>

      <CameraRig />
    </Canvas>
  );
}
