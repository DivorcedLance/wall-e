import { DEMOS } from "../src/lib/demos";
import { computeCoverageTours, assignStationsToMowers } from "../src/lib/fleet";
import type { Mower, ChargingStation, CellData } from "../src/lib/types";

for (const demo of DEMOS) {
  const layout = demo.build();

  // Check 1: Are there duplicate positions in the cells array?
  const posCount = new Map<string, number>();
  for (const c of layout.cells) {
    const k = `${c.x},${c.y}`;
    posCount.set(k, (posCount.get(k) ?? 0) + 1);
  }
  const dupes = [...posCount.entries()].filter(([, v]) => v > 1);

  // Check 2: What type does each position end up with in the Map?
  const cells = new Map<string, CellData>();
  for (const c of layout.cells) {
    cells.set(`${c.x},${c.y}`, {
      type: c.type,
      grassHeight: c.grassHeight ?? (c.type === "grass" ? 50 : 0),
      lastMowed: 0,
    });
  }

  // Check 3: Count non-grass cells that are surrounded by grass
  let suspiciousCount = 0;
  for (const [key, cell] of cells) {
    if (cell.type === "grass") continue;
    const [x, y] = key.split(",").map(Number);
    // Check if all 4 neighbors are grass
    const neighbors = [
      cells.get(`${x-1},${y}`),
      cells.get(`${x+1},${y}`),
      cells.get(`${x},${y-1}`),
      cells.get(`${x},${y+1}`),
    ];
    const allGrass = neighbors.every((n) => n && n.type === "grass");
    if (allGrass && cell.type !== "charging_station") {
      suspiciousCount++;
      if (suspiciousCount <= 5) {
        console.log(`${demo.id}: suspicious (${x},${y}) type=${cell.type} surrounded by grass`);
      }
    }
  }

  // Check 4: Are there positions with NO cell?
  let missingCount = 0;
  for (let y = 0; y < demo.height; y++) {
    for (let x = 0; x < demo.width; x++) {
      if (!cells.has(`${x},${y}`)) {
        missingCount++;
        if (missingCount <= 3) {
          console.log(`${demo.id}: MISSING cell at (${x},${y})`);
        }
      }
    }
  }

  if (dupes.length > 0 || suspiciousCount > 0 || missingCount > 0) {
    console.log(`${demo.id}: ${dupes.length} dupes, ${suspiciousCount} suspicious, ${missingCount} missing`);
  }
}
