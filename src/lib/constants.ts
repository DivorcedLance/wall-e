import type { CellType } from "@/lib/types";

export const TILE_WIDTH = 56;
export const TILE_HEIGHT = 28;
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;
export const DEFAULT_ZOOM = 1;
export const MIN_GRID = 5;
export const MAX_GRID = 100;

export const DEFAULT_PROJECT_CONFIG = {
  grassGrowthRatePerSecond: 0.05,
  batteryDrainPerSecond: 0.5,
  batteryCapacity: 100,
  chargingRatePerSecond: 3,
  timeMultiplier: 1,
  mowThreshold: 30,
  scheduleMode: "auto" as const,
  scheduleIntervalMs: 5 * 60 * 1000,
  scheduleThresholdPct: 50,
  scheduleHour: 6,
  scheduleMinute: 0,
} as const;

export const TERRAIN_RESISTANCE: Record<CellType, number> = {
  grass: 1.0,
  path: 0.5,
  gravel: 0.85,
  sand: 1.5,
  flowers: Infinity,
  charging_station: 0.5,
  building: Infinity,
  obstacle: Infinity,
  tree: Infinity,
  water: Infinity,
  empty: Infinity,
};

export const BATTERY_MOWING_MULTIPLIER = 1.0;
export const BATTERY_TRANSIT_MULTIPLIER = 0.4;
export const BATTERY_RETURN_SAFETY_MARGIN = 5;
export const BATTERY_MIN_RETURN_THRESHOLD = 25;

export const TIME_MULTIPLIER_OPTIONS = [1, 2, 5, 10, 50, 100] as const;

export const GRASS_COLOR_LIGHT = "#bbf7d0";
export const GRASS_COLOR_MID = "#22c55e";
export const GRASS_COLOR_DARK = "#14532d";

export const PATH_COLOR = "#a8a29e";
export const FLOWERS_COLOR = "#ec4899";
export const BUILDING_COLOR = "#475569";
export const OBSTACLE_COLOR = "#78716c";
export const TREE_COLOR = "#166534";
export const WATER_COLOR = "#3b82f6";
export const GRAVEL_COLOR = "#d6d3d1";
export const SAND_COLOR = "#fde68a";
export const EMPTY_COLOR = "#0a0e1a";
export const CHARGING_COLOR = "#fbbf24";

export const PATH_RETURN_COLOR = "#3b82f6";
export const PATH_OPERATING_COLOR = "#fbbf24";

export const GRASS_HEIGHT_THRESHOLD = 30;
export const LOW_BATTERY_THRESHOLD = 25;

export const MOWER_SPEED_CELLS_PER_SECOND = 3;

// Color palette for mowers (distinct, easy to tell apart)
// Royal blue (#1e40af / 0x1e40af) is reserved for "returning to station"
export const MOWER_RETURNING_COLOR = 0x1e40af;

// Assigned per-mower colors (one per mower in order)
export const MOWER_PALETTE: number[] = [
  0x22c55e, // green
  0xf97316, // orange
  0xa855f7, // purple
  0xec4899, // pink
  0x06b6d4, // cyan
  0xeab308, // yellow
  0xef4444, // red
  0x14b8a6, // teal
];
