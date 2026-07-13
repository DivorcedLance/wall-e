"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Clock, AlertTriangle, Scissors, Download } from "lucide-react";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
const M2_DATA = [120000, 135000, 142000, 148000, 155000, 151000];
const UPTIME_DATA = [98.5, 98.9, 99.3, 100, 99.7, 99.4];
const HOURS_DATA = [14.2, 16.8, 15.5, 17.3, 18.1, 18.9];

const MOWERS = [
  { id: "W-001", hours: 182 },
  { id: "W-002", hours: 241 },
  { id: "W-003", hours: 315 },
  { id: "W-004", hours: 98 },
  { id: "W-005", hours: 428 },
  { id: "W-006", hours: 156 },
  { id: "W-007", hours: 289 },
  { id: "W-008", hours: 203 },
  { id: "W-009", hours: 374 },
  { id: "W-010", hours: 267 },
  { id: "W-011", hours: 512 },
  { id: "W-012", hours: 487 },
];

const BLADE_LIMIT = 500;

function BarChart({ data, max, color }: { data: number[]; max: number; color: string }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((value, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className={`w-full rounded-t ${color}`}
            style={{ height: `${(value / max) * 100}%`, minHeight: "2px" }}
          />
          <span className="text-[7px] text-muted-foreground">{MONTHS[i]}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBar({ value, max, label, status }: { value: number; max: number; label: string; status?: "ok" | "warning" | "danger" }) {
  const percent = Math.min((value / max) * 100, 100);
  const color = status === "danger" ? "bg-destructive" : status === "warning" ? "bg-accent" : "bg-primary";

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[9px]">
        <span className="font-mono font-medium">{label}</span>
        <div className="flex items-center gap-1">
          <span className="font-mono text-muted-foreground">{value}h</span>
          {status === "danger" && <Badge variant="destructive" className="text-[7px] px-1 py-0 h-3">REEMPLAZAR</Badge>}
          {status === "warning" && <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 border-accent text-accent">REVISAR</Badge>}
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsCard() {
  return (
    <Card>
      <CardHeader className="p-2.5 pb-1.5">
        <CardTitle className="flex items-center gap-1.5 text-xs">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          Analíticas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-2.5 pt-0 max-h-[500px] overflow-y-auto scrollbar-thin">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-md border border-border bg-background/60 p-2 text-center">
            <div className="text-lg font-bold text-foreground">151K</div>
            <div className="text-[8px] text-muted-foreground">m² Promedio</div>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <TrendingUp className="h-2.5 w-2.5 text-primary" />
              <span className="text-[8px] text-primary">+6.2%</span>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-2 text-center">
            <div className="text-lg font-bold text-foreground">99.4%</div>
            <div className="text-[8px] text-muted-foreground">Uptime</div>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <TrendingUp className="h-2.5 w-2.5 text-primary" />
              <span className="text-[8px] text-primary">+0.2pp</span>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-2 text-center">
            <div className="text-lg font-bold text-foreground">14</div>
            <div className="text-[8px] text-muted-foreground">Incidentes</div>
            <div className="flex items-center justify-center gap-0.5 mt-0.5">
              <TrendingUp className="h-2.5 w-2.5 text-primary rotate-180" />
              <span className="text-[8px] text-primary">−23%</span>
            </div>
          </div>
        </div>

        {/* m² Processed Chart */}
        <div className="rounded-md border border-border bg-background/60 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium">m² Procesados por Mes</span>
            <Button size="icon" variant="ghost" className="h-4 w-4">
              <Download className="h-2.5 w-2.5" />
            </Button>
          </div>
          <BarChart data={M2_DATA} max={180000} color="bg-primary" />
          <div className="flex justify-between text-[7px] text-muted-foreground">
            <span>0K</span>
            <span>45K</span>
            <span>90K</span>
            <span>135K</span>
            <span>180K</span>
          </div>
        </div>

        {/* Uptime Chart */}
        <div className="rounded-md border border-border bg-background/60 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium">Uptime del Sistema — SLA 99.5%</span>
          </div>
          <div className="flex items-end gap-1 h-12">
            {UPTIME_DATA.map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={`w-full rounded-t ${value >= 99.5 ? "bg-primary" : value >= 99 ? "bg-accent" : "bg-destructive"}`}
                  style={{ height: `${((value - 98) / 2) * 100}%`, minHeight: "2px" }}
                />
                <span className="text-[7px] text-muted-foreground">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[7px] text-muted-foreground">
            <span>98.5%</span>
            <span>99.5%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Operation Hours */}
        <div className="rounded-md border border-border bg-background/60 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium">Horas de Operación — Semana Actual</span>
            <Button size="icon" variant="ghost" className="h-4 w-4">
              <Download className="h-2.5 w-2.5" />
            </Button>
          </div>
          <BarChart data={HOURS_DATA} max={24} color="bg-secondary" />
          <div className="flex justify-between text-[7px] text-muted-foreground">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
          </div>
          <div className="flex items-center gap-1 text-[8px]">
            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="text-muted-foreground">Horas activas:</span>
            <span className="font-medium">18.9h</span>
          </div>
        </div>

        {/* Blade Maintenance */}
        <div className="rounded-md border border-border bg-background/60 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-medium">Mantenimiento Predictivo — Desgaste de Cuchillas</span>
            <span className="text-[8px] text-muted-foreground">Límite: {BLADE_LIMIT} h</span>
          </div>
          <div className="space-y-1">
            {MOWERS.map((m) => (
              <HorizontalBar
                key={m.id}
                value={m.hours}
                max={BLADE_LIMIT}
                label={m.id}
                status={m.hours >= BLADE_LIMIT ? "danger" : m.hours >= 400 ? "warning" : "ok"}
              />
            ))}
          </div>
          <div className="flex items-start gap-1.5 rounded-md border border-accent/30 bg-accent/5 p-1.5 mt-1">
            <AlertTriangle className="h-3 w-3 text-accent shrink-0 mt-0.5" />
            <span className="text-[8px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">ALERTA PREDICTIVA:</span> 2 unidades (W-011, W-012) requieren reemplazo de cuchillas. Se recomienda programar servicio preventivo esta semana.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
