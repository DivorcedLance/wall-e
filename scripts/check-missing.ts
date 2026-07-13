import { DEMOS } from "../src/lib/demos";

for (const demo of DEMOS) {
  const layout = demo.build();
  const cells = new Map<string, { type: string; h: number }>();
  for (const c of layout.cells) {
    cells.set(`${c.x},${c.y}`, { type: c.type, h: c.grassHeight ?? 0 });
  }

  const missing: string[] = [];
  for (let y = 0; y < demo.height; y++) {
    for (let x = 0; x < demo.width; x++) {
      if (!cells.has(`${x},${y}`)) missing.push(`(${x},${y})`);
    }
  }
  if (missing.length > 0) {
    console.log(`${demo.id}: ${missing.length} missing cells: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`);
  }
}
