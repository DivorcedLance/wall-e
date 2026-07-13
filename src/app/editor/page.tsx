"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useContextStore } from "@/lib/store/contextStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useEditorStore } from "@/lib/store/editorStore";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useSaveShortcut } from "@/lib/hooks/useSaveShortcut";
import { ContextHeader } from "@/components/game/ContextHeader";
import { Sidebar } from "@/components/game/Sidebar";
import { CameraControls } from "@/components/game/CameraControls";
import { TimeControls } from "@/components/game/TimeControls";
import { Minimap } from "@/components/game/Minimap";
import { IsometricGame } from "@/components/game/IsometricGame";

export default function EditorPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const loadAll = useContextStore((s) => s.loadAll);
  const loaded = useContextStore((s) => s.loaded);
  const clients = useContextStore((s) => s.clients);
  const projects = useContextStore((s) => s.projects);
  const spaces = useContextStore((s) => s.spaces);
  const activeClientId = useContextStore((s) => s.activeClientId);
  const activeProjectId = useContextStore((s) => s.activeProjectId);
  const activeSpaceId = useContextStore((s) => s.activeSpaceId);
  const space = useSimulationStore((s) => s.space);
  const loadSpace = useSimulationStore((s) => s.loadSpace);

  useEffect(() => {
    if (hydrated && !loaded) {
      loadAll();
    }
  }, [hydrated, loaded, loadAll]);

  useEffect(() => {
    if (
      hydrated &&
      loaded &&
      activeSpaceId &&
      activeProjectId &&
      !space
    ) {
      const project = projects.find((p) => p.id === activeProjectId);
      const sp = spaces.find((s) => s.id === activeSpaceId);
      if (project && sp) {
        loadSpace(sp, project.config).catch((err) => {
          console.error("Error loading space in editor:", err);
        });
      }
    }
  }, [
    hydrated,
    loaded,
    activeSpaceId,
    activeProjectId,
    space,
    projects,
    spaces,
    loadSpace,
  ]);

  useSaveShortcut();
  const [presentationMode, setPresentationMode] = useState(false);

  // Undo/Redo + Copy/Paste keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useSimulationStore.getState().undo();
      } else if (ctrl && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        useSimulationStore.getState().redo();
      } else if (ctrl && e.key === "y") {
        e.preventDefault();
        useSimulationStore.getState().redo();
      } else if (ctrl && e.key === "c") {
        useEditorStore.getState().copySelection();
      } else if (ctrl && e.key === "x") {
        useEditorStore.getState().cutSelection();
      } else if (ctrl && e.key === "v") {
        useEditorStore.getState().pasteClipboard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2Icon />
      </div>
    );
  }

  if (!activeClientId || !activeProjectId || !activeSpaceId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Sin contexto activo</h2>
              <p className="text-sm text-muted-foreground">
                Selecciona un cliente, proyecto y espacio antes de entrar al
                editor.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push("/simulador")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al selector
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2Icon />
      </div>
    );
  }

  void clients;

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        {!presentationMode && <ContextHeader />}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            <IsometricGame />
            <Minimap />
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
              <div className="pointer-events-auto flex items-center gap-2">
                <CameraControls />
                <TimeControls />
              </div>
            </div>
            <button
              onClick={() => setPresentationMode(!presentationMode)}
              className="pointer-events-auto absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-surface/80 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-border transition-colors"
              title={presentationMode ? "Salir de presentación" : "Modo presentación"}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </main>
          {!presentationMode && <Sidebar />}
        </div>
      </div>
    </TooltipProvider>
  );
}

function Loader2Icon() {
  return (
    <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      Cargando...
    </div>
  );
}
