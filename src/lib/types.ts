export type ClientTier = "base" | "standard" | "premium" | "enterprise";

export interface TierConfig {
  maxMowers: number;
  maxStations: number;
  maxSpaces: number;
  maxGridSize: number;
  priceMonthly: number;
  mowerTier: MowerTier;
  label: string;
  description: string;
}

export const TIER_CONFIGS: Record<ClientTier, TierConfig> = {
  base: {
    maxMowers: 2,
    maxStations: 1,
    maxSpaces: 3,
    maxGridSize: 20,
    priceMonthly: 6000,
    mowerTier: "base",
    label: "Servicio Base",
    description: "1 módulo · ~5,000 m² · Área básica",
  },
  standard: {
    maxMowers: 5,
    maxStations: 3,
    maxSpaces: 10,
    maxGridSize: 35,
    priceMonthly: 9500,
    mowerTier: "standard",
    label: "Servicio Estándar",
    description: "2 módulos · ~15,000 m² · Complejidad media",
  },
  premium: {
    maxMowers: 15,
    maxStations: 5,
    maxSpaces: 50,
    maxGridSize: 60,
    priceMonthly: 14000,
    mowerTier: "premium",
    label: "Servicio Premium",
    description: "4 módulos · ~40,000 m alta complejidad",
  },
  enterprise: {
    maxMowers: Infinity,
    maxStations: Infinity,
    maxSpaces: Infinity,
    maxGridSize: 100,
    priceMonthly: 0,
    mowerTier: "premium",
    label: "Enterprise",
    description: "Sin límites, soporte dedicado",
  },
};

export interface Client {
  id: string;
  name: string;
  tier: ClientTier;
  createdAt: number;
}

export type ScheduleMode = "auto" | "interval" | "threshold" | "time_of_day";

export interface ProjectConfig {
  grassGrowthRatePerSecond: number;
  batteryDrainPerSecond: number;
  batteryCapacity: number;
  chargingRatePerSecond: number;
  timeMultiplier: number;
  mowThreshold: number;
  scheduleMode: ScheduleMode;
  scheduleIntervalMs: number;
  scheduleThresholdPct: number;
  scheduleHour: number;
  scheduleMinute: number;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  config: ProjectConfig;
  createdAt: number;
}

export interface Space {
  id: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
  cellSize: number;
  createdAt: number;
  updatedAt: number;
}

export type CellType =
  | "grass"
  | "path"
  | "flowers"
  | "building"
  | "obstacle"
  | "tree"
  | "water"
  | "gravel"
  | "sand"
  | "charging_station"
  | "empty";

export interface CellData {
  type: CellType;
  grassHeight: number;
  lastMowed: number;
}

export type MowerStatus =
  | "idle"
  | "operating"
  | "charging"
  | "faulted"
  | "returning";

export type MowerTier = "base" | "standard" | "premium";

export interface PathPoint {
  x: number;
  y: number;
}

export type Trip = { tiles: PathPoint[]; returnToStation: boolean };

export interface Zone {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface Mower {
  id: string;
  spaceId: string;
  name: string;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  moveT: number;
  status: MowerStatus;
  battery: number;
  tier: MowerTier;
  assignedZone?: Zone;
  path: PathPoint[];
  pathIndex: number;
  assignedStationId?: string;
  coverageTiles?: PathPoint[];
  tourIndex?: number;
  color?: number;
  perimeterEdges?: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  trips?: Trip[];
  tripIndex?: number;
  schedule?: {
    mode: ScheduleMode;
    intervalMs?: number;
    thresholdPct?: number;
    hour?: number;
    minute?: number;
    lastScheduledRun?: number;
  };
}

export interface ChargingStation {
  id: string;
  spaceId: string;
  x: number;
  y: number;
  active: boolean;
}

export type ToolType =
  | "select"
  | "grass"
  | "path"
  | "flowers"
  | "building"
  | "obstacle"
  | "tree"
  | "water"
  | "gravel"
  | "sand"
  | "charging_station"
  | "empty"
  | "erase"
  | "mower";

export type SimulationEvent = {
  id: string;
  spaceId: string;
  timestamp: number;
  type: "mower_added" | "mower_removed" | "station_added" | "station_removed" | "fault" | "info";
  message: string;
};
