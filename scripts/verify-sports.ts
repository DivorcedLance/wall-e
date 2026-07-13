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

let bad = 0;
for (const m of mowers) {
  const tiles = tours.get(m.id) ?? [];
  for (const t of tiles) {
    const c = cells.get(`${t.x},${t.y}`);
    if (!c || c.type !== "grass") {
      bad++;
      console.log(`BAD: ${m.name} (${t.x},${t.y}) type=${c?.type ?? "null"}`);
    }
  }
}
console.log(bad === 0 ? "All tiles are grass ✓" : `${bad} non-grass tiles found`);
