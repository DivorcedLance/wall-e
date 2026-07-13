"use client";

import { useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ProjectConfig } from "@/lib/types";

interface ConfigPanelProps {
  config: ProjectConfig;
  onChange: (config: ProjectConfig) => void;
}

export function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  const [open, setOpen] = useState(false);

  const update = (partial: Partial<ProjectConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <Card>
      <CardHeader className="cursor-pointer p-4" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              Configuración del Proyecto
            </CardTitle>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </CardHeader>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-4 px-4 pb-4 pt-0">
            <ConfigSlider
              label="Tasa de crecimiento del césped"
              value={growthToSlider(config.grassGrowthRatePerSecond)}
              displayValue={`${config.grassGrowthRatePerSecond.toFixed(3)} %/s`}
              onChange={(v) => update({ grassGrowthRatePerSecond: sliderToGrowth(v) })}
              min={0}
              max={100}
            />
            <ConfigSlider
              label="Umbral de poda"
              value={config.mowThreshold}
              displayValue={`${config.mowThreshold}%`}
              onChange={(v) => update({ mowThreshold: v })}
              min={5}
              max={80}
            />
            <ConfigSlider
              label="Consumo de batería"
              value={config.batteryDrainPerSecond}
              displayValue={`${config.batteryDrainPerSecond.toFixed(2)} %/s`}
              onChange={(v) => update({ batteryDrainPerSecond: v })}
              min={0}
              max={5}
              step={0.1}
            />
            <ConfigSlider
              label="Velocidad de carga"
              value={config.chargingRatePerSecond}
              displayValue={`${config.chargingRatePerSecond.toFixed(1)} %/s`}
              onChange={(v) => update({ chargingRatePerSecond: v })}
              min={0.5}
              max={10}
              step={0.5}
            />
            <ConfigSlider
              label="Capacidad de batería"
              value={config.batteryCapacity}
              displayValue={String(config.batteryCapacity)}
              onChange={(v) => update({ batteryCapacity: v })}
              min={50}
              max={200}
              step={10}
            />
            <ConfigSlider
              label="Multiplicador de tiempo"
              value={config.timeMultiplier}
              displayValue={`${config.timeMultiplier}x`}
              onChange={(v) => update({ timeMultiplier: v })}
              min={1}
              max={100}
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ConfigSlider({
  label,
  value,
  displayValue,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  displayValue: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="font-mono text-xs text-primary">{displayValue}</span>
      </div>
      <Slider
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

// Exponential mapping: slider 0-100 → rate 0.01-100
// Allows selecting very small growth rates at the low end
function sliderToGrowth(slider: number): number {
  if (slider <= 0) return 0;
  return 0.01 * Math.pow(10, slider / 50);
}
function growthToSlider(rate: number): number {
  if (rate <= 0) return 0;
  return Math.min(100, Math.max(0, 50 * Math.log10(rate / 0.01)));
}
