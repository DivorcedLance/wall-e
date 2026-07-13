import { DEMOS } from "../src/lib/demos";

const demo = DEMOS.find((d) => d.id === "sports")!;
const layout = demo.build();

// Count cells at specific positions
for (const pos of [[2,18],[13,18],[2,19],[13,19],[2,17],[13,17],[1,16],[14,16]]) {
  const [x,y] = pos;
  const cells = layout.cells.filter((c) => c.x === x && c.y === y);
  console.log(`(${x},${y}): ${cells.length} cells`, cells.map((c) => `${c.type}(h=${c.grassHeight})`));
}

// What y-range does the running track loop create?
console.log("\nRunning track gravel cells (x=2, y range):");
const trackV = layout.cells.filter((c) => c.x === 2 && c.type === "gravel");
console.log(trackV.map((c) => c.y).sort((a,b) => a-b));

console.log("\nRunning track gravel cells (y=17, x range):");
const trackH = layout.cells.filter((c) => c.y === 17 && c.type === "gravel");
console.log(trackH.map((c) => c.x).sort((a,b) => a-b));

console.log("\nRunning track gravel cells (y=29, x range):");
const trackH2 = layout.cells.filter((c) => c.y === 29 && c.type === "gravel");
console.log(trackH2.map((c) => c.x).sort((a,b) => a-b));

// fillGrass cells at the problematic positions
const fillGrassCells = layout.cells.filter((c) => c.x === 2 && c.y === 18);
console.log("\nAll cells at (2,18):", fillGrassCells);
