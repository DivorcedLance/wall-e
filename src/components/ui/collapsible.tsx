"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CollapsibleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Collapsible({
  open,
  onOpenChange,
  children,
  className,
}: CollapsibleProps) {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

const CollapsibleContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

export function CollapsibleTrigger({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(CollapsibleContext);
  return (
    <button
      type="button"
      onClick={() => ctx.onOpenChange(!ctx.open)}
      className={cn("flex w-full items-center justify-between", className)}
      {...props}
    >
      {children}
    </button>
  );
}

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CollapsibleContent({
  className,
  children,
  ...props
}: CollapsibleContentProps) {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx.open) return null;
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}
