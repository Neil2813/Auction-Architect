import React from "react";
import { Canvas } from "@react-three/fiber";
import BottomModel from "./BottomModel";
import HammerModel from "./HammerModel";

type GavelSceneProps = {
  playHit: boolean;
  onHitComplete?: () => void;
};

const GavelScene: React.FC<GavelSceneProps> = ({ playHit, onHitComplete }) => {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 3.2], fov: 35 }}
      shadows
      style={{ width: "100%", height: "100%" }}
    >
      {/* Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 3, 2]} intensity={2.3} castShadow />

      {/* Bottom/base – LEFT side */}
      <BottomModel
        scale={0.85}
        position={[-0.7, -0.55, 0]}
      />

      {/* Hammer – RIGHT side, big, sideways; actual motion handled in HammerModel */}
      <HammerModel
        scale={1.4}
        playHit={playHit}
        onHitComplete={onHitComplete}
      />
    </Canvas>
  );
};

export default GavelScene;
