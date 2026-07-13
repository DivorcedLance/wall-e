"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className, disabled, id }, ref) => {
    return (
      <input
        ref={ref}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        style={{
          background: `linear-gradient(to right, #22c55e 0%, #22c55e ${
            ((value - min) / (max - min)) * 100
          }%, #1e293b ${
            ((value - min) / (max - min)) * 100
          }%, #1e293b 100%)`,
        }}
      />
    );
  },
);
Slider.displayName = "Slider";

export { Slider };
