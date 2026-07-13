import { DEMOS } from "../src/lib/demos";
import { WALKABLE } from "../src/lib/pathfinding";
import type { CellData } from "../src/lib/types";

function floodFillDebug(
  startX: number, startY: number,
  targetTiles: Set<string>,
  cells: Map<string, CellData>,
  width: number, height: number,
): { reachable: Set<string>; reachableTargets: number } {
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
  let reachableTargets = 0;
  for (const key of targetTiles) {
    if (visited.has(key)) reachableTargets++;
  }
  return { reachable: visited, reachableTargets };
}

// Test maze demo (disconnected)
const demo = DEMOS.find((d) => d.id === "maze")!;
const layout = demo.build();
const cells = new Map<string, CellData>();
for (const c of layout.cells) {
  cells.set(`${c.x},${c.y}`, { type: c.type, grassHeight: c.grassHeight ?? (c.type === "grass" ? 60 : 0), lastMowed: 0 });
}

// Station at (1,1)
const targetTiles = new Set<string>();
for (let y = 0; y < demo.height; y++) {
  for (let x = 0; x < demo.width; x++) {
    const c = cells.get(`${x},${y}`);
    if (c && c.type === "grass" && (c.grassHeight ?? 0) >= 30) {
      targetTiles.add(`${x},${y}`);
    }
  }
}

const result = floodFillDebug(1, 1, targetTiles, cells, demo.width, demo.height);
console.log(`Target tiles: ${targetTiles.size}`);
console.log(`Reachable targets: ${result.reachableTargets}`);
console.log(`Unreachable: ${targetTiles.size - result.reachableTargets}`);

// Find some unreachable tiles
const unreachable: string[] = [];
for (const key of targetTiles) {
  if (!result.reachable.has(key)) unreachable.push(key);
}
console.log(`First 20 unreachable: ${unreachable.slice(0, 20).join(", ")}`);

// Check what's around an unreachable tile
if (unreachable.length > 0) {
  const [ux, uy] = unreachable[0].split(",").map(Number);
  console.log(`\nAround (${ux},${uy}):`);
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = ux + dx, ny = uy + dy;
    const c = cells.get(`${nx},${ny}`);
    console.log(`  (${nx},${ny}) type=${c?.type ?? "MISSING"} walkable=${c ? WALKABLE.has(c.type) : false}`);
  }
}
