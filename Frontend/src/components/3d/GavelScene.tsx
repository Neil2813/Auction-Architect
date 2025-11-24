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
      // Camera pulled back a bit so both fit comfortably
      camera={{ position: [0, 0.6, 3.2], fov: 35 }}
      shadows
      style={{ width: "100%", height: "100%" }}
    >
      {/* Lighting */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 3, 2]} intensity={2.3} castShadow />

      {/* Bottom/base – LEFT side, small, fully inside frame */}
      <BottomModel
        scale={0.85}
        position={[-0.7, -0.55, 0]}   // ⬅ shifted left
      />

      {/* Hammer – RIGHT side, bigger, angled towards the base */}
      <HammerModel
        scale={1.4}
        position={[0.6, 0.0, 0]}      // ➡ shifted right
        rotation={[-0.5, -0.3, 0]}    // tilted down + slightly towards left
        playHit={playHit}
        onHitComplete={onHitComplete}
      />
    </Canvas>
  );
};

export default GavelScene;
