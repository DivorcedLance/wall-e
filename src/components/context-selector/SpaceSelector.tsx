"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Map as MapIcon,
  Plus,
  Trash2,
  Sparkles,
  Leaf,
  Trees,
  Route,
  Building2,
  Bot,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Tooltip } from "@/components/ui/tooltip";
import { useContextStore } from "@/lib/store/contextStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { db } from "@/lib/db/indexedDB";
import { MIN_GRID, MAX_GRID, MOWER_PALETTE } from "@/lib/constants";
import { DEMOS } from "@/lib/demos";
import { cn } from "@/lib/utils";
import { assignStationsToMowers, computeCoverageTours } from "@/lib/fleet";
import { TIER_CONFIGS } from "@/lib/types";
import type { Mower, ChargingStation, CellData, ClientTier, TierConfig } from "@/lib/types";
import type { DemoCell } from "@/lib/demos";
import { generateId } from "@/lib/utils";

const DEMO_ICONS: Record<string, typeof Leaf> = {
  leaf: Leaf,
  trees: Trees,
  route: Route,
  building: Building2,
  bot: Bot,
};

const TYPE_COLORS: Record<string, string> = {
  grass: "#22c55e",
  path: "#a8a29e",
  flowers: "#ec4899",
  building: "#475569",
  obstacle: "#78716c",
  tree: "#166534",
  water: "#3b82f6",
  gravel: "#d6d3d1",
  sand: "#fde68a",
  charging_station: "#fbbf24",
  empty: "#0a0e1a",
};

function DemoPreview({ demoId }: { demoId: string }) {
  const demo = DEMOS.find((d) => d.id === demoId);
  if (!demo) return null;
  const layout = demo.build();
  const w = demo.width;
  const h = demo.height;

  // Sample cells: take every Nth cell
  const sampleStep = Math.max(1, Math.floor(Math.max(w, h) / 20));
  const cells: DemoCell[] = [];
  for (let y = 0; y < h; y += sampleStep) {
    for (let x = 0; x < w; x += sampleStep) {
      const c = layout.cells.find((cl) => cl.x === x && cl.y === y);
      if (c) cells.push(c);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ imageRendering: "pixelated" }}
    >
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={sampleStep}
          height={sampleStep}
          fill={TYPE_COLORS[c.type] ?? "#0a0e1a"}
        />
      ))}
      {layout.stations.map((s, i) => (
        <circle key={`s${i}`} cx={s.x + 0.5} cy={s.y + 0.5} r={1.2} fill="#fbbf24" />
      ))}
      {layout.mowers.map((m, i) => (
        <rect key={`m${i}`} x={m.x} y={m.y} width={1.5} height={1.5} fill="#22c55e" />
      ))}
    </svg>
  );
}

interface SpaceSelectorProps {
  onCreated?: () => void;
}

export function SpaceSelector({ onCreated }: SpaceSelectorProps) {
  const activeProjectId = useContextStore((s) => s.activeProjectId);
  const allSpaces = useContextStore((s) => s.spaces);
  const activeId = useContextStore((s) => s.activeSpaceId);
  const setActive = useContextStore((s) => s.setActiveSpace);
  const create = useContextStore((s) => s.createSpace);
  const remove = useContextStore((s) => s.deleteSpace);
  const projects = useContextStore((s) => s.projects);
  const updateConfig = useContextStore((s) => s.updateProjectConfig);

  const spaces = allSpaces.filter((s) => s.projectId === activeProjectId);
  const activeSpace = spaces.find((s) => s.id === activeId);

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [w, setW] = useState(20);
  const [h, setH] = useState(20);
  const [selectedDemo, setSelectedDemo] = useState<string>("blank");
  const [creating, setCreating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Tier limits
  const clients = useContextStore((s) => s.clients);
  const activeClientId = useContextStore((s) => s.activeClientId);
  const activeClient = clients.find((c) => c.id === activeClientId);
  const tierConfig: TierConfig | null = activeClient ? (TIER_CONFIGS as Record<ClientTier, TierConfig>)[activeClient.tier] ?? null : null;
  const atSpaceLimit = tierConfig ? spaces.length >= tierConfig.maxSpaces : false;

  const selectedDemoDef = useMemo(
    () => DEMOS.find((d) => d.id === selectedDemo),
    [selectedDemo],
  );

  // Clamp grid to tier max
  const effectiveMaxGrid = tierConfig ? Math.min(MAX_GRID, tierConfig.maxGridSize) : MAX_GRID;

  useEffect(() => {
    if (selectedDemo !== "blank" && selectedDemoDef) {
      setName(selectedDemoDef.name);
    } else {
      setName("");
    }
  }, [selectedDemo, selectedDemoDef]);

  const handleCreate = async () => {
    if (!activeProjectId || creating) return;
    const project = projects.find((p) => p.id === activeProjectId);
    if (!project) return;
    const useDemo = selectedDemo !== "blank" && selectedDemoDef;
    const width = useDemo ? selectedDemoDef.width : w;
    const height = useDemo ? selectedDemoDef.height : h;
    setCreating(true);
    try {
      const sp = await create(activeProjectId, name || (useDemo ? selectedDemoDef.name : "Espacio"), width, height);
      setActive(sp.id);
      if (useDemo) {
        const layout = selectedDemoDef.build();
        const stationKeys = new Set(layout.stations.map((s) => `${s.x},${s.y}`));
        const cellEntries = layout.cells.map((c) => {
          const key = `${c.x},${c.y}`;
          const isStation = stationKeys.has(key);
          return {
            key,
            data: {
              type: isStation ? ("charging_station" as const) : c.type,
              grassHeight: isStation || c.type !== "grass" ? 0 : c.grassHeight ?? 100,
              lastMowed: 0,
            },
          };
        });
        for (const s of layout.stations) {
          const key = `${s.x},${s.y}`;
          if (!cellEntries.find((e) => e.key === key)) {
            cellEntries.push({ key, data: { type: "charging_station" as const, grassHeight: 0, lastMowed: 0 } });
          }
        }
        await db.putMapCells(sp.id, cellEntries);
        const grassEntries = layout.cells
          .filter((c) => c.type === "grass" && c.grassHeight !== undefined && !stationKeys.has(`${c.x},${c.y}`))
          .map((c) => ({ key: `${c.x},${c.y}`, height: c.grassHeight! }));
        for (const { key, height } of grassEntries) {
          await db.putGrassData(sp.id, key, height);
        }
        const mowers: Mower[] = layout.mowers.map((m, i) => ({
          id: generateId(), spaceId: sp.id, name: `Podadora ${i + 1}`,
          x: m.x, y: m.y, fromX: m.x, fromY: m.y, moveT: 1,
          status: "idle", battery: 100, tier: m.tier, path: [], pathIndex: 0,
          color: MOWER_PALETTE[i % MOWER_PALETTE.length],
        }));
        const stations: ChargingStation[] = layout.stations.map((s) => ({
          id: generateId(), spaceId: sp.id, x: s.x, y: s.y, active: true,
        }));

        const cellsMap: Map<string, CellData> = new Map();
        for (const e of cellEntries) cellsMap.set(e.key, e.data as CellData);
        const stationMap = assignStationsToMowers(mowers, stations);
        const { tours, perimeters } = computeCoverageTours(
          mowers, cellsMap, width, height, project.config.mowThreshold, stationMap,
        );
        const enrichedMowers = mowers.map((m) => ({
          ...m,
          x: stationMap.get(m.id)?.x ?? m.x,
          y: stationMap.get(m.id)?.y ?? m.y,
          fromX: stationMap.get(m.id)?.x ?? m.x,
          fromY: stationMap.get(m.id)?.y ?? m.y,
          assignedStationId: stationMap.get(m.id)?.id,
          coverageTiles: tours.get(m.id) ?? [],
          tourIndex: 0,
          perimeterEdges: perimeters.get(m.id) ?? [],
        }));

        for (const mower of enrichedMowers) await db.putMower(mower);
        for (const station of stations) await db.putStation(station);
      }
      await updateConfig(project.id, {
        ...project.config,
        grassGrowthRatePerSecond: Math.max(project.config.grassGrowthRatePerSecond, 0.6),
      });
      setName(""); setShowNew(false); setSelectedDemo("blank");
      onCreated?.();
    } catch (err) {
      console.error("Error creating space:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <MapIcon className="h-4 w-4 text-primary" />
          Espacio
        </Label>
        <Tooltip content={showNew ? "Cerrar" : "Crear espacio"}>
          <Button
            size="icon" variant="ghost"
            onClick={() => { setShowNew(!showNew); if (showNew) setName(""); }}
            className="h-7 w-7"
            disabled={!activeProjectId}
          >
            {showNew ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </Tooltip>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={activeId ?? ""}
            onChange={(e) => setActive(e.target.value || null)}
            disabled={!activeProjectId}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
              !activeId && "text-muted-foreground",
            )}
          >
            <option value="" disabled>
              {activeProjectId ? "Selecciona un espacio" : "Selecciona un proyecto primero"}
            </option>
            {spaces.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name} ({sp.width}×{sp.height})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {activeId && (
          <Tooltip content="Eliminar">
            <Button size="icon" variant="ghost" className="shrink-0 h-9 w-9" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </Tooltip>
        )}
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Eliminar espacio"
          description="¿Eliminar este espacio y todos sus datos? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          variant="destructive"
          onConfirm={() => { if (activeId) remove(activeId); }}
        />
      </div>

      {activeSpace && (
        <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Activo:</span>
          <span className="text-xs font-medium">{activeSpace.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{activeSpace.width}×{activeSpace.height}</Badge>
        </div>
      )}

      <Collapsible open={showNew} onOpenChange={setShowNew}>
        <CollapsibleContent>
          <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <Input
              placeholder="Nombre del espacio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
              className="h-9"
            />
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Empezar desde una demo
              </Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                <DemoCard
                  id="blank"
                  title="En blanco"
                  subtitle={`${w}×${h}`}
                  selected={selectedDemo === "blank"}
                  onSelect={() => setSelectedDemo("blank")}
                  preview={<BlankPreview w={w} h={h} />}
                />
                {DEMOS.map((d) => {
                  const tierOrder = ["base", "standard", "premium", "enterprise"] as const;
                  const clientTierIdx = activeClient ? tierOrder.indexOf(activeClient.tier) : 3;
                  const demoTierIdx = tierOrder.indexOf(d.requiredTier);
                  const locked = clientTierIdx < demoTierIdx;
                  return (
                    <DemoCard
                      key={d.id}
                      id={d.id}
                      title={d.name}
                      subtitle={`${d.width}×${d.height} · ${TIER_CONFIGS[d.requiredTier]?.label ?? d.requiredTier}`}
                      selected={selectedDemo === d.id}
                      onSelect={() => { if (!locked) setSelectedDemo(d.id); }}
                      preview={<DemoPreview demoId={d.id} />}
                      locked={locked}
                    />
                  );
                })}
              </div>
              {selectedDemoDef && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {selectedDemoDef.description}
                </p>
              )}
            </div>
            {selectedDemo === "blank" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Ancho</Label>
                  <Input type="number" min={MIN_GRID} max={effectiveMaxGrid} value={w} onChange={(e) => setW(Number(e.target.value))} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Alto</Label>
                  <Input type="number" min={MIN_GRID} max={effectiveMaxGrid} value={h} onChange={(e) => setH(Number(e.target.value))} className="h-9" />
                </div>
              </div>
            )}
            <Button onClick={handleCreate} size="sm" className="w-full h-9" disabled={creating || atSpaceLimit}>
              {creating ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" /> Creando...</>
              ) : atSpaceLimit ? (
                `Límite de ${tierConfig?.maxSpaces} espacios (${activeClient?.tier})`
              ) : (
                <><Check className="h-3.5 w-3.5 mr-1.5" /> Crear espacio</>
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function BlankPreview({ w, h }: { w: number; h: number }) {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width={w} height={h} fill="#22c55e" />
      {Array.from({ length: Math.floor(w / 5) }).map((_, i) => (
        <line key={`v${i}`} x1={i * 5} y1="0" x2={i * 5} y2={h} stroke="#16a34a" strokeWidth="0.1" />
      ))}
      {Array.from({ length: Math.floor(h / 5) }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 5} x2={w} y2={i * 5} stroke="#16a34a" strokeWidth="0.1" />
      ))}
    </svg>
  );
}

function DemoCard({
  id,
  title,
  subtitle,
  selected,
  onSelect,
  preview,
  locked,
}: {
  id: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
  preview: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      className={cn(
        "group flex flex-col gap-1.5 rounded-md border border-border bg-background p-1.5 text-left transition-colors",
        !locked && "hover:border-primary/50",
        selected && "border-primary bg-primary/10",
        locked && "opacity-40 cursor-not-allowed",
      )}
      data-demo={id}
      title={locked ? "Requiere plan superior" : undefined}
    >
      <div className="aspect-[5/3] w-full overflow-hidden rounded bg-muted/50 relative">
        {preview}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}
      </div>
      <div className="px-0.5">
        <span className="block text-[11px] font-medium leading-tight truncate">{title}</span>
        <span className="block font-mono text-[9px] text-muted-foreground">{subtitle}</span>
      </div>
    </button>
  );
}
