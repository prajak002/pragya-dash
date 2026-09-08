import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useTwinStore, type CameraPreset } from "../state/store";

function presetOffset(preset: CameraPreset, radius: number): THREE.Vector3 {
  switch (preset) {
    case "front":
      return new THREE.Vector3(0, 0.05, 1).multiplyScalar(radius);
    case "side":
      return new THREE.Vector3(1, 0.05, 0).multiplyScalar(radius);
    case "rear":
      return new THREE.Vector3(0, 0.05, -1).multiplyScalar(radius);
    case "three-quarter":
    default:
      return new THREE.Vector3(0.78, 0.35, 0.78).multiplyScalar(radius);
  }
}

const GALLERY_CAMERA_POS = new THREE.Vector3(0, 1.05, 5.6);
const GALLERY_LOOK_AT = new THREE.Vector3(0, 0.9, 0);

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const model = useTwinStore((s) => s.model);
  const cameraPreset = useTwinStore((s) => s.cameraPreset);
  const layer = useTwinStore((s) => s.layer);
  const isGallery = layer === "configurations";

  const { center, radius } = useMemo(() => {
    if (!model) return { center: new THREE.Vector3(), radius: 1.4 };
    const [min, max] = model.bodyBounds;
    const c = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    const size = new THREE.Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const r = Math.max(size.x, size.y, size.z) * 1.9 + 0.3;
    return { center: c, radius: r };
  }, [model]);

  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useEffect(() => {
    if (isGallery) {
      targetPos.current.copy(GALLERY_CAMERA_POS);
      targetLookAt.current.copy(GALLERY_LOOK_AT);
      return;
    }
    const offset = presetOffset(cameraPreset, radius);
    targetPos.current.copy(center).add(offset);
    targetLookAt.current.copy(center);
    if (!initialized.current) {
      camera.position.copy(targetPos.current);
      controlsRef.current?.target.copy(targetLookAt.current);
      initialized.current = true;
    }
  }, [cameraPreset, center, radius, camera, isGallery]);

  useFrame((_, delta) => {
    const t = Math.min(1, delta * 2.4);
    camera.position.lerp(targetPos.current, t);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, t);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.15}
      maxDistance={8}
    />
  );
}
