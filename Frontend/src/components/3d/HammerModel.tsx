import React, { useRef, useState } from "react";
import { useFrame, useLoader, GroupProps } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

interface GLTFResult extends THREE.Object3D {
  scene: THREE.Group;
}

type HammerProps = GroupProps & {
  playHit: boolean;
  onHitComplete?: () => void;
};

const HammerModel: React.FC<HammerProps> = ({
  playHit,
  onHitComplete,
  ...props
}) => {
  const gltf = useLoader(GLTFLoader, "/models/hammer.glb") as GLTFResult;
  const group = useRef<THREE.Group>(null);

  const [phase, setPhase] = useState<"idle" | "hitting" | "returning">("idle");
  const timeRef = useRef(0);

  // ---------- Poses (sideways hammer, right → left) ----------

  // starting pose: hammer on the right, slightly raised & sideways
  const idlePosition = new THREE.Vector3(0.8, 0.1, 0);
  const idleRotation = new THREE.Euler(-0.2, -0.9, 0);

  // hit pose: head down on the base (left), touching it
  const hitPosition = new THREE.Vector3(-0.2, -0.45, 0);
  const hitRotation = new THREE.Euler(-1.2, -0.9, 0);

  useFrame((_, delta) => {
    if (!group.current) return;

    // idle default pose
    if (phase === "idle" && !playHit) {
      group.current.position.copy(idlePosition);
      group.current.rotation.copy(idleRotation);
      return;
    }

    // trigger animation
    if (playHit && phase === "idle") {
      setPhase("hitting");
      timeRef.current = 0;
    }

    timeRef.current += delta;

    if (phase === "hitting") {
      // slower hit (~0.6s)
      const t = Math.min(timeRef.current / 0.6, 1);

      // lerp position
      group.current.position.lerpVectors(idlePosition, hitPosition, t);

      // lerp rotation (Euler components)
      group.current.rotation.x =
        idleRotation.x + (hitRotation.x - idleRotation.x) * t;
      group.current.rotation.y =
        idleRotation.y + (hitRotation.y - idleRotation.y) * t;
      group.current.rotation.z =
        idleRotation.z + (hitRotation.z - idleRotation.z) * t;

      if (t >= 1) {
        setPhase("returning");
        timeRef.current = 0;
      }
    } else if (phase === "returning") {
      // slower return (~0.8s)
      const t = Math.min(timeRef.current / 0.8, 1);

      group.current.position.lerpVectors(hitPosition, idlePosition, t);

      group.current.rotation.x =
        hitRotation.x + (idleRotation.x - hitRotation.x) * t;
      group.current.rotation.y =
        hitRotation.y + (idleRotation.y - hitRotation.y) * t;
      group.current.rotation.z =
        hitRotation.z + (idleRotation.z - hitRotation.z) * t;

      if (t >= 1) {
        setPhase("idle");
        timeRef.current = 0;
        if (onHitComplete) onHitComplete();
      }
    }
  });

  return (
    <group ref={group} {...props}>
      <primitive object={gltf.scene} />
    </group>
  );
};

export default HammerModel;
