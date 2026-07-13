# Plan: W.A.L.L.-E. — Editor Isométrico de Flotas de Podadoras

## 1. Visión General

Editor 100% offline para crear, editar y simular espacios verdes con flotas de podadoras autónomas. Mapas isométricos con grid, persistencia local, y simulación en tiempo real.

**Stack:**
- Next.js 15 (App Router)
- Zustand 5 (estado) + IndexedDB (persistencia)
- Phaser 3.80 (renderizado isométrico)
- Tailwind CSS 3.4 + shadcn-style components (manuales)
- TypeScript

---

## 2. Estado Actual — Completado

### 2.1 Infraestructura
- [x] Proyecto Next.js con App Router
- [x] Selector de contexto (Cliente → Proyecto → Espacio) con localStorage
- [x] IndexedDB con idb: clients, projects, spaces, mapCells, grassData, mowers, chargingStations, events
- [x] Guardado manual (Ctrl+S) con optimización por lotes y transacciones paralelas
- [x] Persistencia de contexto (last active client/project/space)

### 2.2 Editor Isométrico
- [x] Canvas Phaser 3 con grid isométrico (TILE_WIDTH=56, TILE_HEIGHT=28)
- [x] Tool palette con iconos Lucide (select, grass, path, flowers, building, obstacle, tree, water, gravel, sand, charging_station, empty, erase)
- [x] Pintura de celdas (click + drag brush rectangular)
- [x] Slider de altura de césped (0-100%)
- [x] Zoom 0.3x–3x (botones +/−)
- [x] Pan con drag (herramienta select) y click central
- [x] Click central cambia cursor a "grabbing" durante pan
- [x] Centro de mapa con botón
- [x] Centrar en podadora seleccionada
- [x] Grid toggle (show/hide)
- [x] Coordenadas toggle
- [x] Cluster de árboles (flood fill + cache)
- [x] Hover tooltip con coordenadas y tipo de celda
- [x] Bloqueo de ediciones durante guardado (saving state global)

### 2.3 Podadoras
- [x] Spawn de podadoras (herramienta mower)
- [x] Asignación 1:1 podadora ↔ estación (sorted position matching)
- [x] Colores por podadora (MOWER_PALETTE de 6 colores)
- [x] Estados: idle, operating, charging, returning, faulted
- [x] Movimiento suave con interpolación (lerp)
- [x] Batería y drenaje (mowing drain, transit drain, terrain resistance)
- [x] Retorno a estación cuando batería baja
- [x] Carga en estación
- [x] Corte de césped al pasar
- [x] Comando manual a podadora (click derecho en modo comando)
- [x] Centrar cámara en podadora

### 2.4 Simulación
- [x] Crecimiento de césped exponencial (slider logarítmico 0.01–100 %/s)
- [x] Time multiplier (1x, 2x, 5x, 10x, 50x, 100x)
- [x] Play/Pause
- [x] Simulador de tiempo (hora del día, día de la semana)
- [x] Reloj visible en barra inferior

### 2.5 Estrategia y Rutas
- [x] Asignación Voronoi de tiles a podadoras (nearest station)
- [x] Balanceo de zonas (max 1.5× promedio)
- [x] Ruta nearest-neighbor desde estación
- [x] Bordes de zona (perimeter edges) en vivo desde coverageTiles
- [x] Ruta visual (tour path conectando centros de tiles)
- [x] Editor de estrategia:
  - Modo tiles: click/drag para asignar/quitar tiles (alt=remove)
  - Modo path: click para agregar/quitar del orden
  - Transferencia de tiles entre podadoras
- [x] "Recalcular ruta" (selected mower) y "Recalcular todas las rutas" (all mowers, reordena tiles existentes)
- [x] "Recalcular estrategia" (reinicia Voronoi completo con initFleet)
- [x] Exportar estrategia (clipboard)

### 2.6 Pathfinding
- [x] A* con costos por terreno: grass=1.0, path=1.2, gravel=1.15, sand=1.5
- [x] Preferencia de césped sobre caminos al rodear obstáculos
- [x] Bloqueo: obstacle, building, tree, water, flowers, empty

### 2.7 Persistencia de Estrategia
- [x] `saveSpace` guarda mowers con coverageTiles, assignedStationId, perimeterEdges, color
- [x] Demos计算 estrategia al crear y guardan con mowers a IndexedDB
- [x] `loadSpace` detecta strategy stored → fleetInitialized=true

### 2.8 Interacción
- [x] Click central → pan con cursor "grabbing"
- [x] Click derecho en herramientas → copia tipo de tile al tool activo
- [x] Click derecho en strategy editor → selecciona podadora dueña del tile
- [x] Bloqueo de menú contextual del navegador en canvas

### 2.9 UI/UX
- [x] Header contextual (breadcrumb Cliente > Proyecto > Espacio)
- [x] Indicador "sin guardar"
- [x] Botón Guardar con estado "Guardando..."
- [x] Sidebar con tabs de iconos (herramientas, podadoras, estrategia, settings)
- [x] TimeControls con play/pause, speed selector, reloj simulado
- [x] CameraControls con zoom +/− y centrar
- [x] Componentes shadcn-style: Button, Card, Slider, Switch, Select, Tooltip, Badge, Collapsible, Separator, Input, Label

### 2.10 Demos (13)
| ID | Nombre | Tamaño | Podadoras |
|---|---|---|---|
| starter | Campo Abierto | 20×20 | 2 |
| grove | Arboleda Central | 18×18 | 2 |
| maze | Laberinto Verde | 22×22 | 3 |
| facility | Instalación Completa | 25×25 | 3 |
| small | Prueba Rápida | 8×8 | 1 |
| campus | Campus Universitario | 40×40 | 5 |
| estates | Residencial Premium | 35×35 | 4 |
| park | Parque Natural | 45×45 | 6 |
| japanese | Jardín Japonés | 25×25 | 2 |
| industrial | Zona Industrial | 30×30 | 3 |
| urban | Parque Urbano | 28×28 | 3 |
| farm | Finca Orgánica | 35×35 | 4 |
| sports | Complejo Deportivo | 32×32 | 4 |

---

## 3. Pendientes — Próximas Fases

### Fase A: Pulido de Interfaz Gráfica
- [ ] Animaciones de transición en sidebar (abrir/cerrar panels)
- [ ] Indicadores visuales de estado de podadora en canvas (batería, estado)
- [ ] Mini-mapa de overview en esquina del editor
- [ ] Highlight visual de tiles seleccionados en strategy editor
- [ ] Feedback visual al copiar tile con click derecho (flash/tooltip)
- [ ] Paleta de colores consistente en todos los componentes
- [ ] Tooltips informativos en todos los botones principales
- [ ] Responsive design: sidebar colapsable en pantallas pequeñas
- [ ] Modo oscuro/claro (tema dual)
- [ ] Splash screen con logo al cargar

### Fase B: Rendimiento del Editor
- [ ] Optimizar pan con click central (reducir jank en mapas grandes)
- [ ] Frustum culling: solo renderizar tiles visibles en viewport
- [ ] LOD (Level of Detail): simplificar tiles lejanos
- [ ] Throttling de pointer events durante drag
- [ ] OffscreenCanvas para cálculos de pathfinding
- [ ] Web Workers para operaciones pesadas (Voronoi, tour computation)
- [ ] Lazy loading de sprites y assets
- [ ] IndexedDB: compaction de datos obsoletos
- [ ] Debounce de markDirty para evitar re-renders excesivos

### Fase C: Modelos de Estrategia y Cálculo de Rutas
- [ ] Algoritmos de distribución alternativos:
  - [ ] Balanceo por área (no solo por cantidad de tiles)
  - [ ] Zonas compactas (minimizar perímetro compartido)
  - [ ] Distribución por carga de trabajo (tiles × frecuencia de corte)
- [ ] Rutas optimizadas:
  - [ ] TSP (Travelling Salesman Problem) con heurísticas
  - [ ] Rusticación de rutas (evitar zigzag innecesario)
  - [ ] Rutas que respetan dirección de corte (bandejas)
- [ ] Multi-trip: dividir tours largos en viajes con retorno a estación
- [ ] Priorización dinámica: podar césped más alto primero
- [ ] Evitación de colisiones entre podadoras
- [ ] Rutas que minimizan transito por caminos (ahorro de batería)
- [ ] Configuración de turnos de podadora (horarios por día)
- [ ] Modo de poda circular (espiral desde estación)
- [ ] Integración de obstáculos temporales (podadora averiada bloquea tile)

### Fase D: Funcionalidad Avanzada
- [ ] Undo/Redo con historial
- [ ] Copy/Paste de selección de tiles
- [ ] Import/Export de estrategias (JSON)
- [ ] Simulación de escenarios (what-if)
- [ ] Estadísticas de cobertura y eficiencia
- [ ] Alertas de batería baja y fallos
- [ ] Log de eventos de simulación
- [ ] Modo presentación (solo visualización, sin edición)

---

## 4. Arquitectura

### Jerarquía de Datos
```
Cliente → Proyecto (config) → Espacio (mapa)
  ├── grid isométrico
  ├── celdas (CellData[])
  ├── césped (grassHeights)
  ├── podadoras (Mower[] con coverageTiles, perimeterEdges, tourIndex)
  ├── estaciones (ChargingStation[])
  └── eventos (SimulationEvent[])
```

### Stores (Zustand)
- **contextStore**: clients[], projects[], spaces[], active IDs (persistido en localStorage)
- **editorStore**: tool, selectedCells, zoom, pan, showGrid, followMower, activeSidebarTab
- **simulationStore**: space, cells, grassHeights, mowers, stations, isPlaying, fleetInitialized, strategyEditing, saving, simulatedTimeMs, simulatedDay

### Archivos Clave
```
src/
├── lib/
│   ├── fleet.ts          # assignStationsToMowers, computeCoverageTours
│   ├── pathfinding.ts    # A* con costos por terreno
│   ├── demos.ts          # 13 definiciones de demo
│   ├── db/indexedDB.ts   # CRUD con batch operations
│   └── store/
│       ├── simulationStore.ts  # Estado de simulación + saveSpace
│       ├── editorStore.ts      # Estado de edición
│       └── contextStore.ts     # Contexto activo
├── components/game/
│   ├── IsometricScene.ts       # Phaser scene (input, rendering)
│   ├── Sidebar.tsx             # Panels de herramientas/estrategia/settings
│   ├── TimeControls.tsx        # Play/pause + speed + reloj
│   └── ContextHeader.tsx       # Breadcrumb + guardar
```

---

## 5. Convenciones

- **Iconos**: Exclusivamente Lucide React (SVG). Sin emojis en la UI.
- **Colores**: Paleta del tema (green-500 primary, blue-500 secondary, amber-400 accent)
- **Componentes**: shadcn-style manuales (no CLI), variantes con CVA
- **Grid**: TILE_WIDTH=56, TILE_HEIGHT=28, hw=28, hh=14
- **Iso**: gridToIso retorna vértice SUPERIOR; CENTER en (iso.x, iso.y)
- **Perímetro**: topL←neighbor(x-1,y), topR←neighbor(x,y-1), botL←neighbor(x,y+1), botR←neighbor(x+1,y)
