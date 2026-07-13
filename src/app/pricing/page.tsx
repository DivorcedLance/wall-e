"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import LandingLayout from "@/components/LandingPage";
import { useContextStore } from "@/lib/store/contextStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { DEMOS } from "@/lib/demos";
import type { ClientTier } from "@/lib/types";
import { DEFAULT_PROJECT_CONFIG } from "@/lib/constants";

const plans: Array<{
  name: string;
  price: number;
  desc: string;
  features: string[];
  tier: ClientTier;
  demoId?: string;
  popular?: boolean;
}> = [
  { name: "Básico", price: 150, desc: "Para jardines pequeños y residencias.", features: ["Hasta 2 podadoras", "1 estación de carga", "Mapas hasta 20×20", "3 espacios guardados", "Soporte por email"], tier: "base", demoId: "small" },
  { name: "Estándar", price: 350, desc: "Para comunidades y propiedades medianas.", features: ["Hasta 5 podadoras", "3 estaciones de carga", "Mapas hasta 35×35", "10 espacios guardados", "Soporte chat + email"], tier: "standard", demoId: "urban", popular: true },
  { name: "Premium", price: 600, desc: "Para campus, parques y empresas.", features: ["Hasta 15 podadoras", "5 estaciones de carga", "Mapas hasta 60×60", "50 espacios guardados", "Soporte prioritario 24h"], tier: "premium", demoId: "campus" },
  { name: "Enterprise", price: 0, desc: "Para operaciones a gran escala.", features: ["Podadoras ilimitadas", "Estaciones ilimitadas", "Mapas hasta 100×100", "Espacios ilimitados", "Soporte dedicado", "API de integración"], tier: "enterprise", demoId: "park" },
];

function getUniqueName(existing: string[], prefix: string): string {
  let i = 1;
  while (existing.includes(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const clients = useContextStore((s) => s.clients);
  const projects = useContextStore((s) => s.projects);
  const createClient = useContextStore((s) => s.createClient);
  const createProject = useContextStore((s) => s.createProject);
  const setActiveClient = useContextStore((s) => s.setActiveClient);
  const setActiveProject = useContextStore((s) => s.setActiveProject);
  const loadSpace = useSimulationStore((s) => s.loadSpace);

  const handleStartTrial = async (plan: typeof plans[0]) => {
    if (plan.tier === "enterprise") {
      router.push("/contact");
      return;
    }
    setLoading(plan.tier);
    try {
      const clientName = getUniqueName(clients.map((c) => c.name), "ClientePrueba");
      const client = await createClient(clientName, plan.tier);
      setActiveClient(client.id);

      const projectName = getUniqueName(projects.map((p) => p.name), "ProyectoPrueba");
      const project = await createProject(client.id, projectName);
      setActiveProject(project.id);

      const demo = DEMOS.find((d) => d.id === plan.demoId) ?? DEMOS[0];
      const layout = demo.build();

      const { db } = await import("@/lib/db/indexedDB");
      const { generateId } = await import("@/lib/utils");
      const { assignStationsToMowers, computeCoverageTours } = await import("@/lib/fleet");
      const { MOWER_PALETTE } = await import("@/lib/constants");

      const spaceId = generateId();
      const space = {
        id: spaceId,
        projectId: project.id,
        name: demo.name,
        width: demo.width,
        height: demo.height,
        cellSize: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.putSpace(space);

      const stationKeys = new Set(layout.stations.map((s) => `${s.x},${s.y}`));
      const cellEntries = layout.cells.map((c) => {
        const key = `${c.x},${c.y}`;
        const isStation = stationKeys.has(key);
        return { key, data: { type: (isStation ? "charging_station" : c.type) as any, grassHeight: isStation || c.type !== "grass" ? 0 : (c.grassHeight ?? 100), lastMowed: 0 } };
      });
      for (const s of layout.stations) {
        const key = `${s.x},${s.y}`;
        if (!cellEntries.find((e) => e.key === key)) cellEntries.push({ key, data: { type: "charging_station" as any, grassHeight: 0, lastMowed: 0 } });
      }
      await db.putMapCells(spaceId, cellEntries);

      const mowers = layout.mowers.map((m, i) => ({
        id: generateId(), spaceId, name: `Podadora ${i + 1}`,
        x: m.x, y: m.y, fromX: m.x, fromY: m.y, moveT: 1,
        status: "idle" as const, battery: 100, tier: m.tier, path: [], pathIndex: 0,
        color: MOWER_PALETTE[i % MOWER_PALETTE.length],
      }));
      const stations = layout.stations.map((s) => ({
        id: generateId(), spaceId, x: s.x, y: s.y, active: true,
      }));

      const cellsMap = new Map(cellEntries.map((e) => [e.key, e.data as any]));
      const stationMap = assignStationsToMowers(mowers, stations);
      const { tours, perimeters } = computeCoverageTours(mowers, cellsMap, demo.width, demo.height, project.config.mowThreshold, stationMap);

      const enrichedMowers = mowers.map((m) => ({
        ...m, x: stationMap.get(m.id)?.x ?? m.x, y: stationMap.get(m.id)?.y ?? m.y,
        fromX: stationMap.get(m.id)?.x ?? m.x, fromY: stationMap.get(m.id)?.y ?? m.y,
        assignedStationId: stationMap.get(m.id)?.id,
        coverageTiles: tours.get(m.id) ?? [], tourIndex: 0,
        perimeterEdges: perimeters.get(m.id) ?? [],
      }));

      for (const mower of enrichedMowers) await db.putMower(mower);
      for (const station of stations) await db.putStation(station);

      await loadSpace(space, project.config);
      router.push("/editor");
    } catch (err) {
      console.error("Error creating trial:", err);
      setLoading(null);
    }
  };

  return (
    <LandingLayout>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">Planes y Precios</h1>
          <p className="mt-3 text-base sm:text-lg text-muted-foreground">
            Elige el plan que se adapte a tu flota. Todos incluyen 14 días de prueba gratuita.
          </p>
        </div>
        <div className="mt-10 sm:mt-12 grid gap-5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-lg border bg-card p-5 ${
                plan.popular ? "border-primary shadow-lg shadow-primary/10" : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Popular
                </div>
              )}
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-accent shrink-0" />
                <h3 className="text-lg font-semibold">{plan.name}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-4 min-h-[36px]">
                {plan.price > 0 ? (
                  <span className="text-3xl font-bold">€{plan.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></span>
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">Personalizado</span>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleStartTrial(plan)}
                disabled={loading !== null}
                className={`mt-5 block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border text-foreground hover:bg-muted"
                } disabled:opacity-50`}
              >
                {loading === plan.tier ? "Creando..." : plan.price > 0 ? "Empezar prueba" : "Contactar ventas"}
              </button>
            </div>
          ))}
        </div>
      </main>
    </LandingLayout>
  );
}
