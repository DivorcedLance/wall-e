"use client";

import { useState } from "react";
import {
  Bot,
  Plug,
  Trash2,
  Layers,
  Settings2,
  X,
  Crosshair,
  Send,
  PlayCircle,
  PauseCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Map as MapIcon,
  Route,
  Sparkles,
  Clock,
  Timer,
  CalendarClock,
  DollarSign,
  Crown,
  Activity,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEditorStore } from "@/lib/store/editorStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { GRASS_COLOR_MID } from "@/lib/constants";
import { sortTilesNearestNeighbor } from "@/lib/fleet";
import { PriceCalculator } from "@/components/game/PriceCalculator";
import { useContextStore } from "@/lib/store/contextStore";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TIER_CONFIGS } from "@/lib/types";
import type { ClientTier, TierConfig, MowerTier } from "@/lib/types";
import { TelemetryModal } from "@/components/game/TelemetryModal";

declare global {
  interface WindowEventMap {
    "walle:center-mower": CustomEvent<{ id: string }>;
    "walle:command-mode": CustomEvent<{ on: boolean }>;
  }
}

const TIER_OPTIONS: Array<{ value: MowerTier; label: string }> = [
  { value: "base", label: "Base" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  charging: "secondary",
  returning: "outline",
  faulted: "destructive",
  idle: "outline",
  operating: "default",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "inactivo",
  operating: "trabajando",
  charging: "cargando",
  returning: "retornando",
  faulted: "error",
};

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatSimTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function msToHM(ms: number): { hours: number; minutes: number } {
  const totalMinutes = Math.floor(ms / 60000);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

function hmToMS(h: number, m: number): number {
  return (h * 60 + m) * 60 * 1000;
}

// Exponential mapping: slider 0-100 → rate 0.01-100
function sliderToGrowth(slider: number): number {
  if (slider <= 0) return 0;
  return 0.01 * Math.pow(10, slider / 50);
}
function growthToSlider(rate: number): number {
  if (rate <= 0) return 0;
  return Math.min(100, Math.max(0, 50 * Math.log10(rate / 0.01)));
}

export function Sidebar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const grassBrushHeight = useEditorStore((s) => s.grassBrushHeight);
  const setGrassBrushHeight = useEditorStore((s) => s.setGrassBrushHeight);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const resetMap = useSimulationStore((s) => s.resetMap);
  const space = useSimulationStore((s) => s.space);
  const mowers = useSimulationStore((s) => s.mowers);
  const stations = useSimulationStore((s) => s.stations);
  const removeMower = useSimulationStore((s) => s.removeMower);
  const removeStation = useSimulationStore((s) => s.removeStation);
  const addStation = useSimulationStore((s) => s.addStation);
  const addMower = useSimulationStore((s) => s.addMower);
  const selectedMowerId = useSimulationStore((s) => s.selectedMowerId);
  const setSelectedMower = useSimulationStore((s) => s.setSelectedMower);
  const commandMode = useSimulationStore((s) => s.commandMode);
  const setCommandMode = useSimulationStore((s) => s.setCommandMode);
  const setPlaying = useSimulationStore((s) => s.setPlaying);
  const isPlaying = useSimulationStore((s) => s.isPlaying);
  const setMowerStation = useSimulationStore((s) => s.setMowerStation);
  const sendMowerToStation = useSimulationStore((s) => s.sendMowerToStation);
  const followMower = useEditorStore((s) => s.followMower);
  const setFollowMower = useEditorStore((s) => s.setFollowMower);
  const setActiveSidebarTab = useEditorStore((s) => s.setActiveSidebarTab);
  const config = useSimulationStore((s) => s.config);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const simulatedTimeMs = useSimulationStore((s) => s.simulatedTimeMs);
  const simulatedDay = useSimulationStore((s) => s.simulatedDay);
  const [tier, setTier] = useState<MowerTier>("standard");
  const [tab, setTab] = useState("tools");
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);

  const updateClientTier = useContextStore((s) => s.updateClientTier);

  const state = useSimulationStore();
  const selectedMower = mowers.find((m) => m.id === selectedMowerId) ?? null;

  // Tier limits
  const clients = useContextStore((s) => s.clients);
  const activeClientId = useContextStore((s) => s.activeClientId);
  const activeClient = clients.find((c) => c.id === activeClientId);
  const tierConfig = activeClient ? (TIER_CONFIGS as any)[activeClient.tier] : null;
  const atMowerLimit = tierConfig ? mowers.length >= tierConfig.maxMowers : false;
  const atStationLimit = tierConfig ? stations.length >= tierConfig.maxStations : false;

  if (collapsed) {
    return (
      <aside className="flex h-full w-12 shrink-0 flex-col items-center border-l border-border bg-surface py-2 gap-2">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
          title="Expandir panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Separator />
        <button
          onClick={() => { setCollapsed(false); setTab("tools"); }}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            tab === "tools" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-border hover:text-foreground"
          }`}
          title="Herramientas"
        >
          <Layers className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setCollapsed(false); setTab("mowers"); }}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            tab === "mowers" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-border hover:text-foreground"
          }`}
          title="Podadoras"
        >
          <Bot className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setCollapsed(false); setTab("strategy"); }}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            tab === "strategy" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-border hover:text-foreground"
          }`}
          title="Estrategia"
        >
          <Route className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setCollapsed(false); setTab("business"); }}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            tab === "business" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-border hover:text-foreground"
          }`}
          title="Negocio"
        >
          <DollarSign className="h-4 w-4" />
        </button>
        <button
          onClick={() => { setCollapsed(false); setTab("settings"); }}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            tab === "settings" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-border hover:text-foreground"
          }`}
          title="Ajustes"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-end px-2 pt-2">
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
          title="Colapsar panel"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <Tabs value={tab} onValueChange={(v) => {
        setTab(v);
        setActiveSidebarTab(v);
        if (v !== "strategy") state.setSelectedMower(null);
        // Pause simulation when entering settings tab
        if (v === "settings" && isPlaying) setPlaying(false);
      }} className="flex h-full flex-col">
        <TabsList className="mx-3 mt-3 mb-0 grid grid-cols-5">
          <Tooltip content="Herramientas">
            <TabsTrigger value="tools" className="px-1 min-w-0 h-8">
              <Layers className="h-4 w-4" />
            </TabsTrigger>
          </Tooltip>
          <Tooltip content="Podadoras">
            <TabsTrigger value="mowers" className="px-1 min-w-0 h-8">
              <Bot className="h-4 w-4" />
            </TabsTrigger>
          </Tooltip>
          <Tooltip content="Estrategia">
            <TabsTrigger value="strategy" className="px-1 min-w-0 h-8">
              <Route className="h-4 w-4" />
            </TabsTrigger>
          </Tooltip>
          <Tooltip content="Negocio">
            <TabsTrigger value="business" className="px-1 min-w-0 h-8">
              <DollarSign className="h-4 w-4" />
            </TabsTrigger>
          </Tooltip>
          <Tooltip content="Ajustes">
            <TabsTrigger value="settings" className="px-1 min-w-0 h-8">
              <Settings2 className="h-4 w-4" />
            </TabsTrigger>
          </Tooltip>
        </TabsList>

        {/* ── Herramientas ─────────────────────────────── */}
        <TabsContent value="tools" className="space-y-2.5 p-3 pt-2.5 scrollbar-thin overflow-y-auto">
          <Card>
            <CardHeader className="p-2.5 pb-1.5">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Paleta
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0">
              <div className="grid grid-cols-4 gap-1">
                {TOOLS.map((t) => {
                  const Icon = t.icon;
                  const active = tool === t.id;
                  return (
                    <Tooltip key={t.id} content={t.description} side="bottom">
                      <button
                        onClick={() => setTool(t.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 rounded-md border border-border bg-background py-2.5 text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground min-h-[60px]",
                          active &&
                            "border-primary bg-primary/10 text-primary shadow-sm",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-[9px] leading-tight font-medium text-center">
                          {t.label}
                        </span>
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {tool === "grass" && (
            <Card>
              <CardHeader className="p-2.5 pb-1.5">
                <CardTitle className="text-xs">Altura del césped</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-2.5 pt-0">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground">Valor</Label>
                  <span className="font-mono text-[11px] text-primary font-medium">
                    {grassBrushHeight}%
                  </span>
                </div>
                <Slider
                  value={grassBrushHeight}
                  onValueChange={setGrassBrushHeight}
                  min={0}
                  max={100}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="p-2.5 pb-1.5">
              <CardTitle className="text-xs">Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 p-2.5 pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => setTool("mower")}
              >
                <Bot className="h-3.5 w-3.5 mr-2 shrink-0" />
                Colocar podadora
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => setTool("charging_station")}
              >
                <Plug className="h-3.5 w-3.5 mr-2 shrink-0" />
                Colocar estación
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Entidades ────────────────────────────────── */}
        <TabsContent value="mowers" className="space-y-2.5 p-3 pt-2.5 scrollbar-thin overflow-y-auto">
          <Card>
            <CardHeader className="p-2.5 pb-1.5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  Podadoras ({mowers.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-2.5 pt-0">
              {mowers.length === 0 ? (
                <p className="text-[11px] text-muted-foreground py-2">
                  Selecciona &quot;Podadora&quot; y haz clic en el mapa.
                </p>
              ) : (
                mowers.map((m) => {
                  const colorHex = m.color ? `#${m.color.toString(16).padStart(6, "0")}` : "#22c55e";
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMower(m.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background p-1.5 transition-all hover:border-primary/50 hover:bg-muted/30",
                        selectedMowerId === m.id && "border-primary bg-primary/5",
                      )}
                      style={{ borderLeftWidth: 3, borderLeftColor: colorHex }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] font-medium">{m.name}</span>
                          <Badge
                            variant={STATUS_VARIANT[m.status] ?? "default"}
                            className="text-[9px] px-1 py-0 shrink-0"
                          >
                            {STATUS_LABEL[m.status] ?? m.status}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                          <span>({m.x},{m.y})</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span
                            className={cn(
                              m.battery < 25
                                ? "text-destructive"
                                : m.battery < 50
                                  ? "text-accent"
                                  : "text-primary",
                            )}
                          >
                            {Math.round(m.battery)}%
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="uppercase">{m.tier}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span style={{ color: colorHex }}>{(m.coverageTiles ?? []).length} tiles</span>
                        </div>
                        {stations.length > 0 && (
                          <div className="mt-1 flex items-center gap-1">
                            <Plug className="h-2.5 w-2.5 text-accent shrink-0" />
                            <select
                              value={m.assignedStationId ?? ""}
                              onChange={(e) => { e.stopPropagation(); setMowerStation(m.id, e.target.value); }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-5 flex-1 truncate rounded border border-border bg-background px-1 text-[9px] text-muted-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              <option value="">Sin estación</option>
                              {stations.map((s) => (
                                <option key={s.id} value={s.id}>Est. ({s.x},{s.y})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Tooltip content="Centrar y seguir">
                          <Button size="icon" variant="ghost" className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMower(m.id);
                              setFollowMower(true);
                              window.dispatchEvent(new CustomEvent("walle:center-mower", { detail: { id: m.id } }));
                            }}>
                            <Crosshair className="h-3 w-3" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Telemetría">
                          <Button size="icon" variant="ghost" className="h-5 w-5"
                            onClick={(e) => { e.stopPropagation(); setTelemetryOpen(true); }}>
                            <Activity className="h-3 w-3 text-primary" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Eliminar">
                          <Button size="icon" variant="ghost" className="h-5 w-5"
                            onClick={(e) => { e.stopPropagation(); removeMower(m.id); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {selectedMower && (
            <Card style={{ borderColor: `#${(selectedMower.color ?? 0x22c55e).toString(16).padStart(6, "0")}` }}>
              <CardHeader className="p-2.5 pb-1.5">
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <Bot className="h-3.5 w-3.5" style={{ color: `#${(selectedMower.color ?? 0x22c55e).toString(16).padStart(6, "0")}` }} />
                  <span className="truncate">Control — {selectedMower.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-2.5 pt-0">
                <div className="grid grid-cols-3 gap-1">
                  <Stat label="Pos" value={`${selectedMower.x},${selectedMower.y}`} />
                  <Stat label="Bat." value={`${Math.round(selectedMower.battery)}%`}
                    color={selectedMower.battery < 25 ? "text-destructive" : selectedMower.battery < 50 ? "text-accent" : "text-primary"} />
                  <Stat label="Estado" value={STATUS_LABEL[selectedMower.status] ?? selectedMower.status} />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]"
                    onClick={() => {
                      setFollowMower(true);
                      window.dispatchEvent(new CustomEvent("walle:center-mower", { detail: { id: selectedMower.id } }));
                    }}>
                    <Crosshair className="h-3 w-3 mr-1" />
                    Centrar
                  </Button>
                  <Button size="sm" variant={followMower ? "default" : "outline"} className="h-7 text-[11px]"
                    onClick={() => setFollowMower(!followMower)}>
                    <Eye className="h-3 w-3 mr-1" />
                    {followMower ? "Siguiendo" : "Seguir"}
                  </Button>
                </div>
                <Button size="sm" variant={commandMode ? "default" : "outline"} className="w-full h-7 text-[11px]"
                  onClick={() => { const next = !commandMode; setCommandMode(next);
                    window.dispatchEvent(new CustomEvent("walle:command-mode", { detail: { on: next } })); }}>
                  <Send className="h-3 w-3 mr-1" />
                  {commandMode ? "Cancelar envío" : "Enviar a celda"}
                </Button>
                <Button size="sm" variant="outline" className="w-full h-7 text-[11px]"
                  onClick={() => {
                    console.log("[Sidebar] Play/Pause clicked, current isPlaying:", isPlaying);
                    setPlaying(!isPlaying);
                  }}>
                  {isPlaying ? <PauseCircle className="h-3 w-3 mr-1" /> : <PlayCircle className="h-3 w-3 mr-1" />}
                  {isPlaying ? "Pausar" : "Reanudar"}
                </Button>
                <Button size="sm" variant="outline" className="w-full h-7 text-[11px]"
                  onClick={() => {
                    const w = window as unknown as { __walle?: { drainBattery: (id: string, target: number) => void } };
                    w.__walle?.drainBattery(selectedMower.id, 24);
                  }}>
                  Forzar retorno
                </Button>
                {commandMode && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[10px] text-primary">
                    Clic en el mapa para enviar.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <button onClick={() => setShowAdd(!showAdd)} className="flex w-full items-center justify-between p-2.5 pt-1.5">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <Bot className="h-3.5 w-3.5 text-primary" />
                Añadir
              </CardTitle>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showAdd && "rotate-180")} />
            </button>
            {showAdd && (
              <CardContent className="space-y-1.5 p-2.5 pt-0">
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <select value={tier} onChange={(e) => setTier(e.target.value as MowerTier)}
                      className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none">
                      {TIER_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    if (!space || atMowerLimit) return;
                    addMower(Math.floor(Math.random() * space.width), Math.floor(Math.random() * space.height), tier);
                  }} className="h-8 px-2.5 text-[11px]" disabled={atMowerLimit}
                    title={atMowerLimit ? `Límite de ${tierConfig?.maxMowers} podadoras alcanzado (${activeClient?.tier})` : ""}>
                    <Bot className="h-3 w-3 mr-1" />
                    {atMowerLimit ? "Límite" : "Añadir"}
                  </Button>
                </div>
                <Button size="sm" variant="outline" className="w-full h-8 text-[11px]"
                  onClick={() => {
                    if (!space || atStationLimit) return;
                    addStation(Math.floor(Math.random() * space.width), Math.floor(Math.random() * space.height));
                  }} disabled={atStationLimit}
                  title={atStationLimit ? `Límite de ${tierConfig?.maxStations} estaciones alcanzado (${activeClient?.tier})` : ""}>
                  <Plug className="h-3 w-3 mr-1" />
                  {atStationLimit ? "Límite alcanzado" : "Estación aleatoria"}
                </Button>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ── Estrategia ──────────────────────────────── */}
        <TabsContent value="strategy" className="space-y-2.5 p-3 pt-2.5 scrollbar-thin overflow-y-auto">
          <Card>
            <CardHeader className="p-2.5 pb-1.5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Estrategia de la flota
                </CardTitle>
                {!state.fleetInitialized && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      console.log("[Sidebar] Calcular clicked, calling initFleet");
                      useSimulationStore.getState().initFleet();
                    }}
                    disabled={!state.mowers.length || !state.stations.length}
                  >
                    Calcular
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-2.5 pt-0">
              {!state.fleetInitialized ? (
                <p className="text-[11px] text-muted-foreground py-2">
                  {!state.mowers.length
                    ? "Añade podadoras para calcular la estrategia."
                    : !state.stations.length
                      ? "Añade estaciones de carga primero."
                      : "Pulsa Calcular o inicia la simulación para distribuir tiles."}
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground flex-1">
                      {state.strategyEditing
                        ? state.strategyEditMode === "tiles"
                          ? "Modo editar tiles: click/drag para asignar/quitar tiles de la podadora seleccionada."
                          : "Modo editar path: click tiles para definir el orden del recorrido."
                        : "Distribución de tiles y rutas optimizadas."}
                    </p>
                    {!state.strategyEditing ? (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 shrink-0"
                        onClick={() => {
                          state.setStrategyEditing(true);
                          state.setStrategyEditMowerId(state.selectedMowerId ?? state.mowers[0]?.id ?? null);
                        }}>
                        Editar
                      </Button>
                    ) : (
                      <Button size="sm" variant="default" className="h-6 text-[10px] px-2 shrink-0"
                        onClick={() => state.setStrategyEditing(false)}>
                        Hecho
                      </Button>
                    )}
                  </div>
                  {state.strategyEditing && (
                    <div className="flex gap-1">
                      <Button size="sm" variant={state.strategyEditMode === "tiles" ? "default" : "outline"}
                        className="h-6 text-[10px] flex-1"
                        onClick={() => state.setStrategyEditMode("tiles")}>
                        Tiles
                      </Button>
                      <Button size="sm" variant={state.strategyEditMode === "path" ? "default" : "outline"}
                        className="h-6 text-[10px] flex-1"
                        onClick={() => state.setStrategyEditMode("path")}>
                        Path
                      </Button>
                    </div>
                  )}
                  {state.mowers.map((m) => {
                    const tiles = m.coverageTiles ?? [];
                    const station = state.stations.find((s) => s.id === m.assignedStationId);
                    const isSelected = state.strategyEditMowerId === m.id && state.strategyEditing;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          state.setSelectedMower(m.id);
                          if (state.strategyEditing) state.setStrategyEditMowerId(m.id);
                        }}
                        className={cn(
                          "rounded-md border border-border bg-background p-2 cursor-pointer hover:border-primary/50 transition-colors",
                          isSelected && "bg-primary/5",
                        )}
                        style={m.color ? { borderLeftWidth: 3, borderLeftColor: `#${m.color.toString(16).padStart(6, "0")}` } : undefined}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium truncate">{m.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {tiles.length} tiles
                          </Badge>
                        </div>
                        <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                          {station && <span>Est. ({station.x},{station.y})</span>}
                        </div>
                      </div>
                    );
                  })}

                  {/* Recalculate buttons at bottom of mower list */}
                  {state.strategyEditing && state.strategyEditMode === "path" && state.strategyEditMowerId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-[11px]"
                      onClick={() => {
                        const mid = state.strategyEditMowerId;
                        if (!mid) return;
                        const mower = state.mowers.find((m) => m.id === mid);
                        if (!mower) return;
                        const station = state.stations.find((s) => s.id === mower.assignedStationId);
                        const tiles = mower.coverageTiles ?? [];
                        if (!station || tiles.length === 0) return;
                        const sorted = [];
                        const remaining = [...tiles];
                        let cx = station.x, cy = station.y;
                        while (remaining.length > 0) {
                          let bestIdx = 0, bestD = Infinity;
                          for (let i = 0; i < remaining.length; i++) {
                            const d = Math.abs(remaining[i].x - cx) + Math.abs(remaining[i].y - cy);
                            if (d < bestD) { bestD = d; bestIdx = i; }
                          }
                          sorted.push(remaining[bestIdx]);
                          cx = remaining[bestIdx].x;
                          cy = remaining[bestIdx].y;
                          remaining.splice(bestIdx, 1);
                        }
                        state.setStrategyPath(mid, sorted);
                      }}
                    >
                      <Route className="h-3 w-3 mr-1" />
                      Recalcular ruta
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-[11px]"
                    onClick={() => {
                      for (const m of state.mowers) {
                        const station = state.stations.find((s) => s.id === m.assignedStationId);
                        const tiles = m.coverageTiles ?? [];
                        if (!station || tiles.length === 0) continue;
                        const sorted = sortTilesNearestNeighbor(tiles, station);
                        state.setStrategyPath(m.id, sorted);
                      }
                    }}
                  >
                    <Route className="h-3 w-3 mr-1" />
                    Recalcular todas las rutas
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {state.fleetInitialized && (
            <Card>
              <CardHeader className="p-2.5 pb-1.5">
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Programación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-2.5 pt-0">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Modo</Label>
                  <select
                    value={config.scheduleMode}
                    onChange={(e) => setConfig({ scheduleMode: e.target.value as "auto" | "interval" | "threshold" | "time_of_day" })}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs appearance-none"
                  >
                    <option value="auto">Automático (por crecimiento)</option>
                    <option value="interval">Por intervalo</option>
                    <option value="threshold">Por umbral de altura</option>
                    <option value="time_of_day">Hora del día</option>
                  </select>
                </div>
                {config.scheduleMode === "interval" && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Intervalo</Label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={Math.floor(config.scheduleIntervalMs / 3600000)}
                          onChange={(e) => {
                            const h = Number(e.target.value);
                            const m = Math.floor((config.scheduleIntervalMs % 3600000) / 60000);
                            setConfig({ scheduleIntervalMs: (h * 60 + m) * 60 * 1000 });
                          }}
                          className="h-7 text-xs font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground">h</span>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          value={Math.floor((config.scheduleIntervalMs % 3600000) / 60000)}
                          onChange={(e) => {
                            const m = Number(e.target.value);
                            const h = Math.floor(config.scheduleIntervalMs / 3600000);
                            setConfig({ scheduleIntervalMs: (h * 60 + m) * 60 * 1000 });
                          }}
                          className="h-7 text-xs font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground">min</span>
                      </div>
                    </div>
                  </div>
                )}
                {config.scheduleMode === "threshold" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground">Umbral de altura (%)</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Slider
                          value={config.scheduleThresholdPct}
                          onValueChange={(v) => setConfig({ scheduleThresholdPct: v })}
                          min={5}
                          max={100}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-primary font-medium w-8 text-right">
                        {config.scheduleThresholdPct}%
                      </span>
                      <div
                        className="h-5 w-5 rounded border border-border shrink-0"
                        style={{ backgroundColor: config.scheduleThresholdPct < 50 ? GRASS_COLOR_MID : config.scheduleThresholdPct < 75 ? "#15803d" : "#14532d" }}
                      />
                    </div>
                  </div>
                )}
                {config.scheduleMode === "time_of_day" && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Hora de ejecución</Label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={config.scheduleHour}
                          onChange={(e) => setConfig({ scheduleHour: Number(e.target.value) })}
                          className="h-7 text-xs font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground">h</span>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          value={config.scheduleMinute}
                          onChange={(e) => setConfig({ scheduleMinute: Number(e.target.value) })}
                          className="h-7 text-xs font-mono"
                        />
                        <span className="text-[10px] text-muted-foreground">min</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      {DAY_NAMES[simulatedDay]} {formatSimTime(simulatedTimeMs)}
                    </p>
                  </div>
                )}
                {config.scheduleMode === "auto" && (
                  <p className="text-[10px] text-muted-foreground">
                    Cada podadora espera a que el césped de su zona alcance el umbral de poda ({config.mowThreshold}%).
                    El tiempo de espera se calcula según la tasa de crecimiento.
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px]"
                  onClick={() => {
                    console.log("[Sidebar] Recalcular estrategia clicked, calling initFleet");
                    useSimulationStore.getState().initFleet();
                  }}
                >
                  <Route className="h-3 w-3 mr-1" />
                  Recalcular estrategia
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px]"
                  onClick={() => {
                    let text = `=== ESTRATEGIA: ${space?.name ?? "Space"} ===\n`;
                    text += `Dimensiones: ${space?.width}x${space?.height}\n`;
                    text += `Mowers: ${state.mowers.length}, Stations: ${state.stations.length}\n\n`;
                    for (const m of state.mowers) {
                      const tiles = m.coverageTiles ?? [];
                      const station = state.stations.find((s) => s.id === m.assignedStationId);
                      text += `--- ${m.name} ---\n`;
                      text += `Station: (${station?.x},${station?.y})\n`;
                      text += `Tiles: ${tiles.length}\n`;
                      text += `Tile list: ${tiles.map((t) => `(${t.x},${t.y})`).join(" ")}\n\n`;
                    }
                    navigator.clipboard.writeText(text);
                  }}
                >
                  Exportar estrategia
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Negocio ──────────────────────────────────── */}
        <TabsContent value="business" className="space-y-2.5 p-3 pt-2.5 scrollbar-thin overflow-y-auto">
          {/* Plan selector */}
          <Card>
            <CardHeader className="p-2.5 pb-1.5">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <Crown className="h-3.5 w-3.5 text-accent" />
                Plan Actual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 p-2.5 pt-0">
              {activeClient && (() => {
                const tc: TierConfig | null = tierConfig;
                return tc ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">{tc.label}</span>
                      <span className="text-[10px] font-mono text-primary font-bold">S/. {tc.priceMonthly}/mes</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{tc.description}</p>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {(["base", "standard", "premium", "enterprise"] as ClientTier[]).map((t) => {
                        const tConf = (TIER_CONFIGS as Record<ClientTier, TierConfig>)[t];
                        const isActive = activeClient.tier === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              if (activeClient) updateClientTier(activeClient.id, t);
                            }}
                            className={cn(
                              "rounded-md border p-1 text-left transition-colors text-[10px]",
                              isActive ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30 text-muted-foreground",
                            )}
                          >
                            <span className="font-medium block">{tConf.label}</span>
                            <span className="font-mono text-[9px]">{tConf.priceMonthly > 0 ? `S/. ${tConf.priceMonthly}` : "Custom"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-2">Selecciona un cliente primero</p>
                );
              })()}
            </CardContent>
          </Card>
          <PriceCalculator />
        </TabsContent>

        {/* ── Ajustes ──────────────────────────────────── */}
        <TabsContent value="settings" className="space-y-2.5 p-3 pt-2.5 scrollbar-thin overflow-y-auto">
          {/* Simulated time display */}
          <Card>
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-medium">Simulador</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <span className="text-muted-foreground">{DAY_NAMES[simulatedDay]}</span>
                  <span className="text-foreground font-medium">{formatSimTime(simulatedTimeMs)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {space && (
            <Card>
              <CardHeader className="p-2.5 pb-1.5">
                <CardTitle className="flex items-center gap-1.5 text-xs">
                  <Settings2 className="h-3.5 w-3.5 text-primary" />
                  Espacio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-2.5 pt-0">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="text-foreground font-medium truncate ml-2">{space.name}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted-foreground">Dimensiones</span>
                  <span className="text-foreground font-medium">
                    {space.width}×{space.height}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-muted-foreground">Celdas</span>
                  <span className="text-foreground font-medium">
                    {space.width * space.height}
                  </span>
                </div>
                <Separator className="my-0.5" />
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground">Grid</Label>
                  <Switch checked={showGrid} onCheckedChange={toggleGrid} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Estadísticas ── */}
          {state.fleetInitialized && mowers.length > 0 && (() => {
            let totalGrass = 0, mowableGrass = 0;
            for (const [, cell] of state.cells) {
              if (cell.type === "grass") {
                totalGrass++;
                if ((cell.grassHeight ?? 0) >= config.mowThreshold) mowableGrass++;
              }
            }
            const totalTiles = mowers.reduce((sum, m) => sum + (m.coverageTiles?.length ?? 0), 0);
            const avgTiles = mowers.length > 0 ? totalTiles / mowers.length : 0;
            const maxTiles = Math.max(...mowers.map((m) => m.coverageTiles?.length ?? 0));
            const balance = avgTiles > 0 ? maxTiles / avgTiles : 1;
            const totalTrips = mowers.reduce((sum, m) => sum + (m.trips?.length ?? 0), 0);
            return (
              <Card>
                <CardHeader className="p-2.5 pb-1.5">
                  <CardTitle className="flex items-center gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    Estadísticas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-2.5 pt-0">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">Césped total</span>
                    <span className="text-foreground font-medium">{totalGrass} tiles</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">Poda requerida</span>
                    <span className="text-foreground font-medium">{mowableGrass} tiles ({totalGrass > 0 ? Math.round((mowableGrass / totalGrass) * 100) : 0}%)</span>
                  </div>
                  <Separator className="my-0.5" />
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">Tiles/podadora</span>
                    <span className="text-foreground font-medium">{mowers.map((m) => m.coverageTiles?.length ?? 0).join(", ")}</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">Balance</span>
                    <span className={`font-medium ${balance <= 1.3 ? "text-primary" : balance <= 1.5 ? "text-accent" : "text-destructive"}`}>
                      {balance.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">Viajes totales</span>
                    <span className="text-foreground font-medium">{totalTrips}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <Card>
            <CardHeader className="p-2.5 pb-1.5">
              <CardTitle className="flex items-center gap-1.5 text-xs">
                <Settings2 className="h-3.5 w-3.5 text-primary" />
                Configuración del Proyecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-2.5 pt-0">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Tasa de crecimiento</Label>
                  <span className="font-mono text-[10px] text-primary">{config.grassGrowthRatePerSecond.toFixed(3)} %/s</span>
                </div>
                <Slider
                  value={growthToSlider(config.grassGrowthRatePerSecond)}
                  onValueChange={(v) => setConfig({ grassGrowthRatePerSecond: sliderToGrowth(v) })}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Umbral de poda</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-primary">{config.mowThreshold}%</span>
                    <div
                      className="h-4 w-4 rounded border border-border"
                      style={{ backgroundColor: config.mowThreshold < 50 ? GRASS_COLOR_MID : config.mowThreshold < 75 ? "#15803d" : "#14532d" }}
                    />
                  </div>
                </div>
                <Slider
                  value={config.mowThreshold}
                  onValueChange={(v) => setConfig({ mowThreshold: v })}
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Drenaje de batería</Label>
                  <span className="font-mono text-[10px] text-primary">{config.batteryDrainPerSecond.toFixed(1)} %/s</span>
                </div>
                <Slider
                  value={Math.round(config.batteryDrainPerSecond * 10)}
                  onValueChange={(v) => setConfig({ batteryDrainPerSecond: v / 10 })}
                  min={1}
                  max={50}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Capacidad de batería</Label>
                  <span className="font-mono text-[10px] text-primary">{config.batteryCapacity}%</span>
                </div>
                <Slider
                  value={config.batteryCapacity}
                  onValueChange={(v) => setConfig({ batteryCapacity: v })}
                  min={50}
                  max={500}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Velocidad de carga</Label>
                  <span className="font-mono text-[10px] text-primary">{config.chargingRatePerSecond.toFixed(1)} %/s</span>
                </div>
                <Slider
                  value={Math.round(config.chargingRatePerSecond * 10)}
                  onValueChange={(v) => setConfig({ chargingRatePerSecond: v / 10 })}
                  min={1}
                  max={100}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardContent className="p-2.5">
              <Button
                variant="destructive"
                size="sm"
                className="w-full h-8 text-[11px]"
                onClick={() => setResetConfirmOpen(true)}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Resetear mapa
              </Button>
              <ConfirmDialog
                open={resetConfirmOpen}
                onOpenChange={setResetConfirmOpen}
                title="Resetear mapa"
                description="¿Resetear el mapa? Esto borrará todas las celdas, podadoras y estaciones. Esta acción no se puede deshacer."
                confirmLabel="Resetear"
                variant="destructive"
                onConfirm={() => { if (space) resetMap(space.width, space.height); }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <TelemetryModal open={telemetryOpen} onOpenChange={setTelemetryOpen} />
    </aside>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-1.5 py-1 text-center">
      <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-[10px] font-medium truncate", color)}>{value}</div>
    </div>
  );
}
