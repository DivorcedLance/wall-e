"use client";

import { useState } from "react";
import { Briefcase, Plus, Trash2, Pencil, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Tooltip } from "@/components/ui/tooltip";
import { useContextStore } from "@/lib/store/contextStore";
import { cn } from "@/lib/utils";
import type { ClientTier } from "@/lib/types";

const tierOptions: Array<{ value: ClientTier; label: string }> = [
  { value: "base", label: "Base" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
];

const tierColors: Record<ClientTier, string> = {
  base: "bg-muted text-muted-foreground",
  standard: "bg-primary/10 text-primary",
  premium: "bg-accent/10 text-accent",
};

export function ClientSelector() {
  const clients = useContextStore((s) => s.clients);
  const activeId = useContextStore((s) => s.activeClientId);
  const setActive = useContextStore((s) => s.setActiveClient);
  const create = useContextStore((s) => s.createClient);
  const remove = useContextStore((s) => s.deleteClient);

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [tier, setTier] = useState<ClientTier>("base");

  const activeClient = clients.find((c) => c.id === activeId);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const client = await create(name, tier);
    setActive(client.id);
    setName("");
    setTier("base");
    setShowNew(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Briefcase className="h-4 w-4 text-primary" />
          Cliente
        </Label>
        <Tooltip content={showNew ? "Cerrar" : "Crear cliente"}>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setShowNew(!showNew);
              if (showNew) setName("");
            }}
            className="h-7 w-7"
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
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
              !activeId && "text-muted-foreground",
            )}
          >
            <option value="" disabled>
              Selecciona un cliente
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
                if (confirm("¿Eliminar este cliente y todos sus datos?")) {
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

      {activeClient && (
        <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Activo:</span>
          <span className="text-xs font-medium">{activeClient.name}</span>
          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", tierColors[activeClient.tier])}>
            {activeClient.tier}
          </Badge>
        </div>
      )}

      <Collapsible open={showNew} onOpenChange={setShowNew}>
        <CollapsibleContent>
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
            <Input
              placeholder="Nombre del cliente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
              className="h-9"
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as ClientTier)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                >
                  {tierOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Button onClick={handleCreate} size="sm" className="h-9 px-4" disabled={!name.trim()}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Crear
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
