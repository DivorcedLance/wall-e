"use client";

import { useState, useCallback, useEffect } from "react";
import { SplashScreen } from "@/components/SplashScreen";

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("walle-splash-seen");
    setShowSplash(!seen);
    setMounted(true);
  }, []);

  const handleComplete = useCallback(() => {
    sessionStorage.setItem("walle-splash-seen", "1");
    setShowSplash(false);
  }, []);

  return (
    <>
      {mounted && showSplash && <SplashScreen onComplete={handleComplete} />}
      {children}
    </>
  );
}
