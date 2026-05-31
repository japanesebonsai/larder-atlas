"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speedX: number;
  speedY: number;
  flickerSpeed: number;
  flickerAngle: number;
  useSecondaryColor: boolean;
};

const orbSize = 980;
const orbColor = "#ff1fd6";
const orbPositionX = 230;
const orbPositionY = -260;
const starColor = "#f8fafc";
const starColor2 = "#ff6a00";
const starBaseSize = 0.55;
const starFuzziness = 0.2;
const starCount = 72;

export function AtlasAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const orb = orbRef.current;
    const container = containerRef.current;

    if (!canvas || !orb || !container) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    const canvasElement = canvas;
    const orbElement = orb;
    const containerElement = container;
    const drawingContext = context;

    let width = containerElement.clientWidth;
    let height = containerElement.clientHeight;
    let stars: Star[] = [];
    let animationFrameId = 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resetStar(star: Star) {
      const orbX = width / 2 + orbPositionX;
      const orbY = orbPositionY + orbSize / 2;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * (orbSize / 2);

      star.x = orbX + Math.cos(angle) * radius;
      star.y = orbY + Math.sin(angle) * radius;
      star.size = Math.random() * starBaseSize + 0.5;
      star.alpha = 0;
      star.useSecondaryColor = Math.random() > 0.5;
      star.speedX = (Math.random() - 0.5) * 0.05;
      star.speedY = (Math.random() - 0.5) * 0.05;
      star.flickerSpeed = Math.random() * 0.02 + 0.005;
      star.flickerAngle = Math.random() * Math.PI * 2;
    }

    function createStar(): Star {
      const star: Star = {
        x: 0,
        y: 0,
        size: 1,
        alpha: 0,
        speedX: 0,
        speedY: 0,
        flickerSpeed: 0,
        flickerAngle: 0,
        useSecondaryColor: false,
      };

      resetStar(star);
      return star;
    }

    function initStars() {
      stars = Array.from({ length: starCount }, createStar);
    }

    function resize() {
      const rect = containerElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      width = rect.width;
      height = rect.height;
      canvasElement.width = width * dpr;
      canvasElement.height = height * dpr;
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars();
    }

    function updateStar(star: Star) {
      star.x += star.speedX;
      star.y += star.speedY;
      star.flickerAngle += star.flickerSpeed;
      star.alpha = (Math.sin(star.flickerAngle) + 1) / 2;

      const orbX = width / 2 + orbPositionX;
      const orbY = orbPositionY + orbSize / 2;
      const distance = Math.hypot(star.x - orbX, star.y - orbY);

      if (distance > orbSize / 2 + 100) {
        resetStar(star);
      }
    }

    function drawStar(star: Star) {
      drawingContext.save();
      drawingContext.globalAlpha = star.alpha * 0.9;
      drawingContext.fillStyle = star.useSecondaryColor ? starColor2 : starColor;
      drawingContext.filter = starFuzziness > 0 ? `blur(${starFuzziness}px)` : "none";
      drawingContext.beginPath();
      drawingContext.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      drawingContext.fill();
      drawingContext.restore();
    }

    function animate() {
      drawingContext.clearRect(0, 0, width, height);

      for (const star of stars) {
        if (!reduceMotion) {
          updateStar(star);
        }
        drawStar(star);
      }

      if (reduceMotion) {
        return;
      }

      targetX += (mouseX - targetX) * 0.1;
      targetY += (mouseY - targetY) * 0.1;
      orbElement.style.transform = `translate(calc(-50% + ${targetX * 0.05}px), ${targetY * 0.05}px)`;
      canvasElement.style.transform = `translate(${targetX * 0.02}px, ${targetY * 0.02}px)`;
      animationFrameId = requestAnimationFrame(animate);
    }

    function onMouseMove(event: MouseEvent) {
      mouseX = event.clientX - window.innerWidth / 2;
      mouseY = event.clientY - window.innerHeight / 2;
    }

    const observer = new ResizeObserver(resize);

    resize();
    observer.observe(containerElement);
    if (!reduceMotion) {
      window.addEventListener("mousemove", onMouseMove);
    }
    animate();

    return () => {
      observer.disconnect();
      if (!reduceMotion) {
        window.removeEventListener("mousemove", onMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050505]"
    >
      <div
        ref={orbRef}
        className="absolute left-1/2 rounded-full opacity-[0.28] blur-[120px] will-change-transform"
        style={{
          top: orbPositionY,
          width: orbSize,
          height: orbSize,
          background: `radial-gradient(circle, ${orbColor} 0%, transparent 70%)`,
          transform: `translateX(-50%) translateX(${orbPositionX}px)`,
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 h-full w-full will-change-transform"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_6%,rgba(255,31,214,0.58),transparent_32%),radial-gradient(circle_at_64%_28%,rgba(153,0,255,0.38),transparent_34%),radial-gradient(circle_at_78%_76%,rgba(255,106,0,0.34),transparent_36%),linear-gradient(112deg,#050505_0%,#050505_31%,rgba(36,0,78,0.82)_48%,rgba(255,31,214,0.36)_72%,rgba(255,31,214,0.48)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.06),transparent_25%,rgba(255,255,255,0.025)_52%,transparent_78%)]" />
    </div>
  );
}
