"use client";

import { create } from "zustand";
import type { ToolType } from "@/lib/types";

const EDITING_TOOLS = new Set<ToolType>([
  "grass",
  "path",
  "flowers",
  "building",
  "obstacle",
  "tree",
  "water",
  "gravel",
  "charging_station",
  "empty",
  "erase",
]);

interface EditorState {
  tool: ToolType;
  grassBrushHeight: number;
  selectedCells: Array<{ x: number; y: number }>;
  hoveredCell: { x: number; y: number } | null;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showCoordinates: boolean;
  followMower: boolean;
  activeSidebarTab: string;
  clipboard: Array<{ x: number; y: number; type: string; grassHeight?: number }> | null;
  setTool: (tool: ToolType) => void;
  setGrassBrushHeight: (height: number) => void;
  setSelectedCells: (cells: Array<{ x: number; y: number }>) => void;
  toggleCellSelected: (x: number, y: number) => void;
  clearSelection: () => void;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleCoordinates: () => void;
  setFollowMower: (follow: boolean) => void;
  setActiveSidebarTab: (tab: string) => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tool: "select",
  grassBrushHeight: 50,
  selectedCells: [],
  hoveredCell: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  showCoordinates: false,
  followMower: false,
  activeSidebarTab: "tools",
  clipboard: null,

  setTool: (tool) => {
    set({ tool, selectedCells: [] });
    if (EDITING_TOOLS.has(tool)) {
      // Pause the simulation whenever the user picks up an editing tool.
      // The map shouldn't be mutating under the user's brush.
      void import("@/lib/store/simulationStore").then(({ useSimulationStore }) => {
        if (useSimulationStore.getState().isPlaying) {
          useSimulationStore.getState().setPlaying(false);
        }
      });
    }
  },
  setGrassBrushHeight: (height) => set({ grassBrushHeight: height }),
  setSelectedCells: (cells) => set({ selectedCells: cells }),
  toggleCellSelected: (x, y) => {
    const key = `${x},${y}`;
    const exists = get().selectedCells.some(
      (c) => `${c.x},${c.y}` === key,
    );
    if (exists) {
      set((s) => ({
        selectedCells: s.selectedCells.filter(
          (c) => `${c.x},${c.y}` !== key,
        ),
      }));
    } else {
      set((s) => ({
        selectedCells: [...s.selectedCells, { x, y }],
      }));
    }
  },
  clearSelection: () => set({ selectedCells: [] }),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
  setZoom: (zoom) => set({ zoom: Math.max(0.3, Math.min(3, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(3, s.zoom * 1.2) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(0.3, s.zoom / 1.2) })),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleCoordinates: () =>
    set((s) => ({ showCoordinates: !s.showCoordinates })),
  setFollowMower: (follow) => set({ followMower: follow }),
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  copySelection: () => {
    const { selectedCells } = get();
    if (selectedCells.length === 0) return;
    void import("@/lib/store/simulationStore").then(({ useSimulationStore }) => {
      const cells = useSimulationStore.getState().cells;
      const clipboard = selectedCells.map(({ x, y }) => {
        const cell = cells.get(`${x},${y}`);
        return { x, y, type: cell?.type ?? "grass", grassHeight: cell?.grassHeight };
      });
      set({ clipboard });
    });
  },
  cutSelection: () => {
    const { selectedCells } = get();
    if (selectedCells.length === 0) return;
    void import("@/lib/store/simulationStore").then(({ useSimulationStore }) => {
      const state = useSimulationStore.getState();
      const cells = state.cells;
      const clipboard = selectedCells.map(({ x, y }) => {
        const cell = cells.get(`${x},${y}`);
        return { x, y, type: cell?.type ?? "grass", grassHeight: cell?.grassHeight };
      });
      set({ clipboard });
      for (const { x, y } of selectedCells) {
        state.paintCell(x, y, "empty");
      }
    });
  },
  pasteClipboard: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.length === 0) return;
    void import("@/lib/store/simulationStore").then(({ useSimulationStore }) => {
      const state = useSimulationStore.getState();
      for (const { x, y, type, grassHeight } of clipboard) {
        state.paintCell(x, y, type as any);
        if (type === "grass" && grassHeight !== undefined) {
          state.setGrassHeight(x, y, grassHeight);
        }
      }
    });
  },
}));
