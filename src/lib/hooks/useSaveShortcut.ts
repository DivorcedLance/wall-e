"use client";

import { useEffect } from "react";
import { useSimulationStore } from "@/lib/store/simulationStore";

export function useSaveShortcut() {
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        await useSimulationStore.getState().saveSpace();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
