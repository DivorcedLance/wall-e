"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Info, AlertCircle, CheckCircle, Trash2 } from "lucide-react";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { Button } from "@/components/ui/button";

const TYPE_ICON = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
} as const;

const TYPE_COLOR = {
  info: "text-secondary",
  warning: "text-accent",
  error: "text-destructive",
  success: "text-primary",
} as const;

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function EventLog() {
  const eventLog = useSimulationStore((s) => s.eventLog);
  const setEventLog = useSimulationStore((s) => {
    const store = s as any;
    return store.setEventLog;
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventLog.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground">Eventos ({eventLog.length})</span>
        {eventLog.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => {
              const store = useSimulationStore.getState() as any;
              if (store.setEventLog) store.setEventLog([]);
              else useSimulationStore.setState({ eventLog: [] });
            }}
            title="Limpiar log"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
        {eventLog.length === 0 ? (
          <p className="text-[10px] text-muted-foreground py-4 text-center">
            No hay eventos aún. Inicia la simulación para ver eventos.
          </p>
        ) : (
          eventLog.map((entry, i) => {
            const Icon = TYPE_ICON[entry.type];
            return (
              <div
                key={i}
                className="flex items-start gap-1.5 py-0.5 px-1 rounded hover:bg-border/50 transition-colors"
              >
                <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${TYPE_COLOR[entry.type]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-foreground leading-tight">{entry.message}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">
                    {DAY_NAMES[entry.day]} {formatTime(entry.time)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
