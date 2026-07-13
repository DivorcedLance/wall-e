"use client";

import { useState } from "react";
import { FolderKanban, Plus, Trash2, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Tooltip } from "@/components/ui/tooltip";
import { useContextStore } from "@/lib/store/contextStore";
import { cn } from "@/lib/utils";

export function ProjectSelector() {
  const activeClientId = useContextStore((s) => s.activeClientId);
  const allProjects = useContextStore((s) => s.projects);
  const activeId = useContextStore((s) => s.activeProjectId);
  const setActive = useContextStore((s) => s.setActiveProject);
  const create = useContextStore((s) => s.createProject);
  const remove = useContextStore((s) => s.deleteProject);

  const projects = allProjects.filter((p) => p.clientId === activeClientId);
  const activeProject = projects.find((p) => p.id === activeId);

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!activeClientId || !name.trim()) return;
    const p = await create(activeClientId, name);
    setActive(p.id);
    setName("");
    setShowNew(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <FolderKanban className="h-4 w-4 text-primary" />
          Proyecto
        </Label>
        <Tooltip content={showNew ? "Cerrar" : "Crear proyecto"}>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setShowNew(!showNew);
              if (showNew) setName("");
            }}
            className="h-7 w-7"
            disabled={!activeClientId}
          >
            {showNew ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </Button>
        </Tooltip>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <select
            value={activeId ?? ""}
            onChange={(e) => setActive(e.target.value || null)}
            disabled={!activeClientId}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
              !activeId && "text-muted-foreground",
            )}
          >
            <option value="" disabled>
              {activeClientId
                ? "Selecciona un proyecto"
                : "Selecciona un cliente primero"}
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {activeId && (
          <Tooltip content="Eliminar">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (confirm("¿Eliminar este proyecto y sus espacios?")) {
                  remove(activeId);
                }
              }}
              className="shrink-0 h-9 w-9"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </Tooltip>
        )}
      </div>

      {activeProject && (
        <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Activo:</span>
          <span className="text-xs font-medium">{activeProject.name}</span>
        </div>
      )}

      <Collapsible open={showNew} onOpenChange={setShowNew}>
        <CollapsibleContent>
          <div className="flex gap-2 rounded-md border border-border bg-muted/30 p-3">
            <Input
              placeholder="Nombre del proyecto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
              className="h-9"
            />
            <Button onClick={handleCreate} size="sm" className="h-9 px-4 shrink-0" disabled={!name.trim()}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Crear
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
