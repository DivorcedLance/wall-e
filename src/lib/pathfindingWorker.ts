import type { CellData } from "@/lib/types";
import { TERRAIN_RESISTANCE } from "@/lib/constants";

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<string, { resolve: (path: Array<{ x: number; y: number }>) => void; reject: (err: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker("/pathfinding.worker.js");
    worker.onmessage = (e) => {
      const { id, path } = e.data;
      const p = pending.get(id);
      if (p) {
        pending.delete(id);
        p.resolve(path);
      }
    };
    worker.onerror = (e) => {
      console.error("Pathfinding worker error:", e);
    };
  }
  return worker;
}

export function findPathAsync(
  sx: number, sy: number, tx: number, ty: number,
  cells: Map<string, CellData>, width: number, height: number,
): Promise<Array<{ x: number; y: number }>> {
  return new Promise((resolve, reject) => {
    const id = String(requestId++);
    pending.set(id, { resolve, reject });

    const cellEntries = cells.size > 0
      ? Array.from(cells.entries()).map(([key, cell]) => ({
          key,
          type: cell.type,
          walkable: true,
        }))
      : [];

    getWorker().postMessage({
      id, sx, sy, tx, ty,
      cells: cellEntries,
      width, height,
      terrainCosts: TERRAIN_RESISTANCE as Record<string, number>,
    });
  });
}
