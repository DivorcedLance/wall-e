"use client";

import {
  ArrowLeft,
  Save,
  RotateCcw,
  Download,
  Upload,
  Map as MapIcon,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { useContextStore } from "@/lib/store/contextStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { useEditorStore } from "@/lib/store/editorStore";
import { exportSpaceToJson } from "@/lib/export";
import { useTheme } from "@/components/ThemeProvider";
import { useRef } from "react";
import { importSpaceFromJson } from "@/lib/import";
import { DEFAULT_PROJECT_CONFIG } from "@/lib/constants";

export function ContextHeader() {
  const router = useRouter();
  const clients = useContextStore((s) => s.clients);
  const projects = useContextStore((s) => s.projects);
  const spaces = useContextStore((s) => s.spaces);
  const activeClientId = useContextStore((s) => s.activeClientId);
  const activeProjectId = useContextStore((s) => s.activeProjectId);
  const activeSpaceId = useContextStore((s) => s.activeSpaceId);
  const resetView = useEditorStore((s) => s.resetView);
  const save = useSimulationStore((s) => s.saveSpace);
  const dirty = useSimulationStore((s) => s.dirty);
  const saving = useSimulationStore((s) => s.saving);

  const client = clients.find((c) => c.id === activeClientId);
  const project = projects.find((p) => p.id === activeProjectId);
  const space = spaces.find((s) => s.id === activeSpaceId);

  const handleSave = async () => {
    await save();
  };

  const handleExport = () => {
    exportSpaceToJson();
  };

  const { theme, toggle } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importSpaceFromJson(file);
      const loadSpace = useSimulationStore.getState().loadSpace;
      const space = {
        id: `imported-${Date.now()}`,
        projectId: activeProjectId ?? "",
        name: data.name ?? "Importado",
        width: data.width!,
        height: data.height!,
        cellSize: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const layout = {
        cells: (data.cells ?? []).map((c) => ({ x: c.x, y: c.y, type: c.type, grassHeight: c.grassHeight })),
        mowers: (data.mowers ?? []).map((m) => ({ x: m.x, y: m.y, tier: (m.tier ?? "standard") as any })),
        stations: (data.stations ?? []).map((s) => ({ x: s.x, y: s.y })),
      };
      await loadSpace(space, { ...DEFAULT_PROJECT_CONFIG }, layout);
      router.push("/editor");
    } catch (err) {
      console.error("Import error:", err);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2 min-w-0">
        <Tooltip content="Volver al selector">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            aria-label="Volver al selector"
            className="h-8 w-8 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Separator orientation="vertical" className="h-5 shrink-0" />
        <nav className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Link href="/about" className="rounded px-2 py-1 hover:text-foreground hover:bg-muted transition-colors">Acerca de</Link>
          <Link href="/pricing" className="rounded px-2 py-1 hover:text-foreground hover:bg-muted transition-colors">Precios</Link>
          <Link href="/contact" className="rounded px-2 py-1 hover:text-foreground hover:bg-muted transition-colors">Contacto</Link>
        </nav>
        <Separator orientation="vertical" className="h-5 shrink-0 hidden md:block" />
        <nav className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground min-w-0 overflow-hidden">
          <span className="truncate text-foreground">{client?.name ?? "—"}</span>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          <span className="truncate text-foreground">{project?.name ?? "—"}</span>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          <span className="flex items-center gap-1 text-primary shrink-0">
            <MapIcon className="h-3 w-3" />
            <span className="truncate">{space?.name ?? "—"}</span>
          </span>
        </nav>
        {dirty && (
          <span className="shrink-0 rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">
            sin guardar
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Tooltip content="Resetear vista">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetView}
            aria-label="Resetear vista"
            className="h-8 w-8"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content="Importar JSON">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Importar JSON"
            className="h-8 w-8"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <Tooltip content="Exportar JSON">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExport}
            aria-label="Exportar JSON"
            className="h-8 w-8"
          >
            <Download className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip content={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Cambiar tema"
            className="h-8 w-8"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </Tooltip>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="h-8"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </header>
  );
}
