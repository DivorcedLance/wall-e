"use client";

import { useMemo, useState } from "react";
import { Calculator, TrendingDown, TrendingUp, Info, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useContextStore } from "@/lib/store/contextStore";
import { TIER_CONFIGS } from "@/lib/types";
import type { ClientTier, TierConfig } from "@/lib/types";

const TILE_SIZE_M2 = 0.8; // 0.56m x 0.28m ≈ 0.16m² but with paths ≈ 0.8m² effective
const ENERGY_COST_KWH = 0.5; // S/. /kWh
const MOWER_POWER_KW = 0.5;
const CHARGING_EFFICIENCY = 0.9;
const MOWER_SPEED_MS = 1.5; // m/s

interface CostInputs {
  fixedMonthly: number;      // S/. /mes coste fijo (software, soporte, mantenimiento)
  variablePerM2: number;     // S/. /m² coste variable (energía, consumibles)
  manualCostPerHour: number; // S/. /h coste manual (jardinero)
  manualEfficiencyM2H: number; // m²/h eficiencia manual
}

const DEFAULT_INPUTS: CostInputs = {
  fixedMonthly: 800,
  variablePerM2: 0.07,
  manualCostPerHour: 80,
  manualEfficiencyM2H: 200,
};

export function PriceCalculator() {
  const mowers = useSimulationStore((s) => s.mowers);
  const stations = useSimulationStore((s) => s.stations);
  const config = useSimulationStore((s) => s.config);
  const cells = useSimulationStore((s) => s.cells);

  const clients = useContextStore((s) => s.clients);
  const activeClientId = useContextStore((s) => s.activeClientId);
  const activeClient = clients.find((c) => c.id === activeClientId);
  const tierConfig: TierConfig | null = activeClient ? (TIER_CONFIGS as Record<ClientTier, TierConfig>)[activeClient.tier] ?? null : null;

  const [inputs, setInputs] = useState<CostInputs>(DEFAULT_INPUTS);

  const estimate = useMemo(() => {
    const mowerCount = mowers.length;
    const stationCount = stations.length;

    // Calculate total m² of grass
    let grassM2 = 0;
    for (const [, cell] of cells) {
      if (cell.type === "grass") grassM2 += TILE_SIZE_M2;
    }

    // Energy estimate (1 charge/day per mower on average)
    const chargePerDay = (config.batteryCapacity / CHARGING_EFFICIENCY) * MOWER_POWER_KW / 100;
    const energyMonthlyKwh = chargePerDay * mowerCount * 30;
    const energyCost = energyMonthlyKwh * ENERGY_COST_KWH;

    // Autonomous system cost (tier-based)
    const tierPrice = tierConfig?.priceMonthly ?? 0;
    const autoFixed = tierPrice > 0 ? tierPrice : inputs.fixedMonthly;
    const autoVariable = grassM2 * inputs.variablePerM2;
    const autoTotal = autoFixed + autoVariable;

    // Manual cost (traditional mowing)
    const hoursPerMonth = (grassM2 / inputs.manualEfficiencyM2H) * 4; // ~4 sessions/month
    const manualTotal = hoursPerMonth * inputs.manualCostPerHour;

    // Savings
    const monthlySavings = manualTotal - autoTotal;
    const yearlySavings = monthlySavings * 12;
    const savingsPercent = manualTotal > 0 ? (monthlySavings / manualTotal) * 100 : 0;
    const roi = autoTotal > 0 ? (monthlySavings > 0 ? Math.ceil((autoTotal * 12) / monthlySavings * 10) / 10 : Infinity) : 0;

    return {
      tierName: tierConfig?.label ?? "Sin plan",
      grassM2: Math.round(grassM2),
      energyMonthlyKwh: energyMonthlyKwh.toFixed(1),
      energyCost: energyCost.toFixed(0),
      autoFixed,
      autoVariable: autoVariable.toFixed(0),
      autoTotal: autoTotal.toFixed(0),
      autoYearly: (autoTotal * 12).toFixed(0),
      hoursPerMonth: hoursPerMonth.toFixed(1),
      manualTotal: manualTotal.toFixed(0),
      manualYearly: (manualTotal * 12).toFixed(0),
      monthlySavings: monthlySavings.toFixed(0),
      yearlySavings: yearlySavings.toFixed(0),
      savingsPercent: savingsPercent.toFixed(0),
      roi: roi === Infinity ? "N/A" : `${roi} años`,
      isSaving: monthlySavings > 0,
    };
  }, [mowers.length, stations.length, config.batteryCapacity, cells, inputs, tierConfig]);

  return (
    <Card>
      <CardHeader className="p-2.5 pb-1.5">
        <CardTitle className="flex items-center gap-1.5 text-xs">
          <Crown className="h-3.5 w-3.5 text-accent" />
          <span>Plan {estimate.tierName}</span>
          <span className="text-muted-foreground font-normal ml-auto">S/. {estimate.autoFixed}/mes</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-2.5 pt-0 max-h-[420px] overflow-y-auto scrollbar-thin">
        {/* Cost inputs */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground flex items-center gap-1">
              Coste fijo S/. /mes
              <Tooltip content="Software, soporte, mantenimiento preventivo">
                <Info className="h-2.5 w-2.5" />
              </Tooltip>
            </Label>
            <Input
              type="number"
              value={inputs.fixedMonthly}
              onChange={(e) => setInputs((i) => ({ ...i, fixedMonthly: Number(e.target.value) }))}
              className="h-6 text-[10px] font-mono"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground flex items-center gap-1">
              Variable S/. /m²
              <Tooltip content="Energía + consumibles por m² mantenido">
                <Info className="h-2.5 w-2.5" />
              </Tooltip>
            </Label>
            <Input
              type="number"
              step="0.01"
              value={inputs.variablePerM2}
              onChange={(e) => setInputs((i) => ({ ...i, variablePerM2: Number(e.target.value) }))}
              className="h-6 text-[10px] font-mono"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground">Coste manual S/. /h</Label>
            <Input
              type="number"
              value={inputs.manualCostPerHour}
              onChange={(e) => setInputs((i) => ({ ...i, manualCostPerHour: Number(e.target.value) }))}
              className="h-6 text-[10px] font-mono"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-muted-foreground">Manual m²/h</Label>
            <Input
              type="number"
              value={inputs.manualEfficiencyM2H}
              onChange={(e) => setInputs((i) => ({ ...i, manualEfficiencyM2H: Number(e.target.value) }))}
              className="h-6 text-[10px] font-mono"
            />
          </div>
        </div>

        <Separator className="my-0.5" />

        {/* Autonomous cost breakdown */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-medium text-primary">Sistema Autónomo</span>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-muted-foreground">Coste fijo</span>
            <span>S/. {estimate.autoFixed}/mes</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-muted-foreground">Variable ({estimate.grassM2} m²)</span>
            <span>S/. {estimate.autoVariable}/mes</span>
          </div>
          <div className="flex justify-between font-mono text-[10px] font-medium">
            <span className="text-primary">Total autónomo</span>
            <span className="text-primary">S/. {estimate.autoTotal}/mes</span>
          </div>
        </div>

        <Separator className="my-0.5" />

        {/* Manual cost */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-medium text-muted-foreground">Coste Manual (referencia)</span>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-muted-foreground">Horas/mes estimadas</span>
            <span>{estimate.hoursPerMonth} h</span>
          </div>
          <div className="flex justify-between font-mono text-[10px] font-medium">
            <span className="text-muted-foreground">Total manual</span>
            <span>S/. {estimate.manualTotal}/mes</span>
          </div>
        </div>

        <Separator className="my-0.5" />

        {/* Savings comparison */}
        <div className={`rounded-md p-1.5 ${estimate.isSaving ? "bg-primary/10" : "bg-destructive/10"}`}>
          <div className="flex items-center gap-1 mb-0.5">
            {estimate.isSaving ? (
              <TrendingDown className="h-3 w-3 text-primary" />
            ) : (
              <TrendingUp className="h-3 w-3 text-destructive" />
            )}
            <span className={`text-[10px] font-medium ${estimate.isSaving ? "text-primary" : "text-destructive"}`}>
              {estimate.isSaving ? "Ahorro estimado" : "Coste adicional"}
            </span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-muted-foreground">Mensual</span>
            <span className={`font-bold ${estimate.isSaving ? "text-primary" : "text-destructive"}`}>
              {estimate.isSaving ? "+" : ""}S/. {estimate.monthlySavings}/mes
            </span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-muted-foreground">Anual</span>
            <span className={`font-bold ${estimate.isSaving ? "text-primary" : "text-destructive"}`}>
              {estimate.isSaving ? "+" : ""}S/. {estimate.yearlySavings}/año
            </span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-muted-foreground">Reducción</span>
            <span className="font-medium">{estimate.savingsPercent}%</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-muted-foreground">ROI</span>
            <span className="font-medium">{estimate.roi}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
