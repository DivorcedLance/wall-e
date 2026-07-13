import { DEMOS } from "../src/lib/demos";
import { computeCoverageTours, assignStationsToMowers } from "../src/lib/fleet";
import type { Mower, ChargingStation, CellData } from "../src/lib/types";

const demo = DEMOS.find((d) => d.id === "sports")!;
const layout = demo.build();

// Build cell map the same way loadSpace does
const cells = new Map<string, CellData>();
for (const c of layout.cells) {
  cells.set(`${c.x},${c.y}`, {
    type: c.type,
    grassHeight: c.grassHeight ?? (c.type === "grass" ? 50 : 0),
    lastMowed: 0,
  });
}

// Count by type
const typeCounts: Record<string, number> = {};
for (const [, c] of cells) {
  typeCounts[c.type] = (typeCounts[c.type] ?? 0) + 1;
}
console.log("Cell types:", typeCounts);

// Check the running track border area
console.log("\nRunning track border area (x=2 or 13, y=18-29):");
for (let y = 18; y <= 29; y++) {
  for (const x of [2, 13]) {
    const c = cells.get(`${x},${y}`);
    console.log(`  (${x},${y}) type=${c?.type ?? "MISSING"} h=${c?.grassHeight}`);
  }
}

// Check basketball court area
console.log("\nBasketball court area (y=2, x=17-29):");
for (let x = 17; x <= 29; x++) {
  const c = cells.get(`${x},2`);
  process.stdout.write(`(${c?.type?.[0] ?? "?"}) `);
}
console.log();

// Check the row y=16 (first row of running track interior)
console.log("\nRow y=16 (x=1-14):");
for (let x = 1; x <= 14; x++) {
  const c = cells.get(`${x},16`);
  process.stdout.write(`(${c?.type?.[0] ?? "?"}) `);
}
console.log();

// Now run fleet computation
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

// Check what's in each mower's tour
for (const m of mowers) {
  const tiles = tours.get(m.id) ?? [];
  const bad = tiles.filter((t) => {
    const c = cells.get(`${t.x},${t.y}`);
    return !c || c.type !== "grass";
  });
  console.log(`\n${m.name}: ${tiles.length} tiles, ${bad.length} non-grass`);
  if (bad.length > 0) {
    for (const t of bad.slice(0, 10)) {
      const c = cells.get(`${t.x},${t.y}`);
      console.log(`  (${t.x},${t.y}) type=${c?.type ?? "MISSING"} h=${c?.grassHeight}`);
    }
  }
}
