"use client";

import { useSimulationStore } from "@/lib/store/simulationStore";
import { useContextStore } from "@/lib/store/contextStore";
import type { CellData, Mower, ChargingStation } from "@/lib/types";

export function exportSpaceToJson() {
  const state = useSimulationStore.getState();
  const ctx = useContextStore.getState();
  if (!state.space) return;
  const space = state.space;
  const cells: Record<string, CellData> = {};
  for (const [k, v] of state.cells.entries()) {
    cells[k] = v;
  }
  const grass: Record<string, number> = {};
  for (const [k, v] of state.grassHeights.entries()) {
    grass[k] = v;
  }
  const mowers: Mower[] = state.mowers;
  const stations: ChargingStation[] = state.stations;
  const project = ctx.projects.find((p) => p.id === space.projectId);
  const client = project ? ctx.clients.find((c) => c.id === project.clientId) : undefined;

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    client: client && { id: client.id, name: client.name, tier: client.tier },
    project: project && {
      id: project.id,
      name: project.name,
      config: project.config,
    },
    space: {
      id: space.id,
      name: space.name,
      width: space.width,
      height: space.height,
      cellSize: space.cellSize,
    },
    cells,
    grass,
    mowers,
    stations,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${space.name.replace(/\s+/g, "_")}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
