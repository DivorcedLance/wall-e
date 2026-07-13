"use client";

import { Pause, Play, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { TIME_MULTIPLIER_OPTIONS } from "@/lib/constants";

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatSimTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function TimeControls() {
  const isPlaying = useSimulationStore((s) => s.isPlaying);
  const setPlaying = useSimulationStore((s) => s.setPlaying);
  const timeMultiplier = useSimulationStore((s) => s.timeMultiplier);
  const setTimeMultiplier = useSimulationStore((s) => s.setTimeMultiplier);
  const simulatedTimeMs = useSimulationStore((s) => s.simulatedTimeMs);
  const simulatedDay = useSimulationStore((s) => s.simulatedDay);

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-surface/80 px-1 py-1 backdrop-blur">
      <Tooltip content={isPlaying ? "Pausar" : "Reproducir"}>
        <Button
          variant={isPlaying ? "destructive" : "default"}
          size="icon"
          onClick={() => setPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
          className="h-7 w-7"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
      </Tooltip>
      <div className="mx-1 h-4 w-px bg-border" />
      <Clock className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
      <div className="relative">
        <select
          value={String(timeMultiplier)}
          onChange={(e) => setTimeMultiplier(Number(e.target.value))}
          className="h-7 w-[72px] appearance-none rounded-md border border-border bg-background pl-2 pr-6 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {TIME_MULTIPLIER_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}x
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
          <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <div className="mx-1 h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5 px-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{DAY_NAMES[simulatedDay]}</span>
        <span className="font-mono text-xs font-semibold text-foreground">{formatSimTime(simulatedTimeMs)}</span>
      </div>
    </div>
  );
}
