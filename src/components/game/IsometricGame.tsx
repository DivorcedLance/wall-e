"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Bot, Loader2 } from "lucide-react";

const IsometricGameWrapper = dynamic(
  () =>
    import("@/components/game/IsometricGameWrapper").then(
      (m) => m.IsometricGameWrapper,
    ),
  { ssr: false },
);

export function IsometricGame() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="font-mono text-xs">Cargando motor isométrico</p>
        </div>
      </div>
    );
  }
  return <IsometricGameWrapper />;
}
