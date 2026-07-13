"use client";

import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useEditorStore } from "@/lib/store/editorStore";

export function CameraControls() {
  const zoom = useEditorStore((s) => s.zoom);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const resetView = useEditorStore((s) => s.resetView);
  const setZoom = useEditorStore((s) => s.setZoom);

  const handleCenter = () => {
    resetView();
    setZoom(1);
  };

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-surface/80 px-1 py-1 backdrop-blur">
      <Tooltip content="Alejar">
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="h-7 w-7"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>
      <div className="flex min-w-[60px] items-center justify-center gap-1 font-mono text-xs text-muted-foreground">
        <span className="text-foreground font-medium">{Math.round(zoom * 100)}%</span>
      </div>
      <Tooltip content="Acercar">
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="h-7 w-7"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>
      <div className="mx-1 h-4 w-px bg-border" />
      <Tooltip content="Centrar vista">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCenter}
          className="h-7 px-2"
          aria-label="Centrar vista"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Centrar
        </Button>
      </Tooltip>
    </div>
  );
}
