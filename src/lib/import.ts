import type { CellType } from "@/lib/types";

interface ImportedSpace {
  name?: string;
  width?: number;
  height?: number;
  cells?: Array<{ x: number; y: number; type: CellType; grassHeight?: number }>;
  mowers?: Array<{ x: number; y: number; tier?: string }>;
  stations?: Array<{ x: number; y: number }>;
}

export function importSpaceFromJson(file: File): Promise<ImportedSpace> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.width || !data.height) {
          reject(new Error("El archivo no contiene un espacio válido (faltan width/height)"));
          return;
        }
        resolve(data as ImportedSpace);
      } catch {
        reject(new Error("No se pudo parsear el archivo JSON"));
      }
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsText(file);
  });
}
