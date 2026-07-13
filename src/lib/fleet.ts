import { TILE_WIDTH, TILE_HEIGHT } from "@/lib/constants";
import { gridToIso } from "@/lib/iso";
import { WALKABLE } from "@/lib/pathfinding";
import type { Mower, ChargingStation, CellData, PathPoint, Trip } from "@/lib/types";

export type PerimeterEdge = { x1: number; y1: number; x2: number; y2: number };

export function assignStationsToMowers(
  mowers: Mower[],
  stations: ChargingStation[],
): Map<string, ChargingStation> {
  const map = new Map<string, ChargingStation>();
  if (mowers.length === 0 || stations.length === 0) return map;
  const sortedStations = [...stations].filter((s) => s.active).sort((a, b) => a.y - b.y || a.x - b.x);
  const sortedMowers = [...mowers].sort((a, b) => a.y - b.y || a.x - b.x);
  const count = Math.min(sortedMowers.length, sortedStations.length);
  for (let i = 0; i < count; i++) map.set(sortedMowers[i].id, sortedStations[i]);
  return map;
}

// ── Pathfinding helpers ─────────────────────────────────────────────────────

function bfsDistance(
  sx: number, sy: number, tx: number, ty: number,
  cells: Map<string, CellData>, width: number, height: number,
): number {
  if (sx === tx && sy === ty) return 0;
  const visited = new Set<string>();
  const queue = [{ x: sx, y: sy, dist: 0 }];
  const targetKey = `${tx},${ty}`;
  while (queue.length > 0) {
    const { x, y, dist } = queue.shift()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (key === targetKey) return dist;
    const cell = cells.get(key);
    if (!cell || !WALKABLE.has(cell.type)) continue;
    visited.add(key);
    const nd = dist + 1;
    if (x > 0) queue.push({ x: x - 1, y, dist: nd });
    if (x < width - 1) queue.push({ x: x + 1, y, dist: nd });
    if (y > 0) queue.push({ x, y: y - 1, dist: nd });
    if (y < height - 1) queue.push({ x, y: y + 1, dist: nd });
  }
  return Infinity;
}

function bfsFromStation(
  sx: number, sy: number,
  grassTiles: Set<string>,
  cells: Map<string, CellData>, width: number, height: number,
): Map<string, number> {
  const distances = new Map<string, number>();
  const visited = new Set<string>();
  const queue = [{ x: sx, y: sy, dist: 0 }];
  while (queue.length > 0) {
    const { x, y, dist } = queue.shift()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (grassTiles.has(key)) distances.set(key, dist);
    const cell = cells.get(key);
    if (!cell || !WALKABLE.has(cell.type)) continue;
    const nd = dist + 1;
    if (x > 0) queue.push({ x: x - 1, y, dist: nd });
    if (x < width - 1) queue.push({ x: x + 1, y, dist: nd });
    if (y > 0) queue.push({ x, y: y - 1, dist: nd });
    if (y < height - 1) queue.push({ x, y: y + 1, dist: nd });
  }
  return distances;
}

function floodFillReachable(
  startX: number, startY: number,
  targetTiles: Set<string>,
  cells: Map<string, CellData>, width: number, height: number,
  tileOwner?: Map<string, string>, ownerId?: string,
): Set<string> {
  const visited = new Set<string>();
  const stack = [{ x: startX, y: startY }];
  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (!targetTiles.has(key)) {
      const cell = cells.get(key);
      if (!cell || !WALKABLE.has(cell.type)) continue;
      // If tileOwner provided, exclude tiles owned by OTHER mowers
      if (tileOwner && ownerId) {
        const owner = tileOwner.get(key);
        if (owner && owner !== ownerId) continue;
      }
    }
    visited.add(key);
    if (x > 0) stack.push({ x: x - 1, y });
    if (x < width - 1) stack.push({ x: x + 1, y });
    if (y > 0) stack.push({ x, y: y - 1 });
    if (y < height - 1) stack.push({ x, y: y + 1 });
  }
  return visited;
}

function isZoneConnected(
  tiles: PathPoint[], station: { x: number; y: number },
  cells: Map<string, CellData>, width: number, height: number,
): boolean {
  if (tiles.length === 0) return true;
  const targetTiles = new Set(tiles.map((t) => `${t.x},${t.y}`));
  targetTiles.add(`${station.x},${station.y}`);
  const reachable = floodFillReachable(station.x, station.y, targetTiles, cells, width, height);
  let count = 0;
  for (const key of targetTiles) { if (reachable.has(key)) count++; }
  return count === tiles.length;
}

// ── Compute coverage tours ──────────────────────────────────────────────────

/** Sort tiles using nearest-neighbor from station. Used by both initFleet and Recalculate button. */
export function sortTilesNearestNeighbor(tiles: PathPoint[], station: { x: number; y: number }): PathPoint[] {
  const sorted: PathPoint[] = [];
  const remaining = [...tiles];
  let cx = station.x, cy = station.y;
  while (remaining.length > 0) {
    let bestIdx = 0, bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = Math.abs(remaining[i].x - cx) + Math.abs(remaining[i].y - cy);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    sorted.push(remaining[bestIdx]);
    cx = remaining[bestIdx].x; cy = remaining[bestIdx].y;
    remaining.splice(bestIdx, 1);
  }
  return sorted;
}

export function computeCoverageTours(
  mowers: Mower[],
  cells: Map<string, CellData>,
  width: number,
  height: number,
  mowThreshold: number,
  stationMap: Map<string, ChargingStation>,
): { tours: Map<string, PathPoint[]>; perimeters: Map<string, PerimeterEdge[]>; trips?: Map<string, Trip[]> } {
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
  const tripsMap = new Map<string, Trip[]>();
  if (grassTiles.length === 0 || mowers.length === 0) return { tours, perimeters, trips: tripsMap };

  const grassSet = new Set(grassTiles.map((t) => `${t.x},${t.y}`));

  // ── Step 1: BFS from each station ──────────────────────────────────────
  const stationDistances = new Map<string, Map<string, number>>();
  for (const m of mowers) {
    const st = stationMap.get(m.id);
    if (!st) continue;
    stationDistances.set(m.id, bfsFromStation(st.x, st.y, grassSet, cells, width, height));
  }

  // ── Step 2: Flood-fill Voronoi — assign tiles in BFS waves from each station
  // Only traverses unassigned tiles → guarantees each zone is connected from start
  const buckets: Map<string, Array<{ x: number; y: number }>> = new Map();
  for (const m of mowers) buckets.set(m.id, []);

  const assigned = new Set<string>();
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  let totalAssigned = 0;
  const totalGrass = grassTiles.length;

  // Initialize BFS queues from each station
  const queues: Array<Array<{ x: number; y: number }>> = [];
  for (const m of mowers) {
    const st = stationMap.get(m.id);
    if (!st) { queues.push([]); continue; }
    queues.push([{ x: st.x, y: st.y }]);
  }

  // Round-robin BFS waves — each station claims adjacent unassigned grass tiles
  let maxWaves = 0;
  while (totalAssigned < totalGrass && maxWaves < width + height) {
    let anyProgress = false;
    for (let mi = 0; mi < mowers.length; mi++) {
      if (totalAssigned >= totalGrass) break;
      const queue = queues[mi];
      if (queue.length === 0) continue;

      const nextQueue: Array<{ x: number; y: number }> = [];
      const visitedThisWave = new Set<string>();
      for (const { x, y } of queue) {
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nk = `${nx},${ny}`;
          if (assigned.has(nk) || visitedThisWave.has(nk)) continue;
          const cell = cells.get(nk);
          if (!cell || !WALKABLE.has(cell.type)) continue;
          visitedThisWave.add(nk);
          // Claim grass tiles that need mowing
          if (cell.type === "grass" && (cell.grassHeight ?? 0) >= mowThreshold) {
            assigned.add(nk);
            buckets.get(mowers[mi].id)!.push({ x: nx, y: ny });
            totalAssigned++;
            anyProgress = true;
          }
          // Continue BFS through all walkable tiles
          nextQueue.push({ x: nx, y: ny });
        }
      }
      queues[mi] = nextQueue;
    }
    if (!anyProgress) break; // no more grass tiles reachable
    maxWaves++;
  }

  // ── Step 3: Rebalance — move boundary tiles, ALWAYS maintain connectivity ──
  if (mowers.length > 1) {
    const avgTiles = Math.ceil(grassTiles.length / mowers.length);
    const maxTiles = Math.floor(avgTiles * 1.2);

    const tileOwner = new Map<string, string>();
    for (const m of mowers) {
      for (const t of buckets.get(m.id) ?? []) tileOwner.set(`${t.x},${t.y}`, m.id);
    }

    /** Check if removing a tile from a bucket keeps the remaining tiles connected to station. */
    function canRemoveTile(bucket: Array<{ x: number; y: number }>, tile: { x: number; y: number }, station: { x: number; y: number }, ownerId: string): boolean {
      if (bucket.length <= 1) return false; // can't remove last tile
      const remaining = bucket.filter((t) => t.x !== tile.x || t.y !== tile.y);
      const tileSet = new Set(remaining.map((t) => `${t.x},${t.y}`));
      tileSet.add(`${station.x},${station.y}`);
      const reachable = floodFillReachable(station.x, station.y, tileSet, cells, width, height, tileOwner, ownerId);
      return remaining.every((t) => reachable.has(`${t.x},${t.y}`));
    }

    /** Check if adding a tile to a bucket keeps it connected AND reachable from station. */
    function canAddTile(bucket: Array<{ x: number; y: number }>, tile: { x: number; y: number }, station: { x: number; y: number }, ownerId: string): boolean {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      const hasAdj = dirs.some(([dx, dy]) => bucket.some((t) => t.x === tile.x + dx && t.y === tile.y + dy));
      if (!hasAdj) return false;
      // Full connectivity: all tiles must be reachable from station through walkable terrain
      const candidate = [...bucket, tile];
      const candidateSet = new Set(candidate.map((t) => `${t.x},${t.y}`));
      candidateSet.add(`${station.x},${station.y}`);
      const reachable = floodFillReachable(station.x, station.y, candidateSet, cells, width, height, tileOwner, ownerId);
      return candidate.every((t) => reachable.has(`${t.x},${t.y}`));
    }

    let rebalanced = true, iterations = 0;
    while (rebalanced && iterations < 20) {
      rebalanced = false;
      for (const m of mowers) {
        const bucket = buckets.get(m.id)!;
        if (bucket.length <= maxTiles) continue;

        const st = stationMap.get(m.id)!;
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        const scored = bucket.map((t) => {
          let adj = 0;
          for (const [dx, dy] of dirs) {
            const nk = `${t.x + dx},${t.y + dy}`;
            if (tileOwner.get(nk) && tileOwner.get(nk) !== m.id) adj++;
          }
          return { ...t, adj, dist: Math.abs(t.x - st.x) + Math.abs(t.y - st.y) };
        });
        scored.sort((a, b) => b.adj - a.adj || b.dist - a.dist);

        for (const tile of scored) {
          if (bucket.length <= maxTiles) break;

          // Find adjacent mower with lowest load
          let bestOtherId = "";
          let bestLoad = Infinity;
          for (const [dx, dy] of dirs) {
            const nk = `${tile.x + dx},${tile.y + dy}`;
            const owner = tileOwner.get(nk);
            if (owner && owner !== m.id) {
              const otherBucket = buckets.get(owner);
              if (otherBucket && otherBucket.length < bestLoad) {
                bestLoad = otherBucket.length;
                bestOtherId = owner;
              }
            }
          }
          if (!bestOtherId) continue;

          // CRITICAL: check connectivity on BOTH sides
          const otherBucket = buckets.get(bestOtherId)!;
          if (!canRemoveTile(bucket, tile, st, m.id)) continue; // would disconnect source zone
          const otherSt = stationMap.get(bestOtherId)!;
          if (!canAddTile(otherBucket, tile, otherSt, bestOtherId)) continue; // would create island in target zone

          const idx = bucket.findIndex((t) => t.x === tile.x && t.y === tile.y);
          if (idx >= 0) bucket.splice(idx, 1);
          otherBucket.push(tile);
          tileOwner.set(`${tile.x},${tile.y}`, bestOtherId);
          rebalanced = true;
        }
      }
      iterations++;
    }
  }

  // ── Step 4: Merge small isolated clusters into adjacent zones ──────────
  // Find connected components per zone. Small clusters (<=5 tiles) that are
  // adjacent to another mower's zone get merged into that zone.
  const tileOwner = new Map<string, string>();
  for (const m of mowers) {
    for (const t of buckets.get(m.id) ?? []) tileOwner.set(`${t.x},${t.y}`, m.id);
  }

  const MAX_CLUSTER_SIZE = 5;
  let merged = true;
  let mergeIterations = 0;
  while (merged && mergeIterations < 10) {
    merged = false;
    for (const m of mowers) {
      const bucket = buckets.get(m.id)!;
      if (bucket.length === 0) continue;
      const st = stationMap.get(m.id);
      if (!st) continue;

      // Find connected components via flood fill
      const bucketSet = new Set(bucket.map((t) => `${t.x},${t.y}`));
      const visited = new Set<string>();
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

      for (const tile of bucket) {
        const key = `${tile.x},${tile.y}`;
        if (visited.has(key)) continue;

        // Flood fill this component
        const component: Array<{ x: number; y: number }> = [];
        const stack = [tile];
        while (stack.length > 0) {
          const t = stack.pop()!;
          const tk = `${t.x},${t.y}`;
          if (visited.has(tk)) continue;
          if (!bucketSet.has(tk)) continue;
          visited.add(tk);
          component.push(t);
          for (const [dx, dy] of dirs) stack.push({ x: t.x + dx, y: t.y + dy });
        }

        // Small isolated cluster? Check if it's adjacent to another mower's zone
        if (component.length > MAX_CLUSTER_SIZE) continue;

        // Find an adjacent mower that owns tiles next to this cluster
        let bestOtherId = "";
        for (const t of component) {
          for (const [dx, dy] of dirs) {
            const nk = `${t.x + dx},${t.y + dy}`;
            const owner = tileOwner.get(nk);
            if (owner && owner !== m.id) { bestOtherId = owner; break; }
          }
          if (bestOtherId) break;
        }

        if (!bestOtherId) continue;

        // Move entire cluster to the adjacent mower
        const otherBucket = buckets.get(bestOtherId)!;
        for (const t of component) {
          const idx = bucket.findIndex((bt) => bt.x === t.x && bt.y === t.y);
          if (idx >= 0) bucket.splice(idx, 1);
          otherBucket.push(t);
          tileOwner.set(`${t.x},${t.y}`, bestOtherId);
        }
        merged = true;
      }
    }
    mergeIterations++;
  }

  // ── Step 5: Tour — nearest-neighbor from station ────────────────────────
  for (const m of mowers) {
    const st = stationMap.get(m.id);
    const rawTiles = buckets.get(m.id) ?? [];
    const tiles = rawTiles.filter((t) => {
      const c = cells.get(`${t.x},${t.y}`);
      return c && c.type === "grass" && (c.grassHeight ?? 0) >= mowThreshold;
    });
    if (!st || tiles.length === 0) { tours.set(m.id, []); perimeters.set(m.id, []); tripsMap.set(m.id, []); continue; }

    const sorted = sortTilesNearestNeighbor(tiles, st);
    tours.set(m.id, sorted);

    // Multi-trip
    const drainPerCell = 0.5 / 3;
    const transitDrain = drainPerCell * 0.4;
    let tripStart = 0;
    const tripList: Trip[] = [];
    let tx = st.x, ty = st.y, accDrain = 0;
    for (let i = 0; i < sorted.length; i++) {
      const dTile = Math.abs(sorted[i].x - tx) + Math.abs(sorted[i].y - ty);
      const dReturn = Math.abs(sorted[i].x - st.x) + Math.abs(sorted[i].y - st.y);
      const tileDrain = dTile * transitDrain + drainPerCell;
      const retDrain = dReturn * transitDrain + 5;
      if (accDrain + tileDrain + retDrain > 65 && i > tripStart) {
        tripList.push({ tiles: sorted.slice(tripStart, i), returnToStation: true });
        tripStart = i; accDrain = 0; tx = st.x; ty = st.y;
      }
      accDrain += tileDrain;
      tx = sorted[i].x; ty = sorted[i].y;
    }
    if (tripStart < sorted.length) tripList.push({ tiles: sorted.slice(tripStart), returnToStation: true });
    tripsMap.set(m.id, tripList);

    // Perimeter
    const hw = TILE_WIDTH / 2, hh = TILE_HEIGHT / 2;
    const tileSet = new Set(tiles.map((t) => `${t.x},${t.y}`));
    const edges: PerimeterEdge[] = [];
    for (const t of tiles) {
      const iso = gridToIso(t.x, t.y);
      if (!tileSet.has(`${t.x - 1},${t.y}`)) edges.push({ x1: iso.x - hw, y1: iso.y, x2: iso.x, y2: iso.y - hh });
      if (!tileSet.has(`${t.x},${t.y - 1}`)) edges.push({ x1: iso.x, y1: iso.y - hh, x2: iso.x + hw, y2: iso.y });
      if (!tileSet.has(`${t.x},${t.y + 1}`)) edges.push({ x1: iso.x, y1: iso.y + hh, x2: iso.x - hw, y2: iso.y });
      if (!tileSet.has(`${t.x + 1},${t.y}`)) edges.push({ x1: iso.x + hw, y1: iso.y, x2: iso.x, y2: iso.y + hh });
    }
    perimeters.set(m.id, edges);
  }
  return { tours, perimeters, trips: tripsMap };
}
