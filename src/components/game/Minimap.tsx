"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/lib/store/editorStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { TILE_WIDTH, TILE_HEIGHT, EMPTY_COLOR, PATH_COLOR, FLOWERS_COLOR, BUILDING_COLOR, OBSTACLE_COLOR, TREE_COLOR, WATER_COLOR, GRAVEL_COLOR, SAND_COLOR, CHARGING_COLOR, GRASS_COLOR_MID, GRASS_COLOR_DARK } from "@/lib/constants";
import type { CellType } from "@/lib/types";

const CELL_COLORS: Record<CellType, string> = {
  grass: GRASS_COLOR_MID,
  path: PATH_COLOR,
  flowers: FLOWERS_COLOR,
  building: BUILDING_COLOR,
  obstacle: OBSTACLE_COLOR,
  tree: TREE_COLOR,
  water: WATER_COLOR,
  gravel: GRAVEL_COLOR,
  sand: SAND_COLOR,
  charging_station: CHARGING_COLOR,
  empty: EMPTY_COLOR,
};

const MINIMAP_SIZE = 140;

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cells = useSimulationStore((s) => s.cells);
  const space = useSimulationStore((s) => s.space);
  const mowers = useSimulationStore((s) => s.mowers);
  const stations = useSimulationStore((s) => s.stations);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const setPan = useEditorStore((s) => s.setPan);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !space) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = space.width;
    const h = space.height;
    const tileW = MINIMAP_SIZE / w;
    const tileH = MINIMAP_SIZE / h * (TILE_HEIGHT / TILE_WIDTH);

    canvas.width = MINIMAP_SIZE;
    canvas.height = MINIMAP_SIZE * (h * tileH) / (w * tileW);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw cells
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cell = cells.get(`${x},${y}`);
        ctx.fillStyle = cell ? (CELL_COLORS[cell.type] ?? EMPTY_COLOR) : EMPTY_COLOR;
        ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
      }
    }

    // Draw stations
    for (const s of stations) {
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(s.x * tileW - 1, s.y * tileH - 1, tileW + 2, tileH + 2);
    }

    // Draw mowers
    for (const m of mowers) {
      ctx.fillStyle = m.status === "faulted" ? "#ef4444" : m.status === "operating" ? "#22c55e" : "#3b82f6";
      ctx.fillRect(m.x * tileW - 1, m.y * tileH - 1, tileW + 2, tileH + 2);
    }

    // Draw viewport rectangle
    const viewW = (window.innerWidth / zoom) * (tileW / (TILE_WIDTH / 2));
    const viewH = (window.innerHeight / zoom) * (tileH / (TILE_HEIGHT / 2));
    const viewX = (-panX / zoom) * tileW;
    const viewY = (-panY / zoom) * tileH;

    ctx.strokeStyle = "rgba(251,191,36,0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(viewX, viewY, viewW, viewH);
  }, [cells, space, mowers, stations, zoom, panX, panY]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!space || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = space.width;
    const h = space.height;
    const tileW = MINIMAP_SIZE / w;
    const tileH = MINIMAP_SIZE / h * (TILE_HEIGHT / TILE_WIDTH);
    const gridX = x / tileW;
    const gridY = y / tileH;
    const isoX = ((gridX - gridY) * TILE_WIDTH / 2);
    const isoY = ((gridX + gridY) * TILE_HEIGHT / 2);
    setPan(-isoX * zoom + window.innerWidth / 2, -isoY * zoom + window.innerHeight / 2);
  };

  return (
    <div className="absolute bottom-16 left-3 z-20 pointer-events-auto">
      <div className="rounded-lg border border-border bg-surface/90 backdrop-blur p-1 shadow-lg">
        <canvas
          ref={canvasRef}
          className="cursor-pointer rounded"
          onClick={handleClick}
        />
      </div>
    </div>
  );
}
