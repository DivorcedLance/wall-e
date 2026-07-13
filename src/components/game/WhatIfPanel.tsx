"use client";

import { useState } from "react";
import { GitCompare, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSimulationStore } from "@/lib/store/simulationStore";

interface Scenario {
  id: string;
  name: string;
  timestamp: number;
  mowerCount: number;
  stationCount: number;
  totalGrass: number;
  mowableGrass: number;
  mowThreshold: number;
  growthRate: number;
  batteryCapacity: number;
  tilesPerMower: number[];
  totalTrips: number;
}

function captureScenario(name: string): Scenario {
  const sim = useSimulationStore.getState();
  let totalGrass = 0, mowableGrass = 0;
  for (const [, cell] of sim.cells) {
    if (cell.type === "grass") {
      totalGrass++;
      if ((cell.grassHeight ?? 0) >= sim.config.mowThreshold) mowableGrass++;
    }
  }
  const tilesPerMower = sim.mowers.map((m) => m.coverageTiles?.length ?? 0);
  const totalTrips = sim.mowers.reduce((sum, m) => sum + (m.trips?.length ?? 0), 0);
  return {
    id: `scenario-${Date.now()}`,
    name,
    timestamp: Date.now(),
    mowerCount: sim.mowers.length,
    stationCount: sim.stations.length,
    totalGrass,
    mowableGrass,
    mowThreshold: sim.config.mowThreshold,
    growthRate: sim.config.grassGrowthRatePerSecond,
    batteryCapacity: sim.config.batteryCapacity,
    tilesPerMower,
    totalTrips,
  };
}

export function WhatIfPanel() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState("");
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const handleSave = () => {
    const s = captureScenario(name || `Escenario ${scenarios.length + 1}`);
    setScenarios((prev) => [...prev, s]);
    setName("");
  };

  const handleDelete = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    if (compareA === id) setCompareA(null);
    if (compareB === id) setCompareB(null);
  };

  const a = scenarios.find((s) => s.id === compareA);
  const b = scenarios.find((s) => s.id === compareB);

  return (
    <Card>
      <CardHeader className="p-2.5 pb-1.5">
        <CardTitle className="flex items-center gap-1.5 text-xs">
          <GitCompare className="h-3.5 w-3.5 text-secondary" />
          What-If Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-2.5 pt-0">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del escenario..."
            className="flex-1 h-7 rounded border border-border bg-background px-2 text-[11px] text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          <Button size="sm" className="h-7 text-[10px] px-2" onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" /> Guardar
          </Button>
        </div>

        {scenarios.length === 0 ? (
          <p className="text-[10px] text-muted-foreground py-2 text-center">
            Guarda un escenario para comparar configuraciones.
          </p>
        ) : (
          <div className="space-y-1 max-h-[150px] overflow-y-auto scrollbar-thin">
            {scenarios.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-border/50">
                <button
                  className={`h-3 w-3 rounded-full border shrink-0 ${compareA === s.id ? "bg-primary border-primary" : compareB === s.id ? "bg-accent border-accent" : "border-border"}`}
                  onClick={() => {
                    if (compareA === s.id) setCompareA(null);
                    else if (compareB === s.id) setCompareB(null);
                    else if (!compareA) setCompareA(s.id);
                    else if (!compareB) setCompareB(s.id);
                  }}
                  title={compareA === s.id ? "Escenario A" : compareB === s.id ? "Escenario B" : "Seleccionar para comparar"}
                />
                <span className="text-[10px] text-foreground flex-1 truncate">{s.name}</span>
                <span className="text-[9px] font-mono text-muted-foreground">{s.mowerCount}m</span>
                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {a && b && (
          <>
            <Separator className="my-1" />
            <div className="text-[10px] space-y-0.5">
              <div className="flex items-center gap-2 font-medium text-muted-foreground">
                <span className="text-primary">{a.name}</span> vs <span className="text-accent">{b.name}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Podadoras</span><span>{a.mowerCount} → {b.mowerCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Umbral poda</span><span>{a.mowThreshold}% → {b.mowThreshold}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Crecimiento</span><span>{a.growthRate} → {b.growthRate} %/s</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Batería</span><span>{a.batteryCapacity} → {b.batteryCapacity}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tiles podables</span><span>{a.mowableGrass} → {b.mowableGrass}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Viajes</span><span>{a.totalTrips} → {b.totalTrips}</span></div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
