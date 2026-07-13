/**
 * Diagnostic: find non-grass tiles in tours for all demos.
 * Run with: npx tsx scripts/diagnose-tiles.ts
 */
import { DEMOS } from "../src/lib/demos";
import { computeCoverageTours, assignStationsToMowers } from "../src/lib/fleet";
import type { Mower, ChargingStation, CellData } from "../src/lib/types";

for (const demo of DEMOS) {
  const layout = demo.build();
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

  let hasIssue = false;
  for (const m of mowers) {
    const tiles = tours.get(m.id) ?? [];
    const bad = tiles.filter((t) => {
      const c = cells.get(`${t.x},${t.y}`);
      return !c || c.type !== "grass";
    });
    if (bad.length > 0) {
      if (!hasIssue) console.log(`\n=== ${demo.id} (${demo.name}) ===`);
      hasIssue = true;
      console.log(`  ${m.name}: ${bad.length} non-grass tiles:`);
      for (const t of bad.slice(0, 20)) {
        const c = cells.get(`${t.x},${t.y}`);
        console.log(`    (${t.x},${t.y}) type=${c?.type ?? "MISSING"} grassHeight=${c?.grassHeight}`);
      }
      if (bad.length > 20) console.log(`    ... and ${bad.length - 20} more`);
    }
  }
  if (!hasIssue) process.stdout.write(".");
}

console.log("\nDone.");
