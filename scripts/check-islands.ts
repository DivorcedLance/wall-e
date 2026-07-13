import { DEMOS } from "../src/lib/demos";
import { computeCoverageTours, assignStationsToMowers } from "../src/lib/fleet";
import type { Mower, ChargingStation, CellData } from "../src/lib/types";

const demo = DEMOS.find((d) => d.id === "sports")!;
const layout = demo.build();
const cells = new Map<string, CellData>();
for (const c of layout.cells) {
  cells.set(`${c.x},${c.y}`, { type: c.type, grassHeight: c.grassHeight ?? (c.type === "grass" ? 75 : 0), lastMowed: 0 });
}

const mowers: Mower[] = layout.mowers.map((m, i) => ({
  id: `m${i}`, spaceId: demo.id, name: `Mower ${i}`,
  x: m.x, y: m.y, fromX: m.x, fromY: m.y, moveT: 1,
  status: "idle" as const, battery: 100, tier: m.tier, path: [], pathIndex: 0,
}));
const stations: ChargingStation[] = layout.stations.map((s, i) => ({
  id: `s${i}`, spaceId: demo.id, x: s.x, y: s.y, active: true,
}));

const stationMap = assignStationsToMowers(mowers, stations);
const { tours } = computeCoverageTours(mowers, cells, demo.width, demo.height, 30, stationMap);

// Check for small clusters (<=3 tiles) in each zone
const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
for (const m of mowers) {
  const tiles = tours.get(m.id) ?? [];
  if (tiles.length === 0) continue;
  const tileSet = new Set(tiles.map((t) => `${t.x},${t.y}`));
  const visited = new Set<string>();

  for (const tile of tiles) {
    const key = `${tile.x},${tile.y}`;
    if (visited.has(key)) continue;

    // Flood fill cluster
    const cluster: Array<{ x: number; y: number }> = [];
    const stack = [tile];
    while (stack.length > 0) {
      const t = stack.pop()!;
      const tk = `${t.x},${t.y}`;
      if (visited.has(tk)) continue;
      if (!tileSet.has(tk)) continue;
      visited.add(tk);
      cluster.push(t);
      for (const [dx, dy] of dirs) stack.push({ x: t.x + dx, y: t.y + dy });
    }

    // Check if this cluster is adjacent to another mower's tiles
    let adjacentToOther = false;
    for (const t of cluster) {
      for (const [dx, dy] of dirs) {
        const nk = `${t.x + dx},${t.y + dy}`;
        if (!tileSet.has(nk)) {
          // Check if another mower owns this neighbor
          for (const other of mowers) {
            if (other.id === m.id) continue;
            const otherTiles = tours.get(other.id) ?? [];
            if (otherTiles.some((ot) => `${ot.x},${ot.y}` === nk)) {
              adjacentToOther = true;
            }
          }
        }
      }
    }

    if (cluster.length <= 3 && adjacentToOther) {
      console.log(`${m.name}: small cluster (${cluster.length} tiles) adjacent to another mower:`);
      for (const t of cluster) {
        // Find which neighbor belongs to another mower
        for (const [dx, dy] of dirs) {
          const nk = `${t.x + dx},${t.y + dy}`;
          for (const other of mowers) {
            if (other.id === m.id) continue;
            const otherTiles = tours.get(other.id) ?? [];
            if (otherTiles.some((ot) => `${ot.x},${ot.y}` === nk)) {
              console.log(`  (${t.x},${t.y}) adjacent to ${other.name} at (${t.x + dx},${t.y + dy})`);
            }
          }
        }
      }
    }
  }
}

console.log("Done.");
