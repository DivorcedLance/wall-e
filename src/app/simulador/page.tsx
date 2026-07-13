"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, ArrowRight, Sun, Moon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientSelector } from "@/components/context-selector/ClientSelector";
import { ProjectSelector } from "@/components/context-selector/ProjectSelector";
import { SpaceSelector } from "@/components/context-selector/SpaceSelector";
import { ConfigPanel } from "@/components/context-selector/ConfigPanel";
import { useContextStore } from "@/lib/store/contextStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { useTheme } from "@/components/ThemeProvider";
import type { ProjectConfig } from "@/lib/types";
import { DEFAULT_PROJECT_CONFIG } from "@/lib/constants";

export default function SimuladorPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const loadAll = useContextStore((s) => s.loadAll);
  const loaded = useContextStore((s) => s.loaded);
  const activeClientId = useContextStore((s) => s.activeClientId);
  const activeProjectId = useContextStore((s) => s.activeProjectId);
  const activeSpaceId = useContextStore((s) => s.activeSpaceId);
  const clients = useContextStore((s) => s.clients);
  const projects = useContextStore((s) => s.projects);
  const spaces = useContextStore((s) => s.spaces);
  const updateConfig = useContextStore((s) => s.updateProjectConfig);
  const loadSpace = useSimulationStore((s) => s.loadSpace);

  const [config, setConfig] = useState<ProjectConfig>({ ...DEFAULT_PROJECT_CONFIG });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && !loaded) loadAll();
  }, [hydrated, loaded, loadAll]);

  useEffect(() => {
    const project = projects.find((p) => p.id === activeProjectId);
    setConfig(project ? project.config : { ...DEFAULT_PROJECT_CONFIG });
  }, [activeProjectId, projects]);

  const handleConfigChange = (next: ProjectConfig) => {
    setConfig(next);
    if (activeProjectId) updateConfig(activeProjectId, next);
  };

  const canEnter = Boolean(activeClientId && activeProjectId && activeSpaceId);

  const handleEnter = async () => {
    if (!canEnter) return;
    setLoading(true);
    try {
      const project = projects.find((p) => p.id === activeProjectId);
      const space = spaces.find((s) => s.id === activeSpaceId);
      if (!project || !space) { setLoading(false); return; }
      await loadSpace(space, project.config);
      router.push("/editor");
    } catch (err) {
      console.error("Error loading space:", err);
      setLoading(false);
    }
  };

  const { theme, toggle } = useTheme();

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Cargando...
        </div>
      </div>
    );
  }

  const missingLabel = clients.length === 0
    ? "Crea un cliente para comenzar"
    : !activeClientId
      ? "Selecciona un cliente"
      : !activeProjectId
        ? "Selecciona o crea un proyecto"
        : "Selecciona o crea un espacio";

  return (
    <main className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-none truncate">W.A.L.L.-E.</h1>
              <p className="text-xs text-muted-foreground truncate">Editor de podadoras</p>
            </div>
          </Link>
        </div>
        <nav className="flex items-center gap-1 shrink-0">
          <Link href="/about" className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Acerca de</Link>
          <Link href="/pricing" className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Precios</Link>
          <Link href="/contact" className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Contacto</Link>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={toggle}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </nav>
      </header>

      <div className="flex flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 scrollbar-thin">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Volver al inicio
            </Link>
          </div>
          <Card className="w-full">
            <CardContent className="space-y-4 sm:space-y-5 p-4 sm:p-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Contexto de trabajo</h2>
                <p className="text-sm text-muted-foreground">
                  Selecciona el cliente, proyecto y espacio con el que deseas trabajar.
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <ClientSelector />
                  <ProjectSelector />
                </div>
                <div className="space-y-3">
                  <SpaceSelector />
                </div>
              </div>

              {activeProjectId && (
                <ConfigPanel config={config} onChange={handleConfigChange} />
              )}

              <div className="space-y-2 pt-2">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!canEnter || loading}
                  onClick={handleEnter}
                >
                  {loading ? "Cargando..." : "Entrar al Editor"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                {!canEnter && (
                  <p className="text-center text-xs text-muted-foreground">{missingLabel}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
