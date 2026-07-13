"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const logoSrc = theme === "dark" ? "/walle_logo_dark.svg" : "/walle_logo_light.svg";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 50);
    const t2 = setTimeout(() => setPhase("exit"), 1600);
    const t3 = setTimeout(onComplete, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-400 ${
        phase === "enter" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-500 ${
          phase === "show" ? "scale-100 rotate-0" : "scale-75 rotate-12"
        }`}
      >
        <img src={logoSrc} alt="W.A.L.L.-E." className="h-12 w-12" />
      </div>
      <h1
        className={`mt-5 text-2xl font-bold tracking-tight text-foreground transition-all duration-500 delay-100 ${
          phase === "show" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        W.A.L.L.-E.
      </h1>
      <p
        className={`mt-1 text-sm text-muted-foreground transition-all duration-500 delay-200 ${
          phase === "show" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        Orquestación de podadoras autónomas
      </p>
      <div
        className={`mt-6 h-1 w-32 overflow-hidden rounded-full bg-border transition-all duration-500 delay-300 ${
          phase === "show" ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-full origin-left animate-[shrinkX_1.2s_ease-in-out_0.4s_forwards] bg-primary scale-x-100" />
      </div>
    </div>
  );
}
