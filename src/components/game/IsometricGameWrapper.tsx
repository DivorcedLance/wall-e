"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { IsometricScene } from "@/components/game/IsometricScene";
import { useTheme } from "@/components/ThemeProvider";

export interface PhaserBridge {
  paintAt: (x: number, y: number) => void;
  paintRect: (x0: number, y0: number, x1: number, y1: number) => void;
  getCellAt: (worldX: number, worldY: number) => { x: number; y: number } | null;
  centerView: () => void;
}

const THEME_COLORS = {
  dark: "#0a0e1a",
  light: "#e2e8f0",
};

export function IsometricGameWrapper() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const { theme } = useTheme();

  // Update background color when theme changes
  useEffect(() => {
    if (gameRef.current) {
      const cam = gameRef.current.scene.scenes[0]?.cameras?.main;
      if (cam) cam.setBackgroundColor(THEME_COLORS[theme]);
    }
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current) return;
    const parent = containerRef.current;
    const computeSize = () => {
      const r = parent.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.max(1, Math.min(Math.floor(r.width) || 1, vw));
      const h = Math.max(1, Math.min(Math.floor(r.height) || 1, vh));
      return { w, h };
    };
    const initial = computeSize();
    const bgColor = THEME_COLORS[theme] ?? THEME_COLORS.dark;
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      parent,
      backgroundColor: bgColor,
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: initial.w,
        height: initial.h,
      },
      scene: [IsometricScene],
      render: {
        antialias: true,
        pixelArt: false,
      },
    };
    const game = new Phaser.Game(config);
    gameRef.current = game;
    const onResize = () => {
      const { w, h } = computeSize();
      if (w !== game.scale.width || h !== game.scale.height) {
        game.scale.resize(w, h);
      }
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(parent);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      game.destroy(true);
      gameRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
