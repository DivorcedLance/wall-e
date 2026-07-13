"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Activity, Battery, Wifi, RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface TelemetryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FAKE_UNITS = [
  { id: "W-001", name: "Podadora Alpha", status: "online", battery: 87, signal: 92, area: "Zona Norte", hoursToday: 6.2 },
  { id: "W-002", name: "Podadora Beta", status: "online", battery: 64, signal: 88, area: "Zona Sur", hoursToday: 4.8 },
  { id: "W-003", name: "Podadora Gamma", status: "online", battery: 45, signal: 76, area: "Zona Este", hoursToday: 7.1 },
  { id: "W-004", name: "Podadora Delta", status: "online", battery: 92, signal: 95, area: "Zona Oeste", hoursToday: 3.5 },
  { id: "W-005", name: "Podadora Epsilon", status: "low_battery", battery: 12, signal: 81, area: "Zona Central", hoursToday: 8.3 },
  { id: "W-006", name: "Podadora Zeta", status: "online", battery: 78, signal: 90, area: "Zona Norte", hoursToday: 5.6 },
  { id: "W-007", name: "Podadora Eta", status: "online", battery: 56, signal: 85, area: "Zona Sur", hoursToday: 6.9 },
  { id: "W-008", name: "Podadora Theta", status: "online", battery: 83, signal: 91, area: "Zona Este", hoursToday: 4.2 },
  { id: "W-009", name: "Podadora Iota", status: "online", battery: 34, signal: 79, area: "Zona Oeste", hoursToday: 7.8 },
  { id: "W-010", name: "Podadora Kappa", status: "online", battery: 71, signal: 87, area: "Zona Central", hoursToday: 5.1 },
  { id: "W-011", name: "Podadora Lambda", status: "low_battery", battery: 8, signal: 93, area: "Zona Norte", hoursToday: 9.2 },
  { id: "W-012", name: "Podadora Mu", status: "online", battery: 67, signal: 84, area: "Zona Sur", hoursToday: 3.9 },
];

const FAKE_ALERTS = [
  { id: 1, type: "warning", message: "W-005 batería crítica (12%) — yendo a estación de carga", time: "Hace 2 min" },
  { id: 2, type: "danger", message: "W-011 batería crítica (8%) — requiere atención inmediata", time: "Hace 5 min" },
  { id: 3, type: "info", message: "W-003 completó cobertura programada — 1,245 m² podados", time: "Hace 12 min" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "online") return <CheckCircle className="h-3 w-3 text-primary" />;
  if (status === "low_battery") return <Battery className="h-3 w-3 text-destructive" />;
  return <XCircle className="h-3 w-3 text-muted-foreground" />;
}

function SignalBars({ signal }: { signal: number }) {
  const bars = signal > 85 ? 4 : signal > 70 ? 3 : signal > 50 ? 2 : 1;
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${i <= bars ? "bg-primary" : "bg-border"}`}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </div>
  );
}

export function TelemetryModal({ open, onOpenChange }: TelemetryModalProps) {
  const [syncing, setSyncing] = useState(false);

  const onlineCount = FAKE_UNITS.filter((u) => u.status === "online").length;
  const lowBatteryCount = FAKE_UNITS.filter((u) => u.status === "low_battery").length;

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Telemetría y Alertas
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{FAKE_UNITS.length}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Total Unidades</div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{onlineCount}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">En Línea</div>
          </div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{lowBatteryCount}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Batería Baja</div>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Alertas Activas</span>
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0">{FAKE_ALERTS.length}</Badge>
          </div>
          {FAKE_ALERTS.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-2 rounded-md border p-2 text-[10px] ${
                alert.type === "danger"
                  ? "border-destructive/30 bg-destructive/5"
                  : alert.type === "warning"
                  ? "border-accent/30 bg-accent/5"
                  : "border-border bg-card"
              }`}
            >
              <AlertTriangle className={`h-3 w-3 mt-0.5 shrink-0 ${
                alert.type === "danger" ? "text-destructive" : alert.type === "warning" ? "text-accent" : "text-muted-foreground"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="truncate">{alert.message}</div>
                <div className="text-muted-foreground mt-0.5">{alert.time}</div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Hardware Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Hardware Conectado — Módulos IoT</span>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Equipo</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Batería</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Señal</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Área</th>
                  <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">h/Hoy</th>
                </tr>
              </thead>
              <tbody>
                {FAKE_UNITS.map((unit) => (
                  <tr key={unit.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-2 py-1.5 font-mono font-medium">{unit.id}</td>
                    <td className="px-2 py-1.5">{unit.name}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <StatusIcon status={unit.status} />
                        <span className={unit.status === "low_battery" ? "text-destructive" : ""}>
                          {unit.status === "online" ? "En línea" : "Baja"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              unit.battery > 50 ? "bg-primary" : unit.battery > 20 ? "bg-accent" : "bg-destructive"
                            }`}
                            style={{ width: `${unit.battery}%` }}
                          />
                        </div>
                        <span className="font-mono">{unit.battery}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5"><SignalBars signal={unit.signal} /></td>
                    <td className="px-2 py-1.5 text-muted-foreground">{unit.area}</td>
                    <td className="px-2 py-1.5 text-right font-mono">{unit.hoursToday}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
