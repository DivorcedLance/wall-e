/**
 * Strategy evaluation script for all demos.
 * Run with: npx tsx scripts/test-strategy.ts
 */
import { DEMOS } from "../src/lib/demos";
import { computeCoverageTours, assignStationsToMowers } from "../src/lib/fleet";
import { WALKABLE } from "../src/lib/pathfinding";
import type { Mower, ChargingStation, CellData, PathPoint } from "../src/lib/types";

interface Evaluation {
  demoId: string;
  demoName: string;
  gridW: number;
  gridH: number;
  mowers: number;
  stations: number;
  totalGrassTiles: number;
  tilesPerMower: number[];
  zoneBalance: number; // max/avg ratio
  allConnected: boolean;
  tourDistances: number[];
  avgTourDist: number;
  tripsPerMower: number[];
  totalTrips: number;
  score: number; // 0-100
}

function floodFillReachable(
  startX: number, startY: number,
  targetTiles: Set<string>,
  cells: Map<string, CellData>,
  width: number, height: number,
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
    }
    visited.add(key);
    if (x > 0) stack.push({ x: x - 1, y });
    if (x < width - 1) stack.push({ x: x + 1, y });
    if (y > 0) stack.push({ x, y: y - 1 });
    if (y < height - 1) stack.push({ x, y: y + 1 });
  }
  return visited;
}

function tourDistance(tiles: PathPoint[], sx: number, sy: number): number {
  if (tiles.length === 0) return 0;
  let dist = 0;
  let cx = sx, cy = sy;
  for (const t of tiles) {
    dist += Math.abs(t.x - cx) + Math.abs(t.y - cy);
    cx = t.x;
    cy = t.y;
  }
  dist += Math.abs(tiles[tiles.length - 1].x - sx) + Math.abs(tiles[tiles.length - 1].y - sy);
  return dist;
}

function evaluateDemo(demoId: string): Evaluation {
  const demo = DEMOS.find((d) => d.id === demoId)!;
  const layout = demo.build();
  const mowThreshold = 30;

  // Build cells map
  const cells = new Map<string, CellData>();
  for (let y = 0; y < demo.height; y++) {
    for (let x = 0; x < demo.width; x++) {
      const existing = layout.cells.find((c) => c.x === x && c.y === y);
      cells.set(`${x},${y}`, {
        type: existing?.type ?? "grass",
        grassHeight: existing?.grassHeight ?? (existing?.type === "grass" ? 100 : 0),
        lastMowed: 0,
      });
    }
  }

  // Create mowers and stations
  const mowers: Mower[] = layout.mowers.map((m, i) => ({
    id: `m${i}`, spaceId: demoId, name: `Mower ${i}`,
    x: m.x, y: m.y, fromX: m.x, fromY: m.y, moveT: 1,
    status: "idle" as const, battery: 100, tier: m.tier,
    path: [], pathIndex: 0,
  }));
  const stations: ChargingStation[] = layout.stations.map((s, i) => ({
    id: `s${i}`, spaceId: demoId, x: s.x, y: s.y, active: true,
  }));

  // Compute strategy
  const stationMap = assignStationsToMowers(mowers, stations);
  const { tours, perimeters, trips } = computeCoverageTours(
    mowers, cells, demo.width, demo.height, mowThreshold, stationMap,
  );

  // Count total grass tiles
  let totalGrass = 0;
  for (const [, cell] of cells) {
    if (cell.type === "grass" && cell.grassHeight >= mowThreshold) totalGrass++;
  }

  // Evaluate per-mower
  const tilesPerMower: number[] = [];
  const tourDistances: number[] = [];
  const tripsPerMower: number[] = [];
  let allConnected = true;

  for (const m of mowers) {
    const tiles = tours.get(m.id) ?? [];
    tilesPerMower.push(tiles.length);

    const st = stationMap.get(m.id)!;
    const dist = tourDistance(tiles, st.x, st.y);
    tourDistances.push(dist);

    const mowerTrips = trips?.get(m.id) ?? [];
    tripsPerMower.push(mowerTrips.length);

    // Check connectivity
    if (tiles.length > 0) {
      const targetTiles = new Set(tiles.map((t) => `${t.x},${t.y}`));
      targetTiles.add(`${st.x},${st.y}`);
      const reachable = floodFillReachable(st.x, st.y, targetTiles, cells, demo.width, demo.height);
      let reachableCount = 0;
      for (const key of targetTiles) {
        if (reachable.has(key)) reachableCount++;
      }
      if (reachableCount < tiles.length) allConnected = false;
    }
  }

  const avgTiles = totalGrass / mowers.length;
  const maxTiles = Math.max(...tilesPerMower);
  const zoneBalance = avgTiles > 0 ? maxTiles / avgTiles : 1;
  const avgTourDist = tourDistances.reduce((a, b) => a + b, 0) / tourDistances.length;
  const totalTrips = tripsPerMower.reduce((a, b) => a + b, 0);

  // Score calculation
  let score = 100;
  if (zoneBalance > 2.0) score -= 20;
  else if (zoneBalance > 1.5) score -= 10;
  if (!allConnected) score -= 30;
  if (totalGrass === 0) score -= 20;
  if (avgTourDist > demo.width * demo.height * 0.5) score -= 10;

  return {
    demoId,
    demoName: demo.name,
    gridW: demo.width,
    gridH: demo.height,
    mowers: mowers.length,
    stations: stations.length,
    totalGrassTiles: totalGrass,
    tilesPerMower,
    zoneBalance,
    allConnected,
    tourDistances,
    avgTourDist: Math.round(avgTourDist),
    tripsPerMower,
    totalTrips,
    score: Math.max(0, score),
  };
}

// ── Run evaluations ─────────────────────────────────────────────────────────

console.log("╔══════════════════════════════════════════════════════════════════════════╗");
console.log("║              W.A.L.L.-E. Strategy Evaluation - All Demos                ║");
console.log("╚══════════════════════════════════════════════════════════════════════════╝\n");

const results: Evaluation[] = [];
for (const demo of DEMOS) {
  results.push(evaluateDemo(demo.id));
}

for (const r of results) {
  const bal = r.zoneBalance.toFixed(2);
  const conn = r.allConnected ? "✓" : "✗";
  console.log(`[${r.score >= 80 ? "✓" : r.score >= 60 ? "~" : "✗"}] ${r.demoName} (${r.gridW}×${r.gridH}) — Score: ${r.score}/100`);
  console.log(`    Mowers: ${r.mowers} | Stations: ${r.stations} | Grass: ${r.totalGrassTiles} tiles`);
  console.log(`    Tiles/mower: [${r.tilesPerMower.join(", ")}] | Balance: ${bal}x | Connected: ${conn}`);
  console.log(`    Tour dist: [${r.tourDistances.join(", ")}] | Avg: ${r.avgTourDist}`);
  console.log(`    Trips: [${r.tripsPerMower.join(", ")}] | Total: ${r.totalTrips}`);
  console.log("");
}

const avgScore = results.reduce((a, r) => a + r.score, 0) / results.length;
const allConnected = results.every((r) => r.allConnected);
const allBalanced = results.every((r) => r.zoneBalance <= 1.5);

console.log("══════════════════════════════════════════════════════════════════════════");
console.log(`SUMMARY: Avg Score: ${avgScore.toFixed(0)}/100 | All Connected: ${allConnected ? "✓" : "✗"} | All Balanced: ${allBalanced ? "✓" : "✗"}`);
console.log("══════════════════════════════════════════════════════════════════════════");
