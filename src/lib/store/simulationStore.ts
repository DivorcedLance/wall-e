"use client";

import { create } from "zustand";
import { db } from "@/lib/db/indexedDB";
import { generateId, clamp } from "@/lib/utils";
import {
  DEFAULT_PROJECT_CONFIG,
  MOWER_SPEED_CELLS_PER_SECOND,
  MOWER_PALETTE,
  TIME_MULTIPLIER_OPTIONS,
  TERRAIN_RESISTANCE,
  BATTERY_MOWING_MULTIPLIER,
  BATTERY_TRANSIT_MULTIPLIER,
} from "@/lib/constants";
import { findPath, isWalkable } from "@/lib/pathfinding";
import { assignStationsToMowers, computeCoverageTours } from "@/lib/fleet";
import type { DemoLayout } from "@/lib/demos";
import type {
  CellData,
  CellType,
  ChargingStation,
  Mower,
  MowerTier,
  PathPoint,
  ProjectConfig,
  ScheduleMode,
  Space,
} from "@/lib/types";

function resistanceFor(type: CellType): number {
  const r = TERRAIN_RESISTANCE[type];
  return Number.isFinite(r) ? r : Infinity;
}

/** Estimate total battery drain for a list of tiles starting from (sx,sy).
 *  Travel between tiles uses transit drain, mowing each tile uses mowing drain. */
function estimateTourDrain(
  sx: number, sy: number,
  tiles: PathPoint[],
  startIndex: number,
  drainPerCell: number,
): number {
  let totalDist = 0;
  let cx = sx, cy = sy;
  for (let i = startIndex; i < tiles.length; i++) {
    totalDist += Math.abs(tiles[i].x - cx) + Math.abs(tiles[i].y - cy);
    cx = tiles[i].x;
    cy = tiles[i].y;
  }
  // Travel drain (transit) + mowing drain per tile
  return totalDist * drainPerCell * BATTERY_TRANSIT_MULTIPLIER + (tiles.length - startIndex) * drainPerCell * BATTERY_MOWING_MULTIPLIER;
}

/** Check if a mower should be operating based on its schedule config. */
function shouldOperate(
  scheduleMode: ScheduleMode,
  config: ProjectConfig,
  simulatedTimeMs: number,
  cells: Map<string, CellData>,
  coverageTiles: PathPoint[],
  lastScheduledRun: number | undefined,
): boolean {
  if (scheduleMode === "auto") return true;

  if (scheduleMode === "interval") {
    if (lastScheduledRun === undefined) return true;
    return (simulatedTimeMs - lastScheduledRun) >= config.scheduleIntervalMs;
  }

  if (scheduleMode === "threshold") {
    const now = Date.now();
    for (const t of coverageTiles) {
      const c = cells.get(`${t.x},${t.y}`);
      if (c && c.type === "grass") {
        const elapsed = (now - c.lastMowed) / 1000;
        const estimated = Math.min(100, (elapsed * config.grassGrowthRatePerSecond * 100));
        if (estimated >= config.scheduleThresholdPct) return true;
      }
    }
    return false;
  }

  if (scheduleMode === "time_of_day") {
    const totalSeconds = Math.floor(simulatedTimeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours === config.scheduleHour && minutes === config.scheduleMinute;
  }

  return true;
}

// ─── Store types ────────────────────────────────────────────────────────────

interface SimulationState {
  space: Space | null;
  config: ProjectConfig;
  cells: Map<string, CellData>;
  grassHeights: Map<string, number>;
  mowers: Mower[];
  stations: ChargingStation[];
  isPlaying: boolean;
  timeMultiplier: number;
  selectedMowerId: string | null;
  commandMode: boolean;
  dirty: boolean;
  saving: boolean;
  version: number;
  fleetInitialized: boolean;
  undoStack: Array<{ cells: Map<string, CellData>; grassHeights: Map<string, number> }>;
  redoStack: Array<{ cells: Map<string, CellData>; grassHeights: Map<string, number> }>;
  undo: () => void;
  redo: () => void;
  strategyEditing: boolean;
  strategyEditMowerId: string | null;
  strategyEditMode: "tiles" | "path";
  simulatedTimeMs: number;
  simulatedDay: number;
  loadSpace: (space: Space, config: ProjectConfig, layout?: DemoLayout) => Promise<void>;
  resetMap: (w: number, h: number) => void;
  paintCell: (x: number, y: number, type: CellType) => void;
  paintRect: (x0: number, y0: number, x1: number, y1: number, type: CellType) => void;
  setGrassHeight: (x: number, y: number, height: number) => void;
  addMower: (x: number, y: number, tier: MowerTier) => Mower;
  removeMower: (id: string) => void;
  addStation: (x: number, y: number) => ChargingStation;
  removeStation: (id: string) => void;
  setSelectedMower: (id: string | null) => void;
  setCommandMode: (on: boolean) => void;
  setMowerStation: (mowerId: string, stationId: string) => void;
  sendMowerToStation: (mowerId: string) => void;
  setStrategyEditing: (editing: boolean) => void;
  setStrategyEditMowerId: (id: string | null) => void;
  setStrategyEditMode: (mode: "tiles" | "path") => void;
  toggleStrategyTile: (mowerId: string, x: number, y: number) => void;
  addStrategyTile: (mowerId: string, x: number, y: number) => void;
  removeStrategyTile: (mowerId: string, x: number, y: number) => void;
  setStrategyPath: (mowerId: string, tiles: PathPoint[]) => void;
  commandMower: (id: string, x: number, y: number) => void;
  setPlaying: (playing: boolean) => void;
  setTimeMultiplier: (m: number) => void;
  setConfig: (config: Partial<ProjectConfig>) => void;
  initFleet: () => void;
  tick: (dt: number) => void;
  saveSpace: () => Promise<void>;
  setDirty: (dirty: boolean) => void;
  eventLog: Array<{ time: number; day: number; message: string; type: "info" | "warning" | "error" | "success" }>;
  addLogEntry: (entry: { time: number; day: number; message: string; type: "info" | "warning" | "error" | "success" }) => void;
}

const TICK_MS = 100;

function syncStationCells(cells: Map<string, CellData>, stations: ChargingStation[]): Map<string, CellData> {
  let changed = false;
  const next = new Map(cells);
  for (const s of stations) {
    if (!s.active) continue;
    const key = `${s.x},${s.y}`;
    const cell = next.get(key);
    if (!cell || cell.type !== "charging_station") {
      next.set(key, { type: "charging_station", grassHeight: 0, lastMowed: 0 });
      changed = true;
    }
  }
  return changed ? next : cells;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useSimulationStore = create<SimulationState>((set, get) => ({
  space: null,
  config: { ...DEFAULT_PROJECT_CONFIG },
  cells: new Map(),
  grassHeights: new Map(),
  mowers: [],
  stations: [],
  isPlaying: false,
  timeMultiplier: 1,
  selectedMowerId: null,
  commandMode: false,
  dirty: false,
  saving: false,
  version: 0,
  fleetInitialized: false,
  strategyEditing: false,
  strategyEditMowerId: null,
  strategyEditMode: "tiles",
  simulatedTimeMs: 8 * 3600 * 1000, // start at 8:00 AM
  simulatedDay: 0, // Monday
  eventLog: [] as Array<{ time: number; day: number; message: string; type: "info" | "warning" | "error" | "success" }>,
  addLogEntry: (entry: { time: number; day: number; message: string; type: "info" | "warning" | "error" | "success" }) => {
    set((s) => ({ eventLog: [...s.eventLog.slice(-100), entry] }));
  },
  undoStack: [],
  redoStack: [],
  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;
    const prev = state.undoStack[state.undoStack.length - 1];
    set({
      cells: new Map(prev.cells),
      grassHeights: new Map(prev.grassHeights),
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, { cells: new Map(state.cells), grassHeights: new Map(state.grassHeights) }],
      dirty: true,
      version: state.version + 1,
    });
  },
  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;
    const next = state.redoStack[state.redoStack.length - 1];
    set({
      cells: new Map(next.cells),
      grassHeights: new Map(next.grassHeights),
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, { cells: new Map(state.cells), grassHeights: new Map(state.grassHeights) }],
      dirty: true,
      version: state.version + 1,
    });
  },

  loadSpace: async (space, config, layout) => {
    const [storedCells, grassHeights, storedMowers, storedStations] =
      await Promise.all([db.getMapCells(space.id), db.getGrassData(space.id), db.getMowers(space.id), db.getStations(space.id)]);
    const useLayout = !!layout && storedCells.size === 0;
    if (useLayout && layout) {
      const cells = new Map<string, CellData>();
      const heights = new Map<string, number>();
      for (const c of layout.cells) {
        cells.set(`${c.x},${c.y}`, { type: c.type, grassHeight: c.grassHeight ?? (c.type === "grass" ? 100 : 0), lastMowed: 0 });
        if (c.type === "grass" && c.grassHeight !== undefined) heights.set(`${c.x},${c.y}`, c.grassHeight);
      }
      const mowers: Mower[] = layout.mowers.map((m, i) => ({
        id: generateId(), spaceId: space.id, name: `Podadora ${i + 1}`,
        x: m.x, y: m.y, fromX: m.x, fromY: m.y, moveT: 1,
        status: "idle", battery: 100, tier: m.tier, path: [], pathIndex: 0,
      }));
      const stations: ChargingStation[] = layout.stations.map((s) => ({
        id: generateId(), spaceId: space.id, x: s.x, y: s.y, active: true,
      }));
      set({ space, config, cells, grassHeights: heights, mowers, stations,
        isPlaying: false, timeMultiplier: config.timeMultiplier ?? 1,
        selectedMowerId: null, commandMode: false, dirty: true, version: get().version + 1, fleetInitialized: false });
      return;
    }
      const finalCells = storedCells.size === 0
        ? (() => { const f = new Map<string, CellData>(); for (let y = 0; y < space.height; y++) for (let x = 0; x < space.width; x++) f.set(`${x},${y}`, { type: "grass", grassHeight: 100, lastMowed: 0 }); return f; })()
        : syncStationCells(storedCells, storedStations);
    const hasStrategy = storedMowers.length > 0 && storedMowers.some((m) => m.coverageTiles && m.coverageTiles.length > 0);
    set({ space, config, cells: finalCells, grassHeights, mowers: storedMowers, stations: storedStations,
      isPlaying: false, timeMultiplier: config.timeMultiplier ?? 1,
      selectedMowerId: null, commandMode: false, dirty: false, version: get().version + 1, fleetInitialized: hasStrategy });
  },

  resetMap: (w, h) => {
    const fresh = new Map<string, CellData>();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) fresh.set(`${x},${y}`, { type: "grass", grassHeight: 100, lastMowed: 0 });
    set((s) => ({ space: s.space ? { ...s.space, width: w, height: h, updatedAt: Date.now() } : null,
      cells: fresh, grassHeights: new Map(), mowers: [], stations: [],
      dirty: true, version: s.version + 1, fleetInitialized: false }));
  },

  paintCell: (x, y, type) => {
    if (get().saving) return;
    set((s) => {
      const undoEntry = { cells: new Map(s.cells), grassHeights: new Map(s.grassHeights) };
      const next = new Map(s.cells); const key = `${x},${y}`;
      const prev = next.get(key) ?? { type: "empty", grassHeight: 0, lastMowed: 0 };
      const updated: CellData = { type, grassHeight: type === "grass" ? prev.grassHeight || 30 : 0, lastMowed: prev.lastMowed };
      next.set(key, updated);
      const heights = new Map(s.grassHeights);
      if (type === "grass") heights.set(key, updated.grassHeight); else heights.delete(key);
      return { cells: next, grassHeights: heights, dirty: true, version: s.version + 1, undoStack: [...s.undoStack.slice(-50), undoEntry], redoStack: [] };
    });
  },

  paintRect: (x0, y0, x1, y1, type) => {
    if (get().saving) return;
    set((s) => {
      const undoEntry = { cells: new Map(s.cells), grassHeights: new Map(s.grassHeights) };
      const next = new Map(s.cells); const heights = new Map(s.grassHeights);
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
          const key = `${x},${y}`; const prev = next.get(key) ?? { type: "empty", grassHeight: 0, lastMowed: 0 };
          const updated: CellData = { type, grassHeight: type === "grass" ? prev.grassHeight || 30 : 0, lastMowed: prev.lastMowed };
          next.set(key, updated);
          if (type === "grass") heights.set(key, updated.grassHeight); else heights.delete(key);
        }
      }
      return { cells: next, grassHeights: heights, dirty: true, version: s.version + 1, undoStack: [...s.undoStack.slice(-50), undoEntry], redoStack: [] };
    });
  },

  setGrassHeight: (x, y, height) => {
    set((s) => {
      const key = `${x},${y}`; const cell = s.cells.get(key);
      if (!cell || cell.type !== "grass") return s;
      const next = new Map(s.cells); next.set(key, { ...cell, grassHeight: clamp(height, 0, 100) });
      const heights = new Map(s.grassHeights); heights.set(key, clamp(height, 0, 100));
      return { cells: next, grassHeights: heights, dirty: true, version: s.version + 1 };
    });
  },

  addMower: (x, y, tier) => {
    if (get().saving) return null as unknown as Mower;
    const mower: Mower = { id: generateId(), spaceId: get().space?.id ?? "",
      name: `Podadora ${get().mowers.length + 1}`, x, y, fromX: x, fromY: y, moveT: 1,
      status: "idle", battery: 100, tier, path: [], pathIndex: 0,
      color: MOWER_PALETTE[get().mowers.length % MOWER_PALETTE.length] };
    set((s) => ({ mowers: [...s.mowers, mower], dirty: true, version: s.version + 1, fleetInitialized: false }));
    return mower;
  },

  removeMower: (id) => {
    if (get().saving) return;
    set((s) => ({ mowers: s.mowers.filter((m) => m.id !== id),
      selectedMowerId: s.selectedMowerId === id ? null : s.selectedMowerId,
      dirty: true, version: s.version + 1 }));
  },

  addStation: (x, y) => {
    if (get().saving) return null as unknown as ChargingStation;
    const station: ChargingStation = { id: generateId(), spaceId: get().space?.id ?? "", x, y, active: true };
    set((s) => {
      const cells = new Map(s.cells); cells.set(`${x},${y}`, { type: "charging_station", grassHeight: 0, lastMowed: 0 });
      return { stations: [...s.stations, station], cells, dirty: true, version: s.version + 1, fleetInitialized: false };
    });
    return station;
  },

  removeStation: (id) => {
    if (get().saving) return;
    set((s) => {
      const station = s.stations.find((st) => st.id === id);
      const cells = new Map(s.cells);
      if (station) cells.set(`${station.x},${station.y}`, { type: "grass", grassHeight: 30, lastMowed: 0 });
      return { stations: s.stations.filter((st) => st.id !== id), cells, dirty: true, version: s.version + 1, fleetInitialized: false };
    });
  },

  setSelectedMower: (id) => set({ selectedMowerId: id, commandMode: false }),
  setCommandMode: (on) => set({ commandMode: on }),
  setStrategyEditing: (editing) => {
    set({ strategyEditing: editing });
    if (editing) set({ isPlaying: false });
  },
  setStrategyEditMowerId: (id) => set({ strategyEditMowerId: id }),
  setStrategyEditMode: (mode) => set({ strategyEditMode: mode }),
  toggleStrategyTile: (mowerId, x, y) => {
    set((s) => {
      const mowers = s.mowers.map((m) => {
        if (m.id !== mowerId) return m;
        const tiles = [...(m.coverageTiles ?? [])];
        const idx = tiles.findIndex((t) => t.x === x && t.y === y);
        if (idx >= 0) tiles.splice(idx, 1);
        else tiles.push({ x, y });
        return { ...m, coverageTiles: tiles };
      });
      return { mowers, dirty: true, version: s.version + 1 };
    });
  },
  addStrategyTile: (mowerId, x, y) => {
    if (get().saving) return;
    set((s) => {
      const mowers = s.mowers.map((m) => {
        if (m.id === mowerId) {
          // Add to selected mower if not already there
          const tiles = m.coverageTiles ?? [];
          if (tiles.some((t) => t.x === x && t.y === y)) return m;
          return { ...m, coverageTiles: [...tiles, { x, y }] };
        }
        // Remove from any other mower that has this tile
        const tiles = m.coverageTiles ?? [];
        const filtered = tiles.filter((t) => !(t.x === x && t.y === y));
        if (filtered.length === tiles.length) return m;
        return { ...m, coverageTiles: filtered };
      });
      return { mowers, dirty: true, version: s.version + 1 };
    });
  },
  removeStrategyTile: (mowerId, x, y) => {
    if (get().saving) return;
    set((s) => {
      const mowers = s.mowers.map((m) => {
        if (m.id !== mowerId) return m;
        return { ...m, coverageTiles: (m.coverageTiles ?? []).filter((t) => !(t.x === x && t.y === y)) };
      });
      return { mowers, dirty: true, version: s.version + 1 };
    });
  },
  setStrategyPath: (mowerId, tiles) => {
    if (get().saving) return;
    set((s) => {
      const mowers = s.mowers.map((m) => m.id === mowerId ? { ...m, coverageTiles: tiles } : m);
      return { mowers, dirty: true, version: s.version + 1 };
    });
  },
  setMowerStation: (mowerId, stationId) => {
    set((s) => ({ mowers: s.mowers.map((m) => m.id === mowerId ? { ...m, assignedStationId: stationId } : m),
      dirty: true, version: s.version + 1 }));
  },
  sendMowerToStation: (mowerId) => {
    const state = get(); const mower = state.mowers.find((m) => m.id === mowerId);
    if (!mower) return; const station = state.stations.find((s) => s.id === mower.assignedStationId);
    if (!station) return;
    const path = findPath(mower.x, mower.y, station.x, station.y, state.cells, state.space!.width, state.space!.height);
    const remaining = path.slice(1);
    set((s) => ({ mowers: s.mowers.map((m) => m.id === mowerId ? {
      ...m, status: remaining.length > 0 ? ("returning" as const) : ("charging" as const),
      path: remaining, pathIndex: 0, fromX: mower.x, fromY: mower.y, moveT: 0 } : m),
      dirty: true, version: s.version + 1 }));
  },

  commandMower: (id, x, y) => {
    set((s) => {
      const mower = s.mowers.find((m) => m.id === id);
      if (!mower || !s.space) return s;
      const path = findPath(mower.x, mower.y, x, y, s.cells, s.space.width, s.space.height);
      const remaining = path.slice(1);
      return { mowers: s.mowers.map((m) => m.id === id ? {
        ...m, status: remaining.length > 0 ? ("operating" as const) : ("idle" as const),
        path: remaining, pathIndex: 0, fromX: mower.x, fromY: mower.y, moveT: 0 } : m),
        dirty: true, version: s.version + 1 };
    });
  },

  setPlaying: (playing) => {
    if (playing && !get().fleetInitialized && get().mowers.length > 0) get().initFleet();
    set({ isPlaying: playing });
  },
  setTimeMultiplier: (m) => {
    if (!TIME_MULTIPLIER_OPTIONS.includes(m as (typeof TIME_MULTIPLIER_OPTIONS)[number])) return;
    set({ timeMultiplier: m });
  },
  setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),

  initFleet: () => {
    const state = get();
    if (!state.space || state.stations.length === 0) return;
    const stationMap = assignStationsToMowers(state.mowers, state.stations);

    // First: position mowers at their assigned stations
    const positionedMowers = state.mowers.map((m, i) => {
      const st = stationMap.get(m.id);
      if (!st) return m;
      return {
        ...m, x: st.x, y: st.y, fromX: st.x, fromY: st.y, moveT: 1,
        status: "idle" as const, battery: state.config.batteryCapacity,
        path: [], pathIndex: 0,
        assignedStationId: st.id,
        color: m.color ?? MOWER_PALETTE[i % MOWER_PALETTE.length],
      };
    });

    // Then: compute tours based on positioned mowers
    const { tours, perimeters, trips: tripsMap } = computeCoverageTours(
      positionedMowers, state.cells, state.space.width, state.space.height,
      state.config.mowThreshold, stationMap,
    );

    // Finally: attach tour data to positioned mowers
    const mowers = positionedMowers.map((m) => ({
      ...m,
      coverageTiles: tours.get(m.id) ?? [],
      tourIndex: 0,
      perimeterEdges: perimeters.get(m.id) ?? [],
      trips: tripsMap?.get(m.id) ?? [],
      tripIndex: 0,
      schedule: m.schedule ?? {
        mode: state.config.scheduleMode,
        intervalMs: state.config.scheduleIntervalMs,
        thresholdPct: state.config.scheduleThresholdPct,
        hour: state.config.scheduleHour,
        minute: state.config.scheduleMinute,
      },
    }));

    set({ mowers, fleetInitialized: true, dirty: true, version: get().version + 1 });
  },

  tick: (dtSeconds) => {
    const state = get();
    if (!state.space || !state.isPlaying) return;
    const space = state.space;
    const cells = state.cells;
    const heights = new Map(state.grassHeights);
    let dirty = state.dirty;

    // Advance simulated clock: 1 real second = 1 simulated minute at 1x speed
    const simMinutesElapsed = dtSeconds * state.timeMultiplier;
    let newTimeMs = state.simulatedTimeMs + simMinutesElapsed * 60 * 1000;
    let newDay = state.simulatedDay;
    if (newTimeMs >= 24 * 3600 * 1000) {
      newTimeMs -= 24 * 3600 * 1000;
      newDay = (newDay + 1) % 7;
    }

    // Grass growth
    const rate = state.config.grassGrowthRatePerSecond;
    for (const [key, cell] of cells.entries()) {
      if (cell.type !== "grass") continue;
      const current = heights.get(key) ?? cell.grassHeight ?? 30;
      const next = clamp(current + rate * dtSeconds * state.timeMultiplier, 0, 100);
      if (Math.abs(next - current) > 0.001) { heights.set(key, next); dirty = true; }
    }
    const updatedCells = new Map(cells);
    for (const [key, h] of heights.entries()) {
      const cell = updatedCells.get(key);
      if (cell && cell.type === "grass") updatedCells.set(key, { ...cell, grassHeight: h });
    }

    // Sync station cells
    for (const s of state.stations) {
      if (!s.active) continue;
      const key = `${s.x},${s.y}`;
      if (!updatedCells.get(key) || updatedCells.get(key)!.type !== "charging_station") {
        updatedCells.set(key, { type: "charging_station", grassHeight: 0, lastMowed: 0 });
        dirty = true;
      }
    }

    const mowers = state.mowers.map((m) => ({ ...m }));
    const drainPerCell = state.config.batteryDrainPerSecond / MOWER_SPEED_CELLS_PER_SECOND;
    const speed = MOWER_SPEED_CELLS_PER_SECOND;

    // Collision avoidance: track occupied tiles
    const occupiedTiles = new Set<string>();
    for (const m of mowers) {
      if (m.status === "operating" || m.status === "returning") {
        occupiedTiles.add(`${m.x},${m.y}`);
      }
    }

    for (const mower of mowers) {
      if (mower.status === "faulted") continue;
      const coverageTiles = mower.coverageTiles ?? [];
      const tourIdx = mower.tourIndex ?? 0;
      const assignedStation = state.stations.find((s) => s.id === mower.assignedStationId);

      // ── Charging ────────────────────────────────────────────────────
      if (mower.status === "charging") {
        const cell = updatedCells.get(`${mower.x},${mower.y}`);
        if (cell && cell.type === "charging_station") {
          mower.battery = clamp(mower.battery + state.config.chargingRatePerSecond * dtSeconds * state.timeMultiplier, 0, state.config.batteryCapacity);
          if (mower.battery >= state.config.batteryCapacity) {
            mower.battery = state.config.batteryCapacity;
            // Check if any coverage tile is mowable again (grass regrew)
            let hasMowable = false;
            for (let i = 0; i < coverageTiles.length; i++) {
              const t = coverageTiles[i];
              const c = updatedCells.get(`${t.x},${t.y}`);
              if (c && c.type === "grass" && (c.grassHeight ?? 0) >= state.config.mowThreshold) {
                hasMowable = true; break;
              }
            }
            if (!hasMowable) {
              // No mowable tiles — stay docked
              mower.moveT = 1; mower.fromX = mower.x; mower.fromY = mower.y;
              dirty = true; continue;
            }
            // Check schedule before restarting
            const scheduleMode = mower.schedule?.mode ?? state.config.scheduleMode;
            const lastRun = mower.schedule?.lastScheduledRun;
            if (!shouldOperate(scheduleMode, state.config, newTimeMs, updatedCells, coverageTiles, lastRun)) {
              mower.moveT = 1; mower.fromX = mower.x; mower.fromY = mower.y;
              dirty = true; continue;
            }
            // Reset trip index when restarting from full charge
            mower.tripIndex = 0;
            // Restart tour from beginning (grass regrew on earlier tiles)
            mower.tourIndex = 0;
            mower.status = "operating";
            mower.path = []; mower.pathIndex = 0;
            mower.moveT = 1; mower.fromX = mower.x; mower.fromY = mower.y;
            get().addLogEntry({ time: newTimeMs, day: newDay, message: `${mower.name} batería completa — reanudando operación`, type: "success" });
            dirty = true;
          }
        } else {
          mower.status = "operating"; mower.path = []; mower.pathIndex = 0; dirty = true;
        }
        continue;
      }

      const cellHere = updatedCells.get(`${mower.x},${mower.y}`);

      // ── Returning: arrived at station ────────────────────────────────
      if (mower.status === "returning" && cellHere && cellHere.type === "charging_station") {
        mower.status = "charging"; mower.path = []; mower.pathIndex = 0;
        mower.moveT = 1; mower.fromX = mower.x; mower.fromY = mower.y;
        get().addLogEntry({ time: newTimeMs, day: newDay, message: `${mower.name} cargando en estación`, type: "info" });
        dirty = true; continue;
      }

      // ── Operating: check if battery can complete the REMAINING trip ─
      if (mower.status === "operating" && assignedStation) {
        const trips = mower.trips ?? [];
        const currentTripIdx = mower.tripIndex ?? 0;
        // Use current trip's tiles for battery estimate, not full coverageTiles
        let tripTiles = coverageTiles;
        if (trips.length > 0 && currentTripIdx < trips.length) {
          tripTiles = trips[currentTripIdx].tiles;
        }
        // Find which tiles in the trip are still ahead (not yet mowed)
        const tripTileSet = new Set(tripTiles.map((t) => `${t.x},${t.y}`));
        const remainingTiles: PathPoint[] = [];
        for (let i = tourIdx; i < coverageTiles.length; i++) {
          if (tripTileSet.has(`${coverageTiles[i].x},${coverageTiles[i].y}`)) {
            remainingTiles.push(coverageTiles[i]);
          }
        }
        const remainingDrain = estimateTourDrain(mower.x, mower.y, remainingTiles, 0, drainPerCell);
        const returnDrain = (Math.abs(mower.x - assignedStation.x) + Math.abs(mower.y - assignedStation.y)) * drainPerCell * 1.2 + 5;
        if (mower.battery <= remainingDrain + returnDrain) {
          // Can't complete trip — return to station
          mower.status = "returning";
          mower.path = findPath(mower.x, mower.y, assignedStation.x, assignedStation.y, updatedCells, space.width, space.height);
          mower.pathIndex = 0; mower.fromX = mower.x; mower.fromY = mower.y; mower.moveT = 0;
          get().addLogEntry({ time: newTimeMs, day: newDay, message: `${mower.name} retornando — batería baja (${Math.round(mower.battery)}%)`, type: "warning" });
          dirty = true; continue;
        }
      }

      // ── Needs new path segment ──────────────────────────────────────
      const needsNewPath = mower.path.length === 0 || mower.pathIndex >= mower.path.length;
      if (needsNewPath) {
        if (mower.status === "operating") {
          const coverageTiles = mower.coverageTiles ?? [];
          const trips = mower.trips ?? [];
          const currentTripIdx = mower.tripIndex ?? 0;

          // Multi-trip: get current trip's tiles
          let candidateTiles: PathPoint[];
          if (trips.length > 0 && currentTripIdx < trips.length) {
            candidateTiles = trips[currentTripIdx].tiles;
          } else {
            candidateTiles = coverageTiles;
          }

          // Dynamic prioritization: find tile with highest estimated height
          const now = Date.now();
          let nextTarget: PathPoint | null = null;
          let targetIdx = -1;
          let bestHeight = -1;
          let bestDist = Infinity;

          for (let i = tourIdx; i < coverageTiles.length; i++) {
            const t = coverageTiles[i];
            const c = updatedCells.get(`${t.x},${t.y}`);
            if (c && c.type === "grass") {
              // Check if this tile is in current trip
              if (trips.length > 0 && currentTripIdx < trips.length) {
                const inTrip = trips[currentTripIdx].tiles.some((tt) => tt.x === t.x && tt.y === t.y);
                if (!inTrip) continue;
              }
              // Estimate height from lastMowed
              const elapsed = (now - c.lastMowed) / 1000;
              const estimated = Math.min(100, (elapsed * state.config.grassGrowthRatePerSecond * 100));
              if (estimated >= state.config.mowThreshold) {
                // Prefer highest grass, then nearest if tie
                const dist = Math.abs(t.x - mower.x) + Math.abs(t.y - mower.y);
                if (estimated > bestHeight || (estimated === bestHeight && dist < bestDist)) {
                  bestHeight = estimated;
                  bestDist = dist;
                  nextTarget = t;
                  targetIdx = i;
                }
              }
            }
          }

          if (nextTarget) {
            // Collision avoidance: skip if target is occupied
            const tKey = `${nextTarget.x},${nextTarget.y}`;
            if (occupiedTiles.has(tKey)) {
              // Try next available tile
              for (let i = tourIdx; i < coverageTiles.length; i++) {
                const t = coverageTiles[i];
                const tk = `${t.x},${t.y}`;
                if (!occupiedTiles.has(tk)) {
                  const c = updatedCells.get(tk);
                  if (c && c.type === "grass") {
                    const elapsed = (now - c.lastMowed) / 1000;
                    const estimated = Math.min(100, (elapsed * state.config.grassGrowthRatePerSecond * 100));
                    if (estimated >= state.config.mowThreshold) {
                      nextTarget = t;
                      targetIdx = i;
                      break;
                    }
                  }
                }
              }
            }

            mower.path = findPath(mower.x, mower.y, nextTarget.x, nextTarget.y, updatedCells, space.width, space.height);
            mower.pathIndex = 0; mower.fromX = mower.x; mower.fromY = mower.y; mower.moveT = 0;
            mower.tourIndex = targetIdx;
            if (mower.path.length === 0) continue;
          } else {
            // No more mowable tiles in current trip
            if (trips.length > 0 && currentTripIdx < trips.length) {
              // Multi-trip: return to station, then advance trip
              mower.tripIndex = currentTripIdx + 1;
              mower.tourIndex = 0;
              if (assignedStation) {
                mower.status = "returning";
                mower.path = findPath(mower.x, mower.y, assignedStation.x, assignedStation.y, updatedCells, space.width, space.height);
                mower.pathIndex = 0; mower.fromX = mower.x; mower.fromY = mower.y; mower.moveT = 0;
              }
            } else if (assignedStation) {
              mower.status = "returning";
              mower.path = findPath(mower.x, mower.y, assignedStation.x, assignedStation.y, updatedCells, space.width, space.height);
              mower.pathIndex = 0; mower.fromX = mower.x; mower.fromY = mower.y; mower.moveT = 0;
            } else {
              mower.status = "idle"; mower.path = []; mower.pathIndex = 0;
              mower.moveT = 1; mower.fromX = mower.x; mower.fromY = mower.y;
            }
            dirty = true;
          }
        } else if (mower.status === "idle" && assignedStation) {
          // Check schedule before transitioning to operating
          const scheduleMode = mower.schedule?.mode ?? state.config.scheduleMode;
          const lastRun = mower.schedule?.lastScheduledRun;
          if (shouldOperate(scheduleMode, state.config, newTimeMs, updatedCells, coverageTiles, lastRun)) {
            mower.status = "operating";
            mower.tourIndex = 0;
            if (mower.schedule) mower.schedule.lastScheduledRun = newTimeMs;
            dirty = true;
          }
          continue;
        }
      }

      // ── Advance along path ──────────────────────────────────────────
      if (mower.status === "returning" || mower.status === "operating") {
        let remaining = dtSeconds * state.timeMultiplier * speed;
        while (remaining > 0) {
          if (mower.pathIndex >= mower.path.length) {
            mower.fromX = mower.x; mower.fromY = mower.y; mower.moveT = 1; break;
          }
          const target = mower.path[mower.pathIndex];
          if (mower.fromX !== mower.x || mower.fromY !== mower.y) {
            mower.fromX = mower.x; mower.fromY = mower.y; mower.moveT = 0;
          }
          if (mower.moveT === 0) {
            if (Math.abs(target.x - mower.x) + Math.abs(target.y - mower.y) > 1) {
              mower.path = []; mower.pathIndex = 0; break;
            }
            if (target.x === mower.x && target.y === mower.y) { mower.pathIndex++; continue; }
          }
          const res = resistanceFor(updatedCells.get(`${target.x},${target.y}`)?.type ?? "empty");
          const effectiveSpeed = speed / (Number.isFinite(res) ? res : 1);
          const segRemaining = (1 - mower.moveT) / effectiveSpeed * speed;
          if (remaining < segRemaining) {
            mower.moveT += (remaining * effectiveSpeed) / speed; remaining = 0;
          } else {
            remaining -= segRemaining;
            mower.x = target.x; mower.y = target.y;
            mower.fromX = target.x; mower.fromY = target.y;
            mower.moveT = 0; mower.pathIndex++;

            const newCell = updatedCells.get(`${mower.x},${mower.y}`);
            const isMowing = mower.status === "operating" && newCell?.type === "grass";
            // Drain per tile = drainPerSecond / speed * multiplier (constant, independent of dt)
            const drainPerTile = (state.config.batteryDrainPerSecond / speed) * (isMowing ? BATTERY_MOWING_MULTIPLIER : BATTERY_TRANSIT_MULTIPLIER);
            mower.battery = clamp(
              mower.battery - drainPerTile,
              0, state.config.batteryCapacity,
            );

            // Mow grass
            const k = `${mower.x},${mower.y}`;
            const c = updatedCells.get(k);
            if (c && c.type === "grass" && mower.status === "operating") {
              heights.set(k, 0);
              updatedCells.set(k, { ...c, grassHeight: 0, lastMowed: Date.now() });
              // Advance tourIndex past this tile
              if (mower.tourIndex !== undefined && coverageTiles[mower.tourIndex]?.x === mower.x && coverageTiles[mower.tourIndex]?.y === mower.y) {
                mower.tourIndex = (mower.tourIndex ?? 0) + 1;
              }
            }
            dirty = true;

            if (mower.status === "returning" && c && c.type === "charging_station") {
              mower.status = "charging"; mower.path = []; mower.pathIndex = 0; mower.moveT = 1; break;
            }
          }
        }
      }
    }

    set({ cells: updatedCells, grassHeights: heights, mowers, dirty, version: get().version + 1, simulatedTimeMs: newTimeMs, simulatedDay: newDay });
    if (typeof window !== "undefined") {
      (window as unknown as { __walle?: unknown }).__walle = {
        getState: () => get(),
        forceReturn: (id: string) => { const m = get().mowers.find((m) => m.id === id); if (!m) return null; get().commandMower(id, m.x, m.y); return get().mowers.find((m) => m.id === id); },
        drainBattery: (id: string, target: number) => { get().mowers.forEach((m) => { if (m.id === id) m.battery = target; }); },
      };
    }
  },

  saveSpace: async () => {
    const state = get();
    if (!state.space || state.saving) return;
    set({ saving: true });
    try {
      const entries: Array<{ key: string; data: CellData }> = [];
      for (const [key, data] of state.cells.entries()) entries.push({ key, data });
      const grassEntries: Array<{ key: string; height: number }> = [];
      for (const [key, h] of state.grassHeights.entries()) grassEntries.push({ key, height: h });
      const mowers = state.mowers.map((m) => ({ ...m, spaceId: state.space!.id }));
      const stations = state.stations.map((s) => ({ ...s, spaceId: state.space!.id }));
      await Promise.all([
        db.putMapCells(state.space.id, entries),
        db.putGrassDataBatch(state.space.id, grassEntries),
        db.putMowersBatch(mowers),
        db.putStationsBatch(stations),
        db.putSpace({ ...state.space, updatedAt: Date.now() }),
      ]);
      set({ dirty: false, saving: false });
    } catch {
      set({ saving: false });
    }
  },

  setDirty: (d) => set({ dirty: d }),
}));

export { TICK_MS };
