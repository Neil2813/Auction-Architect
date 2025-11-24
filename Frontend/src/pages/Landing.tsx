"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";     // <-- using Navbar now
import GavelScene from "@/components/3d/GavelScene";

const Landing = () => {
  const [playHit, setPlayHit] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleButtonClick = () => {
    if (playHit) return; // prevent spam
    setPlayHit(true);
    setCountdown(3);
  };

  // countdown logic
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      navigate("/auction");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : prev));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  let buttonLabel = "Start Auction";
  if (playHit && countdown !== null && countdown > 0) {
    buttonLabel = `Entering Auction in ${countdown}`;
  } else if (playHit && countdown === 0) {
    buttonLabel = "Entering Auction";
  }

  return (
    <div id="Hero" className="noisy h-screen flex flex-col overflow-hidden">
      
      {/* ✅ Replace Header with Navbar */}
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center relative">
        
        {/* Title */}
        <h1
          className="
            text-center
            font-heading
            text-4xl sm:text-6xl md:text-7xl
            font-bold uppercase
            text-[var(--yellow-600)]
            tracking-wide mb-4
          "
        >
          Auction Architect XI
        </h1>

        {/* 3D Hammer Scene */}
        <div className="w-full h-[260px] sm:h-[300px] md:h-[350px] mt-2">
          <GavelScene playHit={playHit} />
        </div>

        {/* CTA Button */}
        <div className="mt-8 flex items-center justify-center">
          <button
            onClick={handleButtonClick}
            disabled={playHit}
            className={`
              relative rounded-xl font-semibold text-[var(--blue-950)]
              bg-[var(--yellow-400)] transition-all duration-300
              hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
              px-6 py-3
              ${playHit ? "px-8 py-4 text-lg scale-110" : "text-base"}
            `}
          >
            {buttonLabel}
          </button>
        </div>
      </main>
    </div>
  );
};

export default Landing;
