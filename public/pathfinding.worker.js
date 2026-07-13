// Pathfinding Web Worker
// Runs A* pathfinding off the main thread

interface PathRequest {
  id: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  cells: Array<{ key: string; type: string; walkable: boolean }>;
  width: number;
  height: number;
  terrainCosts: Record<string, number>;
}

interface PathResponse {
  id: string;
  path: Array<{ x: number; y: number }>;
}

const WALKABLE = new Set(["grass", "path", "gravel", "sand", "charging_station"]);

self.onmessage = (e: MessageEvent<PathRequest>) => {
  const { id, sx, sy, tx, ty, cells, width, height, terrainCosts } = e.data;

  const cellMap = new Map(cells.map((c) => [c.key, c]));

  const heuristic = (x: number, y: number) => Math.abs(x - tx) + Math.abs(y - ty);

  const openSet: Array<{ x: number; y: number; g: number; f: number; px: number; py: number }> = [];
  const closed = new Set<string>();
  const cameFrom = new Map<string, { x: number; y: number }>();
  const gScore = new Map<string, number>();

  const startKey = `${sx},${sy}`;
  gScore.set(startKey, 0);
  openSet.push({ x: sx, y: sy, g: 0, f: heuristic(sx, sy), px: sx, py: sy });

  const targetKey = `${tx},${ty}`;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = `${current.x},${current.y}`;

    if (currentKey === targetKey) {
      // Reconstruct path
      const path: Array<{ x: number; y: number }> = [{ x: tx, y: ty }];
      let cur: { x: number; y: number } | undefined = cameFrom.get(targetKey);
      while (cur && !(cur.x === sx && cur.y === sy)) {
        path.unshift(cur);
        cur = cameFrom.get(`${cur.x},${cur.y}`);
      }
      path.unshift({ x: sx, y: sy });
      (self as any).postMessage({ id, path } as PathResponse);
      return;
    }

    closed.add(currentKey);

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nKey = `${nx},${ny}`;
      if (closed.has(nKey)) continue;

      const cell = cellMap.get(nKey);
      if (!cell || !WALKABLE.has(cell.type)) continue;

      const cost = terrainCosts[cell.type] ?? 1.0;
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + cost;

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, { x: current.x, y: current.y });
        const f = tentativeG + heuristic(nx, ny);
        const existing = openSet.find((n) => n.x === nx && n.y === ny);
        if (existing) {
          existing.g = tentativeG;
          existing.f = f;
          existing.px = current.x;
          existing.py = current.y;
        } else {
          openSet.push({ x: nx, y: ny, g: tentativeG, f, px: current.x, py: current.y });
        }
      }
    }
  }

  // No path found
  (self as any).postMessage({ id, path: [] } as PathResponse);
};
