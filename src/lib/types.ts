export type ClientTier = "base" | "standard" | "premium";

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
