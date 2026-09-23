"use client";

import { useEffect, useRef } from "react";

type Coordinate = readonly [number, number];
// Simplified decorative continent outlines, in longitude / latitude degrees.
const continents: readonly (readonly Coordinate[])[] = [
  [[-168, 66], [-145, 71], [-125, 70], [-105, 78], [-62, 57], [-53, 48], [-80, 25], [-86, 16], [-99, 19], [-117, 32], [-130, 51], [-166, 59]],
  [[-81, 12], [-63, 10], [-48, -2], [-35, -8], [-42, -24], [-54, -35], [-68, -55], [-75, -43], [-70, -18], [-81, -4]],
  [[-53, 60], [-43, 60], [-20, 77], [-30, 83], [-58, 80]],
  [[-17, 35], [9, 37], [34, 30], [43, 12], [51, 11], [41, -12], [31, -30], [18, -35], [10, -17], [8, 3], [-9, 5], [-17, 15]],
  [[-10, 36], [-10, 44], [4, 51], [8, 58], [22, 71], [45, 70], [65, 77], [105, 77], [140, 71], [179, 65], [162, 51], [143, 47], [131, 32], [120, 23], [110, 20], [104, 2], [97, 8], [89, 23], [78, 8], [69, 24], [57, 25], [48, 13], [35, 30], [27, 40], [17, 40], [10, 44], [1, 37]],
  [[112, -22], [114, -34], [132, -35], [145, -39], [154, -27], [145, -12], [132, -11], [123, -17]],
  [[47, -13], [51, -16], [47, -26], [44, -23]],
  [[130, 31], [137, 36], [142, 45], [146, 44], [140, 35], [133, 30]],
  [[-8, 50], [-2, 50], [0, 55], [-4, 59], [-7, 57]],
  [[95, 5], [106, -6], [119, -9], [115, -5], [105, -2]],
];

function isLand(lon: number, lat: number) {
  return continents.some((polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [x, y] = polygon[i];
      const [px, py] = polygon[j];
      if ((y > lat) !== (py > lat) && lon < ((px - x) * (lat - y)) / (py - y) + x) inside = !inside;
    }
    return inside;
  });
}

export function ParticleGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointCount = window.innerWidth < 640 ? 7000 : 16000;
    const points = Array.from({ length: pointCount }, (_, index) => {
      const y = 1 - (2 * (index + 0.5)) / pointCount;
      const latitude = Math.asin(y);
      const longitude = ((index * Math.PI * (3 - Math.sqrt(5))) % (Math.PI * 2)) - Math.PI;
      const radius = Math.cos(latitude);
      return { x: radius * Math.sin(longitude), y, z: radius * Math.cos(longitude), land: isLand(longitude * 180 / Math.PI, latitude * 180 / Math.PI) };
    });

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = false;
    let previous = 0;
    let elapsed = 0;

    function draw() {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      const radius = Math.min(width * 0.55, height * 0.95, 680);
      const cx = width * (width > 900 ? 0.65 : 0.56);
      // Equator meets the section's bottom edge: only the upper half is visible.
      const cy = height;
      const angle = -1.8 + elapsed * 0.000025;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const project = (x: number, y: number, z: number) => {
        const rx = x * cos + z * sin;
        const rz = z * cos - x * sin;
        const tilt = -0.13;
        return { x: cx + rx * radius, y: cy - (y * Math.cos(tilt) - rz * Math.sin(tilt)) * radius, z: y * Math.sin(tilt) + rz * Math.cos(tilt) };
      };

      const glow = context.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
      glow.addColorStop(0, "rgba(218, 226, 205, 0)");
      glow.addColorStop(0.85, "rgba(196, 209, 185, 0.14)");
      glow.addColorStop(1, "rgba(218, 226, 205, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      for (const point of points) {
        const p = project(point.x, point.y, point.z);
        if (p.y > height + 2 || p.z < -0.12) continue;
        const depth = Math.max(0, p.z);
        context.fillStyle = `rgba(113, 137, 105, ${(point.land ? 0.58 : 0.035) * (0.25 + depth * 0.75)})`;
        const size = point.land ? 0.65 + depth * 0.5 : 0.5;
        context.beginPath();
        context.arc(p.x, p.y, size, 0, Math.PI * 2);
        context.fill();
      }

      const ring = (longitude: number) => {
        context.beginPath();
        let started = false;
        for (let i = 0; i <= 160; i++) {
          const t = i / 160 * Math.PI * 2;
          const p = project(Math.sin(longitude) * Math.cos(t), Math.sin(t), Math.cos(longitude) * Math.cos(t));
          if (p.z < 0) { started = false; continue; }
          if (started) context.lineTo(p.x, p.y);
          else context.moveTo(p.x, p.y);
          started = true;
        }
        context.stroke();
      };
      context.lineWidth = 0.7;
      context.strokeStyle = "rgba(127, 146, 112, 0.19)";
      ring(0.7);
      ring(2.4);
      context.beginPath();
      context.arc(cx, cy, radius, Math.PI, Math.PI * 2);
      context.strokeStyle = "rgba(127, 146, 112, 0.14)";
      context.stroke();

      for (const [lon, lat] of [[121, 25], [2, 49], [-74, 41]]) {
        const la = lat * Math.PI / 180;
        const lo = lon * Math.PI / 180;
        const p = project(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
        if (p.z <= 0 || p.y > height) continue;
        const pulse = motion.matches ? 0.4 : (Math.sin(elapsed * 0.0018 + lon) + 1) / 2;
        const halo = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7 + pulse * 4);
        halo.addColorStop(0, "rgba(186, 153, 89, 0.6)");
        halo.addColorStop(1, "rgba(186, 153, 89, 0)");
        context.fillStyle = halo;
        context.beginPath();
        context.arc(p.x, p.y, 7 + pulse * 4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "rgba(255, 251, 244, 0.9)";
        context.beginPath();
        context.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        context.fill();
      }
    }

    function animate(time: number) {
      frame = 0;
      if (!visible || document.hidden || motion.matches) return;
      if (time - previous >= 32) {
        elapsed += previous ? Math.min(time - previous, 64) : 0;
        previous = time;
        draw();
      }
      frame = requestAnimationFrame(animate);
    }

    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      draw();
      if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(animate);
    }

    const resize = new ResizeObserver(() => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sync();
    });
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    resize.observe(canvas);
    intersection.observe(canvas);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <canvas ref={canvasRef} className="about-particle-globe" aria-hidden="true" />;
}
