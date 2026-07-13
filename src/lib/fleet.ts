import { TILE_WIDTH, TILE_HEIGHT } from "@/lib/constants";
import { gridToIso } from "@/lib/iso";
import type { Mower, ChargingStation, CellData, PathPoint } from "@/lib/types";

export type PerimeterEdge = { x1: number; y1: number; x2: number; y2: number };

export function assignStationsToMowers(
  mowers: Mower[],
  stations: ChargingStation[],
): Map<string, ChargingStation> {
  const map = new Map<string, ChargingStation>();
  if (mowers.length === 0 || stations.length === 0) return map;

  const sortedStations = [...stations]
    .filter((s) => s.active)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const sortedMowers = [...mowers].sort((a, b) => a.y - b.y || a.x - b.x);

  const count = Math.min(sortedMowers.length, sortedStations.length);
  for (let i = 0; i < count; i++) {
    map.set(sortedMowers[i].id, sortedStations[i]);
  }
  return map;
}

export function computeCoverageTours(
  mowers: Mower[],
  cells: Map<string, CellData>,
  width: number,
  height: number,
  mowThreshold: number,
  stationMap: Map<string, ChargingStation>,
): { tours: Map<string, PathPoint[]>; perimeters: Map<string, PerimeterEdge[]> } {
  const grassTiles: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells.get(`${x},${y}`);
      if (cell && cell.type === "grass" && (cell.grassHeight ?? 0) >= mowThreshold) {
        grassTiles.push({ x, y });
      }
    }
  }

  const tours = new Map<string, PathPoint[]>();
  const perimeters = new Map<string, PerimeterEdge[]>();
  if (grassTiles.length === 0 || mowers.length === 0) return { tours, perimeters };

  const buckets: Map<string, Array<{ x: number; y: number }>> = new Map();
  for (const m of mowers) buckets.set(m.id, []);
  for (const tile of grassTiles) {
    let bestId = mowers[0].id;
    let bestD = Infinity;
    for (const m of mowers) {
      const st = stationMap.get(m.id);
      if (!st) continue;
      const d = Math.abs(tile.x - st.x) + Math.abs(tile.y - st.y);
      if (d < bestD) { bestD = d; bestId = m.id; }
    }
    buckets.get(bestId)!.push(tile);
  }

  if (mowers.length > 1) {
    const avgTiles = Math.ceil(grassTiles.length / mowers.length);
    const maxTiles = Math.floor(avgTiles * 1.5);
    for (const m of mowers) {
      const bucket = buckets.get(m.id)!;
      if (bucket.length <= maxTiles) continue;
      const st = stationMap.get(m.id);
      if (!st) continue;
      bucket.sort((a, b) => {
        const da = Math.abs(a.x - st.x) + Math.abs(a.y - st.y);
        const db = Math.abs(b.x - st.x) + Math.abs(b.y - st.y);
        return db - da;
      });
      while (bucket.length > maxTiles) {
        const tile = bucket.pop()!;
        let bestOtherId = "";
        let bestOtherD = Infinity;
        for (const other of mowers) {
          if (other.id === m.id) continue;
          const otherSt = stationMap.get(other.id);
          if (!otherSt) continue;
          const d = Math.abs(tile.x - otherSt.x) + Math.abs(tile.y - otherSt.y);
          if (d < bestOtherD) { bestOtherD = d; bestOtherId = other.id; }
        }
        if (bestOtherId) buckets.get(bestOtherId)!.push(tile);
      }
    }
  }

  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;

  for (const m of mowers) {
    const st = stationMap.get(m.id);
    const tiles = buckets.get(m.id) ?? [];
    if (!st || tiles.length === 0) { tours.set(m.id, []); perimeters.set(m.id, []); continue; }

    const sorted: PathPoint[] = [];
    const remaining = [...tiles];
    let cx = st.x, cy = st.y;
    while (remaining.length > 0) {
      let bestIdx = 0, bestD = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = Math.abs(remaining[i].x - cx) + Math.abs(remaining[i].y - cy);
        if (d < bestD) { bestD = d; bestIdx = i; }
      }
      sorted.push(remaining[bestIdx]);
      cx = remaining[bestIdx].x;
      cy = remaining[bestIdx].y;
      remaining.splice(bestIdx, 1);
    }
    tours.set(m.id, sorted);

    const tileSet = new Set<string>(tiles.map((t) => `${t.x},${t.y}`));
    const edges: PerimeterEdge[] = [];
    for (const t of tiles) {
      const iso = gridToIso(t.x, t.y);
      const cx = iso.x;
      const cy = iso.y;
      const vTop = { x: cx, y: cy - hh };
      const vRight = { x: cx + hw, y: cy };
      const vBottom = { x: cx, y: cy + hh };
      const vLeft = { x: cx - hw, y: cy };
      if (!tileSet.has(`${t.x - 1},${t.y}`)) {
        edges.push({ x1: vLeft.x, y1: vLeft.y, x2: vTop.x, y2: vTop.y });
      }
      if (!tileSet.has(`${t.x},${t.y - 1}`)) {
        edges.push({ x1: vTop.x, y1: vTop.y, x2: vRight.x, y2: vRight.y });
      }
      if (!tileSet.has(`${t.x},${t.y + 1}`)) {
        edges.push({ x1: vBottom.x, y1: vBottom.y, x2: vLeft.x, y2: vLeft.y });
      }
      if (!tileSet.has(`${t.x + 1},${t.y}`)) {
        edges.push({ x1: vRight.x, y1: vRight.y, x2: vBottom.x, y2: vBottom.y });
      }
    }
    perimeters.set(m.id, edges);
  }
  return { tours, perimeters };
}
