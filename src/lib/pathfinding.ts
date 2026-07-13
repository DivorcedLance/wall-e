import type { CellData, CellType } from "@/lib/types";
import { PathPoint } from "@/lib/types";

export const WALKABLE: ReadonlySet<CellType> = new Set<CellType>([
  "grass",
  "path",
  "gravel",
  "sand",
  "charging_station",
]);

export const BLOCKED: ReadonlySet<CellType> = new Set<CellType>([
  "obstacle",
  "building",
  "tree",
  "water",
  "flowers",
  "empty",
]);

export function isWalkable(type: CellType): boolean {
  return WALKABLE.has(type);
}

/** Cost per step for pathfinding. Lower = preferred. Grass is cheapest. */
const PATH_COST: Partial<Record<CellType, number>> = {
  grass: 1.0,
  path: 1.2,
  gravel: 1.15,
  sand: 1.5,
  charging_station: 1.0,
};

function stepCost(type: CellType): number {
  return PATH_COST[type] ?? 1.0;
}

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cells: Map<string, CellData>,
  width: number,
  height: number,
  blocked: ReadonlySet<string> = new Set(),
): PathPoint[] {
  if (!inBounds(endX, endY, width, height)) return [];
  const endKey = `${endX},${endY}`;
  const endCell = cells.get(endKey);
  if (endCell && BLOCKED.has(endCell.type)) return [];

  const open: Node[] = [];
  const closed = new Set<string>();
  const gScore = new Map<string, number>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, endX, endY),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  open.push(startNode);
  gScore.set(`${startX},${startY}`, 0);

  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const key = `${current.x},${current.y}`;
    if (key === endKey) {
      const path: PathPoint[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }
    closed.add(key);
    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!inBounds(nx, ny, width, height)) continue;
      const nKey = `${nx},${ny}`;
      if (closed.has(nKey)) continue;
      if (blocked.has(nKey)) continue;
      const cell = cells.get(nKey);
      if (cell && BLOCKED.has(cell.type) && nKey !== endKey) continue;
      const cost = cell ? stepCost(cell.type) : 1.0;
      const tentativeG = current.g + cost;
      const existing = gScore.get(nKey);
      if (existing !== undefined && tentativeG >= existing) continue;
      gScore.set(nKey, tentativeG);
      const h = heuristic(nx, ny, endX, endY);
      open.push({
        x: nx,
        y: ny,
        g: tentativeG,
        h,
        f: tentativeG + h,
        parent: current,
      });
    }
  }
  return [];
}

export function floodFillCluster(
  startX: number,
  startY: number,
  cells: Map<string, CellData>,
  width: number,
  height: number,
  targetType: CellType,
): Array<{ x: number; y: number }> {
  const visited = new Set<string>();
  const cluster: Array<{ x: number; y: number }> = [];
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;
    if (!inBounds(x, y, width, height)) continue;
    const cell = cells.get(key);
    if (!cell || cell.type !== targetType) continue;
    visited.add(key);
    cluster.push({ x, y });
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }
  return cluster;
}

export function findAllClusters(
  cells: Map<string, CellData>,
  width: number,
  height: number,
  targetType: CellType,
): Array<Array<{ x: number; y: number }>> {
  const visited = new Set<string>();
  const clusters: Array<Array<{ x: number; y: number }>> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      const cell = cells.get(key);
      if (!cell || cell.type !== targetType) continue;
      const cluster = floodFillCluster(x, y, cells, width, height, targetType);
      for (const point of cluster) visited.add(`${point.x},${point.y}`);
      clusters.push(cluster);
    }
  }
  return clusters;
}

export function clusterBounds(
  cluster: Array<{ x: number; y: number }>,
): { minX: number; minY: number; maxX: number; maxY: number; cx: number; cy: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of cluster) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}
