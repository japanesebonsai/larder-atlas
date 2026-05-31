"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AtlasAtmosphere() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#f8f6f0]">
      <motion.svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-70"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        initial={false}
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, -16, 0],
                y: [0, 10, 0],
              }
        }
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <defs>
          <linearGradient id="atlas-line" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#d9dfcf" />
            <stop offset="48%" stopColor="#cad6bd" />
            <stop offset="100%" stopColor="#eee4cc" />
          </linearGradient>
        </defs>
        <path
          d="M-80 140 C 120 40, 250 230, 430 120 S 760 120, 920 220 1150 260, 1280 150"
          fill="none"
          stroke="url(#atlas-line)"
          strokeWidth="2"
        />
        <path
          d="M-120 380 C 90 300, 240 480, 420 360 S 720 300, 910 450 1130 530, 1310 410"
          fill="none"
          stroke="url(#atlas-line)"
          strokeWidth="1.5"
        />
        <path
          d="M-90 620 C 130 540, 280 680, 470 560 S 760 540, 960 630 1160 720, 1300 600"
          fill="none"
          stroke="url(#atlas-line)"
          strokeWidth="2"
        />
      </motion.svg>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(38,52,33,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(38,52,33,0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,253,248,0.82),rgba(248,246,240,0.4)_48%,rgba(248,246,240,0.92)_100%)]" />
    </div>
  );
}
