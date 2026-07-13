"use client";

import { TILE_WIDTH, TILE_HEIGHT } from "@/lib/constants";

export function gridToIso(x: number, y: number): { x: number; y: number } {
  return {
    x: (x - y) * (TILE_WIDTH / 2),
    y: (x + y) * (TILE_HEIGHT / 2),
  };
}

export function isoToGrid(
  isoX: number,
  isoY: number,
): { x: number; y: number } {
  const x = (isoX / (TILE_WIDTH / 2) + isoY / (TILE_HEIGHT / 2)) / 2;
  const y = (isoY / (TILE_HEIGHT / 2) - isoX / (TILE_WIDTH / 2)) / 2;
  return {
    x: Math.floor(x),
    y: Math.floor(y),
  };
}

export function drawIsoDiamond(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  width: number,
  height: number,
  fillColor: number,
  fillAlpha: number,
  strokeColor: number,
  strokeAlpha: number,
  strokeWidth: number,
): void {
  const hw = width / 2;
  const hh = height / 2;
  graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
  graphics.fillStyle(fillColor, fillAlpha);
  graphics.beginPath();
  graphics.moveTo(cx, cy - hh);
  graphics.lineTo(cx + hw, cy);
  graphics.lineTo(cx, cy + hh);
  graphics.lineTo(cx - hw, cy);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
}

export function drawIsoTriangle(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  size: number,
  height: number,
  topColor: number,
  leftColor: number,
  rightColor: number,
): void {
  // base center
  const baseY = cy;
  const topY = cy - height;
  // The base of the pyramid is a diamond
  const hw = size / 2;
  graphics.fillStyle(leftColor, 1);
  graphics.beginPath();
  graphics.moveTo(cx, baseY);
  graphics.lineTo(cx - hw, baseY - size / 4);
  graphics.lineTo(cx, topY);
  graphics.closePath();
  graphics.fillPath();

  graphics.fillStyle(rightColor, 1);
  graphics.beginPath();
  graphics.moveTo(cx, baseY);
  graphics.lineTo(cx + hw, baseY - size / 4);
  graphics.lineTo(cx, topY);
  graphics.closePath();
  graphics.fillPath();

  graphics.fillStyle(topColor, 1);
  graphics.beginPath();
  graphics.moveTo(cx - hw, baseY - size / 4);
  graphics.lineTo(cx + hw, baseY - size / 4);
  graphics.lineTo(cx, topY);
  graphics.closePath();
  graphics.fillPath();
}
