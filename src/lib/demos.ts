import type { CellType, MowerTier } from "@/lib/types";

export interface DemoCell {
  x: number;
  y: number;
  type: CellType;
  grassHeight?: number;
}

export interface DemoMower {
  x: number;
  y: number;
  tier: MowerTier;
}

export interface DemoStation {
  x: number;
  y: number;
}

export interface DemoLayout {
  cells: DemoCell[];
  mowers: DemoMower[];
  stations: DemoStation[];
}

export interface DemoDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  width: number;
  height: number;
  build: () => DemoLayout;
}

function fillGrass(
  w: number,
  h: number,
  baseHeight: number,
  variance: number,
  exclude: Array<{ x: number; y: number }> = [],
): DemoCell[] {
  const cells: DemoCell[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (exclude.some((e) => e.x === x && e.y === y)) continue;
      cells.push({ x, y, type: "grass", grassHeight: baseHeight });
    }
  }
  return cells;
}

function rect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  type: CellType,
  grassHeight?: number,
): DemoCell[] {
  const cells: DemoCell[] = [];
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      cells.push({ x, y, type, grassHeight });
    }
  }
  return cells;
}

function treeCluster(cx: number, cy: number, size: number): DemoCell[] {
  const cells: DemoCell[] = [];
  for (let y = cy; y < cy + size; y++) {
    for (let x = cx; x < cx + size; x++) {
      cells.push({ x, y, type: "tree" });
    }
  }
  return cells;
}

export const DEMOS: DemoDefinition[] = [
  {
    id: "starter",
    name: "Campo Abierto",
    description: "20×20 — Jardín amplio con una estación y una podadora. Ideal para empezar.",
    emoji: "leaf",
    width: 20,
    height: 20,
    build: () => {
      const cells: DemoCell[] = [];
      cells.push(...rect(0, 0, 19, 0, "path"));
      cells.push(...rect(0, 19, 19, 19, "path"));
      cells.push(...rect(0, 0, 0, 19, "path"));
      cells.push(...rect(19, 0, 19, 19, "path"));
      const reserved = [
        { x: 0, y: 0 },
        { x: 19, y: 0 },
        { x: 0, y: 19 },
        { x: 19, y: 19 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 18, y: 0 },
        { x: 19, y: 1 },
        { x: 1, y: 19 },
        { x: 0, y: 18 },
        { x: 18, y: 19 },
        { x: 19, y: 18 },
      ];
      cells.push(...fillGrass(20, 20, 50, 30, reserved));
      return {
        cells,
        mowers: [
          { x: 10, y: 10, tier: "standard" },
        ],
        stations: [{ x: 1, y: 1 }],
      };
    },
  },
  {
    id: "grove",
    name: "Arboleda Central",
    description: "18×18 — Dos bosquecillos de árboles, caminos perimetrales y flores decorativas.",
    emoji: "trees",
    width: 18,
    height: 18,
    build: () => {
      const cells: DemoCell[] = [];
      cells.push(...rect(0, 0, 17, 0, "path"));
      cells.push(...rect(0, 17, 17, 17, "path"));
      cells.push(...rect(0, 0, 0, 17, "path"));
      cells.push(...rect(17, 0, 17, 17, "path"));
      cells.push(...treeCluster(2, 2, 3));
      cells.push(...treeCluster(13, 13, 3));
      cells.push(...treeCluster(2, 13, 2));
      cells.push(...treeCluster(13, 2, 2));
      cells.push(...rect(7, 7, 10, 10, "flowers", 0));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let y = 0; y < 18; y++) {
        reserved.push({ x: 0, y });
        reserved.push({ x: 17, y })
        reserved.push({ x: y === 17 ? 17 : 0, y: 17 });
      }
      for (let x = 1; x < 17; x++) {
        reserved.push({ x, y: 0 });
        reserved.push({ x, y: 17 });
      }
      for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) reserved.push({ x, y });
      for (let y = 13; y < 16; y++) for (let x = 13; x < 16; x++) reserved.push({ x, y });
      for (let y = 13; y < 15; y++) for (let x = 2; x < 4; x++) reserved.push({ x, y });
      for (let y = 2; y < 4; y++) for (let x = 13; x < 15; x++) reserved.push({ x, y });
      for (let y = 7; y <= 10; y++) for (let x = 7; x <= 10; x++) reserved.push({ x, y });
      cells.push(...fillGrass(18, 18, 55, 30, reserved));
      return {
        cells,
        mowers: [
          { x: 6, y: 6, tier: "standard" },
          { x: 11, y: 11, tier: "premium" },
        ],
        stations: [{ x: 1, y: 1 }, { x: 16, y: 16 }],
      };
    },
  },
  {
    id: "maze",
    name: "Laberinto Verde",
    description: "22×22 — Caminos en zigzag, obstáculos de agua y grava, 2 podadoras.",
    emoji: "route",
    width: 22,
    height: 22,
    build: () => {
      const cells: DemoCell[] = [];
      // Perimeter path
      cells.push(...rect(0, 0, 21, 0, "path"));
      cells.push(...rect(0, 21, 21, 21, "path"));
      cells.push(...rect(0, 0, 0, 21, "path"));
      cells.push(...rect(21, 0, 21, 21, "path"));
      // Horizontal paths
      cells.push(...rect(3, 5, 18, 5, "path"));
      cells.push(...rect(3, 11, 18, 11, "path"));
      cells.push(...rect(3, 17, 18, 17, "path"));
      // Vertical connectors
      cells.push(...rect(8, 0, 8, 5, "path"));
      cells.push(...rect(15, 5, 15, 11, "path"));
      cells.push(...rect(8, 11, 8, 17, "path"));
      cells.push(...rect(15, 17, 15, 21, "path"));
      // Decorative obstacles
      cells.push(...rect(4, 14, 6, 16, "water"));
      cells.push(...rect(11, 2, 13, 3, "gravel"));
      cells.push(...rect(17, 13, 19, 15, "gravel"));
      cells.push(...rect(10, 18, 12, 19, "flowers", 0));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 22; x++) reserved.push({ x, y: 0 }, { x, y: 21 });
      for (let y = 0; y < 22; y++) reserved.push({ x: 0, y }, { x: 21, y });
      for (let x = 3; x <= 18; x++) reserved.push({ x, y: 5 }, { x, y: 11 }, { x, y: 17 });
      for (let y = 0; y <= 5; y++) reserved.push({ x: 8, y });
      for (let y = 5; y <= 11; y++) reserved.push({ x: 15, y });
      for (let y = 11; y <= 17; y++) reserved.push({ x: 8, y });
      for (let y = 17; y <= 21; y++) reserved.push({ x: 15, y });
      for (let y = 14; y <= 16; y++) for (let x = 4; x <= 6; x++) reserved.push({ x, y });
      for (let y = 2; y <= 3; y++) for (let x = 11; x <= 13; x++) reserved.push({ x, y });
      for (let y = 13; y <= 15; y++) for (let x = 17; x <= 19; x++) reserved.push({ x, y });
      for (let y = 18; y <= 19; y++) for (let x = 10; x <= 12; x++) reserved.push({ x, y });
      cells.push(...fillGrass(22, 22, 60, 25, reserved));
      return {
        cells,
        mowers: [
          { x: 2, y: 2, tier: "standard" },
          { x: 19, y: 19, tier: "standard" },
        ],
        stations: [{ x: 1, y: 1 }, { x: 20, y: 20 }],
      };
    },
  },
  {
    id: "facility",
    name: "Instalación Completa",
    description: "25×25 — Edificios, árboles, agua, flores, grava y arena. Escenario realista.",
    emoji: "building",
    width: 25,
    height: 25,
    build: () => {
      const cells: DemoCell[] = [];
      // Perimeter
      cells.push(...rect(0, 0, 24, 0, "path"));
      cells.push(...rect(0, 24, 24, 24, "path"));
      cells.push(...rect(0, 0, 0, 24, "path"));
      cells.push(...rect(24, 0, 24, 24, "path"));
      // Building in NW
      cells.push(...rect(2, 2, 6, 5, "building"));
      // Pond (water) in SE
      for (let y = 18; y < 23; y++) {
        for (let x = 16; x < 23; x++) {
          cells.push({ x, y, type: "water" });
        }
      }
      // Sand patch near pond
      cells.push(...rect(14, 21, 16, 23, "sand"));
      // Gravel area
      cells.push(...rect(2, 20, 7, 23, "gravel"));
      // Tree clusters
      cells.push(...treeCluster(10, 3, 3));
      cells.push(...treeCluster(18, 6, 2));
      cells.push(...treeCluster(4, 14, 2));
      // Flower beds
      cells.push(...rect(9, 9, 11, 10, "flowers", 0));
      cells.push(...rect(13, 14, 15, 15, "flowers", 0));
      // Path
      cells.push(...rect(2, 12, 22, 12, "path"));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 25; x++) reserved.push({ x, y: 0 }, { x, y: 24 });
      for (let y = 0; y < 25; y++) reserved.push({ x: 0, y }, { x: 24, y });
      for (let y = 2; y <= 5; y++) for (let x = 2; x <= 6; x++) reserved.push({ x, y });
      for (let y = 18; y < 23; y++) for (let x = 16; x < 23; x++) reserved.push({ x, y });
      for (let y = 21; y <= 23; y++) for (let x = 14; x <= 16; x++) reserved.push({ x, y });
      for (let y = 20; y <= 23; y++) for (let x = 2; x <= 7; x++) reserved.push({ x, y });
      for (let y = 3; y <= 5; y++) for (let x = 10; x <= 12; x++) reserved.push({ x, y });
      for (let y = 6; y <= 7; y++) for (let x = 18; x <= 19; x++) reserved.push({ x, y });
      for (let y = 14; y <= 15; y++) for (let x = 4; x <= 5; x++) reserved.push({ x, y });
      for (let y = 9; y <= 10; y++) for (let x = 9; x <= 11; x++) reserved.push({ x, y });
      for (let y = 14; y <= 15; y++) for (let x = 13; x <= 15; x++) reserved.push({ x, y });
      for (let x = 2; x <= 22; x++) reserved.push({ x, y: 12 });
      cells.push(...fillGrass(25, 25, 50, 35, reserved));
      return {
        cells,
        mowers: [
          { x: 8, y: 7, tier: "standard" },
          { x: 18, y: 16, tier: "standard" },
        ],
        stations: [{ x: 1, y: 1 }, { x: 23, y: 23 }],
      };
    },
  },
  {
    id: "small",
    name: "Prueba Rápida",
    description: "8×8 — Mini escenario para testear el comportamiento de una sola podadora.",
    emoji: "bot",
    width: 8,
    height: 8,
    build: () => {
      const cells: DemoCell[] = [];
      cells.push(...rect(0, 0, 7, 0, "path"));
      cells.push(...rect(0, 7, 7, 7, "path"));
      cells.push(...rect(0, 0, 0, 7, "path"));
      cells.push(...rect(7, 0, 7, 7, "path"));
      cells.push(...rect(3, 3, 4, 4, "obstacle"));
      const reserved = [
        { x: 0, y: 0 }, { x: 7, y: 0 }, { x: 0, y: 7 }, { x: 7, y: 7 },
        { x: 1, y: 0 }, { x: 0, y: 1 },
        { x: 6, y: 0 }, { x: 7, y: 1 },
        { x: 1, y: 7 }, { x: 0, y: 6 },
        { x: 6, y: 7 }, { x: 7, y: 6 },
        { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 },
      ];
      cells.push(...fillGrass(8, 8, 60, 30, reserved));
      return {
        cells,
        mowers: [{ x: 2, y: 2, tier: "standard" }],
        stations: [{ x: 1, y: 1 }],
      };
    },
  },
  {
    id: "campus",
    name: "Campus Universitario",
    description: "40×40 — Gran campus con edificios, caminos, jardines, estanque y 4 podadoras. Escenario completo.",
    emoji: "building",
    width: 40,
    height: 40,
    build: () => {
      const cells: DemoCell[] = [];
      // Perimeter
      cells.push(...rect(0, 0, 39, 0, "path"));
      cells.push(...rect(0, 39, 39, 39, "path"));
      cells.push(...rect(0, 0, 0, 39, "path"));
      cells.push(...rect(39, 0, 39, 39, "path"));
      // Main cross paths
      cells.push(...rect(0, 19, 39, 19, "path"));
      cells.push(...rect(19, 0, 19, 39, "path"));
      // Buildings
      cells.push(...rect(2, 2, 7, 5, "building"));
      cells.push(...rect(2, 14, 7, 17, "building"));
      cells.push(...rect(14, 2, 17, 5, "building"));
      cells.push(...rect(22, 2, 27, 5, "building"));
      cells.push(...rect(30, 2, 37, 5, "building"));
      cells.push(...rect(22, 14, 27, 17, "building"));
      cells.push(...rect(30, 14, 37, 17, "building"));
      cells.push(...rect(2, 22, 7, 25, "building"));
      cells.push(...rect(14, 22, 17, 25, "building"));
      cells.push(...rect(22, 22, 27, 25, "building"));
      cells.push(...rect(30, 22, 37, 25, "building"));
      cells.push(...rect(2, 32, 7, 37, "building"));
      cells.push(...rect(14, 32, 17, 37, "building"));
      cells.push(...rect(30, 32, 37, 37, "building"));
      // Pond
      for (let y = 28; y < 31; y++) for (let x = 10; x < 14; x++) cells.push({ x, y, type: "water" });
      // Trees
      cells.push(...treeCluster(9, 8, 2));
      cells.push(...treeCluster(28, 8, 2));
      cells.push(...treeCluster(9, 30, 2));
      cells.push(...treeCluster(28, 30, 2));
      cells.push(...treeCluster(18, 8, 2));
      cells.push(...treeCluster(18, 30, 2));
      // Flower beds
      cells.push(...rect(10, 10, 12, 12, "flowers", 0));
      cells.push(...rect(27, 10, 29, 12, "flowers", 0));
      cells.push(...rect(10, 27, 12, 29, "flowers", 0));
      cells.push(...rect(27, 27, 29, 29, "flowers", 0));
      // Gravel paths
      cells.push(...rect(8, 19, 18, 19, "gravel"));
      cells.push(...rect(20, 19, 38, 19, "gravel"));
      cells.push(...rect(19, 8, 19, 18, "gravel"));
      cells.push(...rect(19, 20, 19, 38, "gravel"));
      // Sand area
      cells.push(...rect(32, 28, 37, 31, "sand"));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 40; x++) reserved.push({ x, y: 0 }, { x, y: 39 }, { x, y: 19 });
      for (let y = 0; y < 40; y++) reserved.push({ x: 0, y }, { x: 19, y }, { x: 39, y });
      for (let y = 2; y <= 5; y++) for (let x = 2; x <= 7; x++) reserved.push({ x, y });
      for (let y = 14; y <= 17; y++) for (let x = 2; x <= 7; x++) reserved.push({ x, y });
      for (let y = 2; y <= 5; y++) for (let x = 14; x <= 17; x++) reserved.push({ x, y });
      for (let y = 2; y <= 5; y++) for (let x = 22; x <= 27; x++) reserved.push({ x, y });
      for (let y = 2; y <= 5; y++) for (let x = 30; x <= 37; x++) reserved.push({ x, y });
      for (let y = 14; y <= 17; y++) for (let x = 22; x <= 27; x++) reserved.push({ x, y });
      for (let y = 14; y <= 17; y++) for (let x = 30; x <= 37; x++) reserved.push({ x, y });
      for (let y = 22; y <= 25; y++) for (let x = 2; x <= 7; x++) reserved.push({ x, y });
      for (let y = 22; y <= 25; y++) for (let x = 14; x <= 17; x++) reserved.push({ x, y });
      for (let y = 22; y <= 25; y++) for (let x = 22; x <= 27; x++) reserved.push({ x, y });
      for (let y = 22; y <= 25; y++) for (let x = 30; x <= 37; x++) reserved.push({ x, y });
      for (let y = 32; y <= 37; y++) for (let x = 2; x <= 7; x++) reserved.push({ x, y });
      for (let y = 32; y <= 37; y++) for (let x = 14; x <= 17; x++) reserved.push({ x, y });
      for (let y = 32; y <= 37; y++) for (let x = 30; x <= 37; x++) reserved.push({ x, y });
      for (let y = 28; y < 31; y++) for (let x = 10; x < 14; x++) reserved.push({ x, y });
      for (let y = 8; y < 10; y++) for (let x = 9; x < 11; x++) reserved.push({ x, y });
      for (let y = 8; y < 10; y++) for (let x = 28; x < 30; x++) reserved.push({ x, y });
      for (let y = 30; y < 32; y++) for (let x = 9; x < 11; x++) reserved.push({ x, y });
      for (let y = 30; y < 32; y++) for (let x = 28; x < 30; x++) reserved.push({ x, y });
      for (let y = 8; y < 10; y++) for (let x = 18; x < 20; x++) reserved.push({ x, y });
      for (let y = 30; y < 32; y++) for (let x = 18; x < 20; x++) reserved.push({ x, y });
      for (let y = 10; y <= 12; y++) for (let x = 10; x <= 12; x++) reserved.push({ x, y });
      for (let y = 10; y <= 12; y++) for (let x = 27; x <= 29; x++) reserved.push({ x, y });
      for (let y = 27; y <= 29; y++) for (let x = 10; x <= 12; x++) reserved.push({ x, y });
      for (let y = 27; y <= 29; y++) for (let x = 27; x <= 29; x++) reserved.push({ x, y });
      for (let x = 8; x <= 18; x++) reserved.push({ x, y: 19 });
      for (let x = 20; x <= 38; x++) reserved.push({ x, y: 19 });
      for (let y = 8; y <= 18; y++) reserved.push({ x: 19, y });
      for (let y = 20; y <= 38; y++) reserved.push({ x: 19, y });
      for (let y = 28; y <= 31; y++) for (let x = 32; x <= 37; x++) reserved.push({ x, y });
      cells.push(...fillGrass(40, 40, 100, 0, reserved));
      return {
        cells,
        mowers: [
          { x: 9, y: 6, tier: "standard" },
          { x: 28, y: 6, tier: "standard" },
          { x: 9, y: 33, tier: "standard" },
          { x: 28, y: 33, tier: "standard" },
        ],
        stations: [{ x: 1, y: 1 }, { x: 38, y: 1 }, { x: 1, y: 38 }, { x: 38, y: 38 }],
      };
    },
  },
  {
    id: "estates",
    name: "Residencial Premium",
    description: "35×35 — 6 casas, caminos, piscina, jardín ornamental y 3 podadoras premium.",
    emoji: "trees",
    width: 35,
    height: 35,
    build: () => {
      const cells: DemoCell[] = [];
      // Perimeter
      cells.push(...rect(0, 0, 34, 0, "path"));
      cells.push(...rect(0, 34, 34, 34, "path"));
      cells.push(...rect(0, 0, 0, 34, "path"));
      cells.push(...rect(34, 0, 34, 34, "path"));
      // Main roads
      cells.push(...rect(0, 17, 34, 17, "path"));
      cells.push(...rect(17, 0, 17, 34, "path"));
      // Pool (top-right quadrant)
      for (let y = 3; y < 6; y++) for (let x = 27; x < 31; x++) cells.push({ x, y, type: "water" });
      // Houses (buildings) in each quadrant
      cells.push(...rect(2, 2, 6, 5, "building"));
      cells.push(...rect(9, 2, 13, 5, "building"));
      cells.push(...rect(20, 2, 24, 5, "building"));
      cells.push(...rect(2, 10, 6, 13, "building"));
      cells.push(...rect(9, 10, 13, 13, "building"));
      cells.push(...rect(20, 10, 24, 13, "building"));
      cells.push(...rect(2, 20, 6, 23, "building"));
      cells.push(...rect(9, 20, 13, 23, "building"));
      cells.push(...rect(20, 20, 24, 23, "building"));
      cells.push(...rect(2, 28, 6, 31, "building"));
      cells.push(...rect(9, 28, 13, 31, "building"));
      cells.push(...rect(20, 28, 24, 31, "building"));
      // Trees
      cells.push(...treeCluster(27, 8, 2));
      cells.push(...treeCluster(27, 12, 2));
      cells.push(...treeCluster(27, 20, 2));
      cells.push(...treeCluster(27, 28, 2));
      cells.push(...treeCluster(7, 7, 2));
      cells.push(...treeCluster(14, 7, 2));
      cells.push(...treeCluster(7, 15, 2));
      cells.push(...treeCluster(14, 15, 2));
      cells.push(...treeCluster(7, 25, 2));
      cells.push(...treeCluster(14, 25, 2));
      // Flowers
      cells.push(...rect(30, 14, 32, 16, "flowers", 0));
      cells.push(...rect(30, 26, 32, 28, "flowers", 0));
      // Gravel
      cells.push(...rect(2, 6, 15, 6, "gravel"));
      cells.push(...rect(2, 24, 15, 24, "gravel"));
      // Sand
      cells.push(...rect(28, 24, 32, 27, "sand"));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 35; x++) reserved.push({ x, y: 0 }, { x, y: 34 }, { x, y: 17 });
      for (let y = 0; y < 35; y++) reserved.push({ x: 0, y }, { x: 17, y }, { x: 34, y });
      for (let y = 2; y <= 5; y++) for (let x = 2; x <= 6; x++) reserved.push({ x, y });
      for (let y = 2; y <= 5; y++) for (let x = 9; x <= 13; x++) reserved.push({ x, y });
      for (let y = 2; y <= 5; y++) for (let x = 20; x <= 24; x++) reserved.push({ x, y });
      for (let y = 10; y <= 13; y++) for (let x = 2; x <= 6; x++) reserved.push({ x, y });
      for (let y = 10; y <= 13; y++) for (let x = 9; x <= 13; x++) reserved.push({ x, y });
      for (let y = 10; y <= 13; y++) for (let x = 20; x <= 24; x++) reserved.push({ x, y });
      for (let y = 20; y <= 23; y++) for (let x = 2; x <= 6; x++) reserved.push({ x, y });
      for (let y = 20; y <= 23; y++) for (let x = 9; x <= 13; x++) reserved.push({ x, y });
      for (let y = 20; y <= 23; y++) for (let x = 20; x <= 24; x++) reserved.push({ x, y });
      for (let y = 28; y <= 31; y++) for (let x = 2; x <= 6; x++) reserved.push({ x, y });
      for (let y = 28; y <= 31; y++) for (let x = 9; x <= 13; x++) reserved.push({ x, y });
      for (let y = 28; y <= 31; y++) for (let x = 20; x <= 24; x++) reserved.push({ x, y });
      for (let y = 3; y < 6; y++) for (let x = 27; x < 31; x++) reserved.push({ x, y });
      for (let y = 8; y < 10; y++) for (let x = 27; x < 29; x++) reserved.push({ x, y });
      for (let y = 12; y < 14; y++) for (let x = 27; x < 29; x++) reserved.push({ x, y });
      for (let y = 20; y < 22; y++) for (let x = 27; x < 29; x++) reserved.push({ x, y });
      for (let y = 28; y < 30; y++) for (let x = 27; x < 29; x++) reserved.push({ x, y });
      for (let y = 7; y < 9; y++) for (let x = 7; x < 9; x++) reserved.push({ x, y });
      for (let y = 7; y < 9; y++) for (let x = 14; x < 16; x++) reserved.push({ x, y });
      for (let y = 15; y < 17; y++) for (let x = 7; x < 9; x++) reserved.push({ x, y });
      for (let y = 15; y < 17; y++) for (let x = 14; x < 16; x++) reserved.push({ x, y });
      for (let y = 25; y < 27; y++) for (let x = 7; x < 9; x++) reserved.push({ x, y });
      for (let y = 25; y < 27; y++) for (let x = 14; x < 16; x++) reserved.push({ x, y });
      for (let y = 14; y <= 16; y++) for (let x = 30; x <= 32; x++) reserved.push({ x, y });
      for (let y = 26; y <= 28; y++) for (let x = 30; x <= 32; x++) reserved.push({ x, y });
      for (let x = 2; x <= 15; x++) reserved.push({ x, y: 6 });
      for (let x = 2; x <= 15; x++) reserved.push({ x, y: 24 });
      for (let y = 24; y <= 27; y++) for (let x = 28; x <= 32; x++) reserved.push({ x, y });
      cells.push(...fillGrass(35, 35, 100, 0, reserved));
      return {
        cells,
        mowers: [
          { x: 1, y: 8, tier: "standard" },
          { x: 33, y: 8, tier: "standard" },
          { x: 17, y: 26, tier: "standard" },
        ],
        stations: [{ x: 1, y: 1 }, { x: 33, y: 1 }, { x: 17, y: 33 }],
      };
    },
  },
  {
    id: "park",
    name: "Parque Natural",
    description: "45×45 — Gran parque con bosques densos, caminos serpenteantes, lago y 4 podadoras.",
    emoji: "leaf",
    width: 45,
    height: 45,
    build: () => {
      const cells: DemoCell[] = [];
      // Perimeter
      cells.push(...rect(0, 0, 44, 0, "path"));
      cells.push(...rect(0, 44, 44, 44, "path"));
      cells.push(...rect(0, 0, 0, 44, "path"));
      cells.push(...rect(44, 0, 44, 44, "path"));
      // Central cross
      cells.push(...rect(0, 22, 44, 22, "path"));
      cells.push(...rect(22, 0, 22, 44, "path"));
      // Lake (center)
      for (let y = 18; y < 26; y++) for (let x = 18; x < 26; x++) cells.push({ x, y, type: "water" });
      // Dense tree clusters
      for (let cx = 4; cx < 40; cx += 12) {
        for (let cy = 4; cy < 40; cy += 12) {
          if (cx === 22 && cy === 22) continue;
          cells.push(...treeCluster(cx, cy, 4));
        }
      }
      // Scattered small trees
      cells.push(...treeCluster(10, 10, 2));
      cells.push(...treeCluster(34, 10, 2));
      cells.push(...treeCluster(10, 34, 2));
      cells.push(...treeCluster(34, 34, 2));
      // Flower beds
      cells.push(...rect(11, 22, 12, 22, "flowers", 0));
      cells.push(...rect(32, 22, 33, 22, "flowers", 0));
      cells.push(...rect(22, 11, 22, 12, "flowers", 0));
      cells.push(...rect(22, 32, 22, 33, "flowers", 0));
      // Buildings (park structures)
      cells.push(...rect(3, 41, 7, 43, "building"));
      cells.push(...rect(38, 1, 42, 3, "building"));
      // Sand area
      cells.push(...rect(40, 40, 43, 43, "sand"));
      // Gravel
      cells.push(...rect(2, 22, 4, 22, "gravel"));
      cells.push(...rect(41, 22, 43, 22, "gravel"));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 45; x++) reserved.push({ x, y: 0 }, { x, y: 44 }, { x, y: 22 });
      for (let y = 0; y < 45; y++) reserved.push({ x: 0, y }, { x: 22, y }, { x: 44, y });
      for (let y = 18; y < 26; y++) for (let x = 18; x < 26; x++) reserved.push({ x, y });
      for (let cy = 4; cy < 40; cy += 12) for (let cx = 4; cx < 40; cx += 12) {
        if (cx === 22 && cy === 22) continue;
        for (let y = cy; y < cy + 4; y++) for (let x = cx; x < cx + 4; x++) reserved.push({ x, y });
      }
      for (let y = 10; y < 12; y++) for (let x = 10; x < 12; x++) reserved.push({ x, y });
      for (let y = 10; y < 12; y++) for (let x = 34; x < 36; x++) reserved.push({ x, y });
      for (let y = 34; y < 36; y++) for (let x = 10; x < 12; x++) reserved.push({ x, y });
      for (let y = 34; y < 36; y++) for (let x = 34; x < 36; x++) reserved.push({ x, y });
      for (let y = 41; y <= 43; y++) for (let x = 3; x <= 7; x++) reserved.push({ x, y });
      for (let y = 1; y <= 3; y++) for (let x = 38; x <= 42; x++) reserved.push({ x, y });
      for (let y = 40; y <= 43; y++) for (let x = 40; x <= 43; x++) reserved.push({ x, y });
      cells.push(...fillGrass(45, 45, 100, 0, reserved));
      return {
        cells,
        mowers: [
          { x: 2, y: 2, tier: "standard" },
          { x: 42, y: 2, tier: "standard" },
          { x: 2, y: 42, tier: "standard" },
          { x: 42, y: 42, tier: "standard" },
        ],
        stations: [
          { x: 1, y: 1 }, { x: 43, y: 1 },
          { x: 1, y: 43 }, { x: 43, y: 43 },
        ],
      };
    },
  },
  {
    id: "japanese",
    name: "Jardín Japonés",
    description: "25×25 — Estanques, puentes de grava, rocas y cerezos. 2 podadoras.",
    emoji: "leaf",
    width: 25,
    height: 25,
    build: () => {
      const cells: DemoCell[] = [];
      cells.push(...rect(0, 0, 24, 0, "path"));
      cells.push(...rect(0, 24, 24, 24, "path"));
      cells.push(...rect(0, 0, 0, 24, "path"));
      cells.push(...rect(24, 0, 24, 24, "path"));
      // Central pond
      for (let y = 10; y < 16; y++) for (let x = 10; x < 16; x++) cells.push({ x, y, type: "water" });
      // Gravel bridges across pond
      cells.push(...rect(12, 9, 12, 16, "gravel"));
      cells.push(...rect(9, 12, 16, 12, "gravel"));
      // Rock clusters (obstacles)
      cells.push(...rect(3, 3, 4, 4, "obstacle"));
      cells.push(...rect(20, 3, 21, 4, "obstacle"));
      cells.push(...rect(3, 20, 4, 21, "obstacle"));
      cells.push(...rect(20, 20, 21, 21, "obstacle"));
      // Scattered rocks
      cells.push({ x: 7, y: 7, type: "obstacle" });
      cells.push({ x: 17, y: 7, type: "obstacle" });
      cells.push({ x: 7, y: 17, type: "obstacle" });
      cells.push({ x: 17, y: 17, type: "obstacle" });
      // Sand areas (zen garden)
      cells.push(...rect(1, 1, 5, 2, "sand"));
      cells.push(...rect(19, 22, 23, 23, "sand"));
      // Flower beds (cherry blossoms)
      cells.push(...rect(6, 1, 8, 2, "flowers", 0));
      cells.push(...rect(16, 1, 18, 2, "flowers", 0));
      cells.push(...rect(1, 6, 2, 8, "flowers", 0));
      cells.push(...rect(22, 6, 23, 8, "flowers", 0));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 25; x++) reserved.push({ x, y: 0 }, { x, y: 24 });
      for (let y = 0; y < 25; y++) reserved.push({ x: 0, y }, { x: 24, y });
      for (let y = 10; y < 16; y++) for (let x = 10; x < 16; x++) reserved.push({ x, y });
      for (let y = 3; y <= 4; y++) for (let x = 3; x <= 4; x++) reserved.push({ x, y });
      for (let y = 3; y <= 4; y++) for (let x = 20; x <= 21; x++) reserved.push({ x, y });
      for (let y = 20; y <= 21; y++) for (let x = 3; x <= 4; x++) reserved.push({ x, y });
      for (let y = 20; y <= 21; y++) for (let x = 20; x <= 21; x++) reserved.push({ x, y });
      for (let y = 1; y <= 2; y++) for (let x = 1; x <= 5; x++) reserved.push({ x, y });
      for (let y = 22; y <= 23; y++) for (let x = 19; x <= 23; x++) reserved.push({ x, y });
      for (let y = 1; y <= 2; y++) for (let x = 6; x <= 8; x++) reserved.push({ x, y });
      for (let y = 1; y <= 2; y++) for (let x = 16; x <= 18; x++) reserved.push({ x, y });
      for (let y = 6; y <= 8; y++) for (let x = 1; x <= 2; x++) reserved.push({ x, y });
      for (let y = 6; y <= 8; y++) for (let x = 22; x <= 23; x++) reserved.push({ x, y });
      cells.push(...fillGrass(25, 25, 70, 20, reserved));
      return {
        cells,
        mowers: [
          { x: 6, y: 6, tier: "standard" },
          { x: 18, y: 18, tier: "standard" },
        ],
        stations: [{ x: 1, y: 23 }, { x: 23, y: 1 }],
      };
    },
  },
  {
    id: "industrial",
    name: "Zona Industrial",
    description: "30×30 — Naves industriales, grava, maquinaria y camiones. 2 podadoras.",
    emoji: "building",
    width: 30,
    height: 30,
    build: () => {
      const cells: DemoCell[] = [];
      cells.push(...rect(0, 0, 29, 0, "path"));
      cells.push(...rect(0, 29, 29, 29, "path"));
      cells.push(...rect(0, 0, 0, 29, "path"));
      cells.push(...rect(29, 0, 29, 29, "path"));
      // Main roads
      cells.push(...rect(0, 14, 29, 14, "path"));
      cells.push(...rect(14, 0, 14, 29, "path"));
      // Industrial buildings
      cells.push(...rect(2, 2, 8, 5, "building"));
      cells.push(...rect(16, 2, 22, 5, "building"));
      cells.push(...rect(2, 9, 8, 12, "building"));
      cells.push(...rect(16, 9, 22, 12, "building"));
      cells.push(...rect(2, 16, 8, 19, "building"));
      cells.push(...rect(16, 16, 22, 19, "building"));
      cells.push(...rect(2, 23, 8, 26, "building"));
      cells.push(...rect(16, 23, 22, 26, "building"));
      // Gravel yards
      cells.push(...rect(9, 2, 13, 5, "gravel"));
      cells.push(...rect(23, 2, 27, 5, "gravel"));
      cells.push(...rect(9, 9, 13, 12, "gravel"));
      cells.push(...rect(23, 9, 27, 12, "gravel"));
      // Sand storage
      cells.push(...rect(9, 23, 13, 26, "sand"));
      cells.push(...rect(23, 23, 27, 26, "sand"));
      // Water tanks
      cells.push({ x: 10, y: 16, type: "water" });
      cells.push({ x: 11, y: 16, type: "water" });
      cells.push({ x: 10, y: 17, type: "water" });
      cells.push({ x: 11, y: 17, type: "water" });
      // Obstacles (machinery)
      cells.push({ x: 25, y: 16, type: "obstacle" });
      cells.push({ x: 26, y: 16, type: "obstacle" });
      cells.push({ x: 25, y: 17, type: "obstacle" });
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 30; x++) reserved.push({ x, y: 0 }, { x, y: 29 }, { x, y: 14 });
      for (let y = 0; y < 30; y++) reserved.push({ x: 0, y }, { x: 14, y }, { x: 29, y });
      for (let y = 2; y <= 5; y++) for (let x = 2; x <= 8; x++) reserved.push({ x, y });
      for (let y = 2; y <= 5; y++) for (let x = 16; x <= 22; x++) reserved.push({ x, y });
      for (let y = 9; y <= 12; y++) for (let x = 2; x <= 8; x++) reserved.push({ x, y });
      for (let y = 9; y <= 12; y++) for (let x = 16; x <= 22; x++) reserved.push({ x, y });
      for (let y = 16; y <= 19; y++) for (let x = 2; x <= 8; x++) reserved.push({ x, y });
      for (let y = 16; y <= 19; y++) for (let x = 16; x <= 22; x++) reserved.push({ x, y });
      for (let y = 23; y <= 26; y++) for (let x = 2; x <= 8; x++) reserved.push({ x, y });
      for (let y = 23; y <= 26; y++) for (let x = 16; x <= 22; x++) reserved.push({ x, y });
      for (let y = 2; y <= 5; y++) for (let x = 9; x <= 13; x++) reserved.push({ x, y });
      for (let y = 2; y <= 5; y++) for (let x = 23; x <= 27; x++) reserved.push({ x, y });
      for (let y = 9; y <= 12; y++) for (let x = 9; x <= 13; x++) reserved.push({ x, y });
      for (let y = 9; y <= 12; y++) for (let x = 23; x <= 27; x++) reserved.push({ x, y });
      for (let y = 23; y <= 26; y++) for (let x = 9; x <= 13; x++) reserved.push({ x, y });
      for (let y = 23; y <= 26; y++) for (let x = 23; x <= 27; x++) reserved.push({ x, y });
      for (let y = 16; y <= 17; y++) for (let x = 10; x <= 11; x++) reserved.push({ x, y });
      reserved.push({ x: 25, y: 16 }, { x: 26, y: 16 }, { x: 25, y: 17 });
      cells.push(...fillGrass(30, 30, 40, 20, reserved));
      return {
        cells,
        mowers: [
          { x: 10, y: 7, tier: "standard" },
          { x: 10, y: 21, tier: "standard" },
        ],
        stations: [{ x: 1, y: 1 }, { x: 1, y: 28 }],
      };
    },
  },
  {
    id: "urban",
    name: "Parque Urbano",
    description: "28×28 — Banco, fuentes, senderos serpenteantes y césped. 2 podadoras.",
    emoji: "trees",
    width: 28,
    height: 28,
    build: () => {
      const cells: DemoCell[] = [];
      cells.push(...rect(0, 0, 27, 0, "path"));
      cells.push(...rect(0, 27, 27, 27, "path"));
      cells.push(...rect(0, 0, 0, 27, "path"));
      cells.push(...rect(27, 0, 27, 27, "path"));
      // Central fountain
      for (let y = 12; y < 16; y++) for (let x = 12; x < 16; x++) cells.push({ x, y, type: "water" });
      cells.push({ x: 13, y: 13, type: "gravel" });
      cells.push({ x: 14, y: 13, type: "gravel" });
      cells.push({ x: 13, y: 14, type: "gravel" });
      cells.push({ x: 14, y: 14, type: "gravel" });
      // Winding paths
      cells.push(...rect(4, 6, 10, 6, "path"));
      cells.push(...rect(10, 6, 10, 12, "path"));
      cells.push(...rect(17, 6, 23, 6, "path"));
      cells.push(...rect(17, 6, 17, 12, "path"));
      cells.push(...rect(4, 21, 10, 21, "path"));
      cells.push(...rect(10, 15, 10, 21, "path"));
      cells.push(...rect(17, 21, 23, 21, "path"));
      cells.push(...rect(17, 15, 17, 21, "path"));
      // Cross paths
      cells.push(...rect(6, 10, 21, 10, "path"));
      cells.push(...rect(6, 17, 21, 17, "path"));
      // Tree clusters
      cells.push(...treeCluster(2, 2, 2));
      cells.push(...treeCluster(24, 2, 2));
      cells.push(...treeCluster(2, 24, 2));
      cells.push(...treeCluster(24, 24, 2));
      cells.push(...treeCluster(7, 13, 2));
      cells.push(...treeCluster(19, 13, 2));
      // Flower beds
      cells.push(...rect(11, 2, 13, 3, "flowers", 0));
      cells.push(...rect(14, 2, 16, 3, "flowers", 0));
      cells.push(...rect(11, 24, 13, 25, "flowers", 0));
      cells.push(...rect(14, 24, 16, 25, "flowers", 0));
      // Bench obstacles
      cells.push({ x: 8, y: 8, type: "obstacle" });
      cells.push({ x: 19, y: 8, type: "obstacle" });
      cells.push({ x: 8, y: 19, type: "obstacle" });
      cells.push({ x: 19, y: 19, type: "obstacle" });
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 28; x++) reserved.push({ x, y: 0 }, { x, y: 27 });
      for (let y = 0; y < 28; y++) reserved.push({ x: 0, y }, { x: 27, y });
      for (let y = 12; y < 16; y++) for (let x = 12; x < 16; x++) reserved.push({ x, y });
      for (let y = 2; y <= 3; y++) for (let x = 11; x <= 16; x++) reserved.push({ x, y });
      for (let y = 24; y <= 25; y++) for (let x = 11; x <= 16; x++) reserved.push({ x, y });
      for (let y = 2; y < 4; y++) for (let x = 2; x < 4; x++) reserved.push({ x, y });
      for (let y = 2; y < 4; y++) for (let x = 24; x < 26; x++) reserved.push({ x, y });
      for (let y = 24; y < 26; y++) for (let x = 2; x < 4; x++) reserved.push({ x, y });
      for (let y = 24; y < 26; y++) for (let x = 24; x < 26; x++) reserved.push({ x, y });
      for (let y = 13; y < 15; y++) for (let x = 7; x < 9; x++) reserved.push({ x, y });
      for (let y = 13; y < 15; y++) for (let x = 19; x < 21; x++) reserved.push({ x, y });
      cells.push(...fillGrass(28, 28, 80, 15, reserved));
      return {
        cells,
        mowers: [
          { x: 5, y: 4, tier: "standard" },
          { x: 22, y: 22, tier: "standard" },
        ],
        stations: [{ x: 1, y: 1 }, { x: 26, y: 26 }],
      };
    },
  },
  {
    id: "farm",
    name: "Finca Orgánica",
    description: "35×35 — Cultivos en hileras, granero, estanque de riego y 3 podadoras.",
    emoji: "leaf",
    width: 35,
    height: 35,
    build: () => {
      const cells: DemoCell[] = [];
      cells.push(...rect(0, 0, 34, 0, "path"));
      cells.push(...rect(0, 34, 34, 34, "path"));
      cells.push(...rect(0, 0, 0, 34, "path"));
      cells.push(...rect(34, 0, 34, 34, "path"));
      // Central cross roads
      cells.push(...rect(0, 17, 34, 17, "path"));
      cells.push(...rect(17, 0, 17, 34, "path"));
      // Barn (building)
      cells.push(...rect(15, 15, 19, 19, "building"));
      // Irrigation pond
      for (let y = 8; y < 12; y++) for (let x = 8; x < 12; x++) cells.push({ x, y, type: "water" });
      // Crop rows (sand = tilled soil)
      for (let y = 2; y < 7; y++) for (let x = 2; x < 7; x++) cells.push({ x, y, type: "sand" });
      for (let y = 2; y < 7; y++) for (let x = 12; x < 16; x++) cells.push({ x, y, type: "sand" });
      for (let y = 2; y < 7; y++) for (let x = 20; x < 27; x++) cells.push({ x, y, type: "sand" });
      for (let y = 28; y < 33; y++) for (let x = 2; x < 7; x++) cells.push({ x, y, type: "sand" });
      for (let y = 28; y < 33; y++) for (let x = 12; x < 16; x++) cells.push({ x, y, type: "sand" });
      for (let y = 28; y < 33; y++) for (let x = 20; x < 27; x++) cells.push({ x, y, type: "sand" });
      for (let y = 2; y < 7; y++) for (let x = 28; x < 33; x++) cells.push({ x, y, type: "sand" });
      for (let y = 28; y < 33; y++) for (let x = 28; x < 33; x++) cells.push({ x, y, type: "sand" });
      // Gravel paths between crops
      cells.push(...rect(7, 2, 11, 6, "gravel"));
      cells.push(...rect(27, 2, 32, 6, "gravel"));
      cells.push(...rect(7, 28, 11, 32, "gravel"));
      cells.push(...rect(27, 28, 32, 32, "gravel"));
      // Tree windbreaks
      cells.push(...treeCluster(2, 8, 2));
      cells.push(...treeCluster(2, 25, 2));
      cells.push(...treeCluster(31, 8, 2));
      cells.push(...treeCluster(31, 25, 2));
      // Flower patches
      cells.push(...rect(8, 13, 10, 14, "flowers", 0));
      cells.push(...rect(24, 13, 26, 14, "flowers", 0));
      cells.push(...rect(8, 20, 10, 21, "flowers", 0));
      cells.push(...rect(24, 20, 26, 21, "flowers", 0));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 35; x++) reserved.push({ x, y: 0 }, { x, y: 34 }, { x, y: 17 });
      for (let y = 0; y < 35; y++) reserved.push({ x: 0, y }, { x: 17, y }, { x: 34, y });
      for (let y = 15; y <= 19; y++) for (let x = 15; x <= 19; x++) reserved.push({ x, y });
      for (let y = 8; y < 12; y++) for (let x = 8; x < 12; x++) reserved.push({ x, y });
      for (let y = 2; y < 7; y++) for (let x = 2; x < 7; x++) reserved.push({ x, y });
      for (let y = 2; y < 7; y++) for (let x = 12; x < 16; x++) reserved.push({ x, y });
      for (let y = 2; y < 7; y++) for (let x = 20; x < 27; x++) reserved.push({ x, y });
      for (let y = 28; y < 33; y++) for (let x = 2; x < 7; x++) reserved.push({ x, y });
      for (let y = 28; y < 33; y++) for (let x = 12; x < 16; x++) reserved.push({ x, y });
      for (let y = 28; y < 33; y++) for (let x = 20; x < 27; x++) reserved.push({ x, y });
      for (let y = 2; y < 7; y++) for (let x = 28; x < 33; x++) reserved.push({ x, y });
      for (let y = 28; y < 33; y++) for (let x = 28; x < 33; x++) reserved.push({ x, y });
      for (let y = 2; y <= 6; y++) for (let x = 7; x <= 11; x++) reserved.push({ x, y });
      for (let y = 2; y <= 6; y++) for (let x = 27; x <= 32; x++) reserved.push({ x, y });
      for (let y = 28; y <= 32; y++) for (let x = 7; x <= 11; x++) reserved.push({ x, y });
      for (let y = 28; y <= 32; y++) for (let x = 27; x <= 32; x++) reserved.push({ x, y });
      for (let y = 8; y < 10; y++) for (let x = 2; x < 4; x++) reserved.push({ x, y });
      for (let y = 25; y < 27; y++) for (let x = 2; x < 4; x++) reserved.push({ x, y });
      for (let y = 8; y < 10; y++) for (let x = 31; x < 33; x++) reserved.push({ x, y });
      for (let y = 25; y < 27; y++) for (let x = 31; x < 33; x++) reserved.push({ x, y });
      for (let y = 13; y <= 14; y++) for (let x = 8; x <= 10; x++) reserved.push({ x, y });
      for (let y = 13; y <= 14; y++) for (let x = 24; x <= 26; x++) reserved.push({ x, y });
      for (let y = 20; y <= 21; y++) for (let x = 8; x <= 10; x++) reserved.push({ x, y });
      for (let y = 20; y <= 21; y++) for (let x = 24; x <= 26; x++) reserved.push({ x, y });
      cells.push(...fillGrass(35, 35, 60, 25, reserved));
      return {
        cells,
        mowers: [
          { x: 4, y: 10, tier: "standard" },
          { x: 30, y: 10, tier: "standard" },
          { x: 17, y: 24, tier: "standard" },
        ],
        stations: [
          { x: 1, y: 1 }, { x: 33, y: 1 },
          { x: 17, y: 33 },
        ],
      };
    },
  },
  {
    id: "sports",
    name: "Complejo Deportivo",
    description: "32×32 — Canchas, pistas de atletismo, gradas y zonas verdes. 3 podadoras.",
    emoji: "route",
    width: 32,
    height: 32,
    build: () => {
      const cells: DemoCell[] = [];
      cells.push(...rect(0, 0, 31, 0, "path"));
      cells.push(...rect(0, 31, 31, 31, "path"));
      cells.push(...rect(0, 0, 0, 31, "path"));
      cells.push(...rect(31, 0, 31, 31, "path"));
      // Main roads
      cells.push(...rect(0, 15, 31, 15, "path"));
      cells.push(...rect(15, 0, 15, 31, "path"));
      // Soccer field (top-left)
      cells.push(...rect(2, 2, 13, 13, "grass"));
      cells.push(...rect(2, 2, 13, 2, "path"));
      cells.push(...rect(2, 13, 13, 13, "path"));
      cells.push(...rect(2, 2, 2, 13, "path"));
      cells.push(...rect(13, 2, 13, 13, "path"));
      // Basketball court (top-right)
      cells.push(...rect(17, 2, 29, 13, "sand"));
      cells.push(...rect(17, 2, 29, 2, "path"));
      cells.push(...rect(17, 13, 29, 13, "path"));
      cells.push(...rect(17, 2, 17, 13, "path"));
      cells.push(...rect(29, 2, 29, 13, "path"));
      // Running track (bottom-left) - oval shape
      for (let y = 1; y < 13; y++) {
        cells.push({ x: 2, y: y + 17, type: "gravel" });
        cells.push({ x: 13, y: y + 17, type: "gravel" });
      }
      for (let x = 2; x < 14; x++) {
        cells.push({ x, y: 17, type: "gravel" });
        cells.push({ x, y: 29, type: "gravel" });
      }
      // Fill track interior with grass
      for (let y = 18; y < 29; y++) for (let x = 3; x < 13; x++) cells.push({ x, y, type: "grass" });
      // Swimming pool (bottom-right)
      for (let y = 18; y < 27; y++) for (let x = 18; x < 28; x++) cells.push({ x, y, type: "water" });
      cells.push(...rect(17, 17, 28, 17, "path"));
      cells.push(...rect(17, 27, 28, 27, "path"));
      cells.push(...rect(17, 17, 17, 27, "path"));
      cells.push(...rect(28, 17, 28, 27, "path"));
      // Grada obstacles
      cells.push(...rect(18, 28, 27, 30, "obstacle"));
      // Flower decorations
      cells.push(...rect(14, 14, 16, 16, "flowers", 0));
      // Tree clusters
      cells.push(...treeCluster(1, 14, 1));
      cells.push(...treeCluster(30, 14, 1));
      cells.push(...treeCluster(14, 1, 1));
      cells.push(...treeCluster(14, 30, 1));
      const reserved: Array<{ x: number; y: number }> = [];
      for (let x = 0; x < 32; x++) reserved.push({ x, y: 0 }, { x, y: 31 }, { x, y: 15 });
      for (let y = 0; y < 32; y++) reserved.push({ x: 0, y }, { x: 15, y }, { x: 31, y });
      for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) reserved.push({ x, y });
      for (let y = 2; y <= 13; y++) for (let x = 17; x <= 29; x++) reserved.push({ x, y });
      for (let y = 18; y <= 29; y++) for (let x = 2; x <= 13; x++) reserved.push({ x, y });
      for (let y = 18; y <= 27; y++) for (let x = 18; x <= 28; x++) reserved.push({ x, y });
      for (let y = 28; y <= 30; y++) for (let x = 18; x <= 27; x++) reserved.push({ x, y });
      cells.push(...fillGrass(32, 32, 75, 15, reserved));
      return {
        cells,
        mowers: [
          { x: 7, y: 7, tier: "standard" },
          { x: 23, y: 7, tier: "standard" },
          { x: 7, y: 23, tier: "standard" },
        ],
        stations: [
          { x: 1, y: 1 }, { x: 30, y: 1 },
          { x: 1, y: 30 },
        ],
      };
    },
  },
];
