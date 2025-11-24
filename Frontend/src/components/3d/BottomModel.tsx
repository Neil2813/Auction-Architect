import React from "react";
import { useLoader, GroupProps } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

interface GLTFResult extends THREE.Object3D {
  scene: THREE.Group;
}

const BottomModel: React.FC<GroupProps> = (props) => {
  const gltf = useLoader(GLTFLoader, "/models/bottom.glb") as GLTFResult;

  return (
    <group {...props}>
      <primitive object={gltf.scene} />
    </group>
  );
};

export default BottomModel;
