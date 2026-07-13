"use client";

import { Bot, Map, Route, Zap, Clock, Shield, ArrowRight, Crown, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { usePathname } from "next/navigation";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const isSimulator = pathname === "/simulador" || pathname === "/editor";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold">W.A.L.L.-E.</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/about" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Acerca de</Link>
            <Link href="/pricing" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Precios</Link>
            <Link href="/contact" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Contacto</Link>
            <div className="w-px h-5 bg-border mx-2" />
            {!isSimulator && (
              <Link href="/simulador" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Abrir Editor
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <button
              onClick={toggle}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-border hover:text-foreground transition-colors ml-1"
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

export function LandingHero() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Orquestación inteligente de
            <span className="text-primary"> podadoras autónomas</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Editor isométrico offline para crear, editar y simular espacios verdes con flotas de podadoras.
            Rutas optimizadas, balanceo de carga y gestión de batería en tiempo real.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/simulador" className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Empezar ahora
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/about" className="inline-flex items-center gap-2 rounded-lg border border-border px-8 py-3 text-base font-medium text-foreground hover:bg-muted transition-colors">
              Conocer más
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-surface/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold">Todo lo que necesitas</h2>
          <p className="mt-3 text-center text-muted-foreground">Herramientas profesionales para gestionar flotas de podadoras</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Map, title: "Editor Isométrico", desc: "Mapas interactivos con grid, pintura de tiles, zoom y pan. Crea espacios verdes completos." },
              { icon: Route, title: "Rutas Optimizadas", desc: "Algoritmos Voronoi + nearest-neighbor distribuyen y optimizan rutas de poda automáticamente." },
              { icon: Clock, title: "Simulación en Tiempo Real", desc: "Visualiza el crecimiento de césped, consumo de batería, ciclos de carga y programación." },
              { icon: Zap, title: "Multi-Podadora", desc: "Gestiona flotas con balanceo de carga, evitación de colisiones y multi-trip inteligente." },
              { icon: Shield, title: "100% Offline", desc: "Todo funciona localmente en tu navegador. Sin servidores, sin dependencias externas." },
              { icon: Crown, title: "Planes Flexibles", desc: "Desde jardines residenciales hasta campus universitarios. Elige el plan que necesitas." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors">
                <Icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold">¿Listo para optimizar tu flota?</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Empieza gratis con el plan Básico. Sin tarjeta de crédito.
          </p>
          <Link href="/simulador" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Abrir el editor
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span>W.A.L.L.-E.</span>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">Acerca de</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Precios</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contacto</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
