"use client";

import LandingLayout from "@/components/LandingPage";
import { Map, Route, Clock, Zap, Shield, Bot } from "lucide-react";

const features = [
  { icon: Map, title: "Editor Isométrico", desc: "Mapas isométricos con grid, pintura de tiles, zoom y pan. Crea espacios verdes completos." },
  { icon: Route, title: "Rutas Optimizadas", desc: "Algoritmos Voronoi + nearest-neighbor para distribuir y optimizar rutas de poda." },
  { icon: Clock, title: "Simulación en Tiempo Real", desc: "Crecimiento de césped, batería, carga, y programación de podadoras." },
  { icon: Zap, title: "Multi-Podadora", desc: "Gestiona flotas de hasta 15 podadoras con balanceo de carga y evitación de colisiones." },
  { icon: Shield, title: "100% Offline", desc: "Todo funciona localmente en tu navegador. Sin servidores, sin suscripciones obligatorias." },
  { icon: Bot, title: "Demos Incluidas", desc: "13 escenarios predefinidos desde pruebas rápidas hasta campus universitarios." },
];

export default function AboutPage() {
  return (
    <LandingLayout>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold">Acerca de W.A.L.L.-E.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          W.A.L.L.-E. es un editor isométrico offline diseñado para la orquestación inteligente de flotas de podadoras autónomas.
          Permite crear, editar y simular espacios verdes con rutas optimizadas, balanceo de carga y gestión de batería en tiempo real.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border border-border bg-surface p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </LandingLayout>
  );
}
