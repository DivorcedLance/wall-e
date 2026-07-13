import { DEMOS } from "../src/lib/demos";
import { computeCoverageTours, assignStationsToMowers } from "../src/lib/fleet";
import { WALKABLE } from "../src/lib/pathfinding";
import type { Mower, ChargingStation, CellData } from "../src/lib/types";

const demo = DEMOS.find((d) => d.id === "maze")!;
const layout = demo.build();
const cells = new Map<string, CellData>();
for (const c of layout.cells) {
  cells.set(`${c.x},${c.y}`, { type: c.type, grassHeight: c.grassHeight ?? (c.type === "grass" ? 60 : 0), lastMowed: 0 });
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

// Check station assignments
for (const m of mowers) {
  const st = stationMap.get(m.id);
  console.log(`${m.name}: station at (${st?.x},${st?.y})`);
}

// Run fleet
const { tours } = computeCoverageTours(mowers, cells, demo.width, demo.height, 30, stationMap);

// Check each mower's tiles
for (const m of mowers) {
  const tiles = tours.get(m.id) ?? [];
  const st = stationMap.get(m.id)!;
  console.log(`\n${m.name}: ${tiles.length} tiles`);

  // Check connectivity manually
  const targetTiles = new Set(tiles.map((t) => `${t.x},${t.y}`));
  targetTiles.add(`${st.x},${st.y}`);

  const visited = new Set<string>();
  const stack = [{ x: st.x, y: st.y }];
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
    if (x < demo.width - 1) stack.push({ x: x + 1, y });
    if (y > 0) stack.push({ x, y: y - 1 });
    if (y < demo.height - 1) stack.push({ x, y: y + 1 });
  }

  let reachableTargets = 0;
  for (const key of targetTiles) {
    if (visited.has(key)) reachableTargets++;
  }
  console.log(`  Reachable targets: ${reachableTargets}/${tiles.length}`);

  if (reachableTargets < tiles.length) {
    const unreachable = tiles.filter((t) => !visited.has(`${t.x},${t.y}`));
    console.log(`  Unreachable: ${unreachable.length} tiles`);
    for (const t of unreachable.slice(0, 5)) {
      const c = cells.get(`${t.x},${t.y}`);
      console.log(`    (${t.x},${t.y}) type=${c?.type}`);
      // Check neighbors
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nk = `${t.x+dx},${t.y+dy}`;
        const nc = cells.get(nk);
        const inTarget = targetTiles.has(nk);
        console.log(`      (${t.x+dx},${t.y+dy}) type=${nc?.type ?? "MISSING"} inTarget=${inTarget} walkable=${nc ? WALKABLE.has(nc.type) : false}`);
      }
    }
  }
}
