import {
  MousePointer2,
  Leaf,
  Route,
  Flower2,
  Building2,
  Mountain,
  Trees,
  Droplets,
  Circle,
  Plug,
  Trash2,
  SquareDashed,
  Bot,
  type LucideIcon,
} from "lucide-react";
import type { ToolType } from "@/lib/types";

export interface ToolDefinition {
  id: ToolType;
  label: string;
  icon: LucideIcon;
  description: string;
  brushable: boolean;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: "select",
    label: "Cursor",
    icon: MousePointer2,
    description: "Seleccionar",
    brushable: false,
  },
  {
    id: "grass",
    label: "Césped",
    icon: Leaf,
    description: "Pintar césped (con altura)",
    brushable: true,
  },
  {
    id: "path",
    label: "Camino",
    icon: Route,
    description: "Pintar camino",
    brushable: true,
  },
  {
    id: "flowers",
    label: "Flores",
    icon: Flower2,
    description: "Pintar flores",
    brushable: true,
  },
  {
    id: "building",
    label: "Edificio",
    icon: Building2,
    description: "Pintar edificio",
    brushable: true,
  },
  {
    id: "obstacle",
    label: "Obstáculo",
    icon: Mountain,
    description: "Pintar obstáculo",
    brushable: true,
  },
  {
    id: "tree",
    label: "Árbol",
    icon: Trees,
    description: "Pintar árbol (cluster)",
    brushable: true,
  },
  {
    id: "water",
    label: "Agua",
    icon: Droplets,
    description: "Pintar agua",
    brushable: true,
  },
  {
    id: "gravel",
    label: "Grava/Arena",
    icon: Circle,
    description: "Pintar grava o arena",
    brushable: true,
  },
  {
    id: "charging_station",
    label: "Carga",
    icon: Plug,
    description: "Estación de carga",
    brushable: true,
  },
  {
    id: "empty",
    label: "Vacío",
    icon: SquareDashed,
    description: "Agujero en el campo",
    brushable: true,
  },
  {
    id: "mower",
    label: "Podadora",
    icon: Bot,
    description: "Colocar podadora",
    brushable: false,
  },
  {
    id: "erase",
    label: "Borrar",
    icon: Trash2,
    description: "Borrar (césped)",
    brushable: true,
  },
];
