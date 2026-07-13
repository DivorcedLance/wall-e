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
- [x] Asignación manual de estación por podadora (dropdown en card)
- [x] Colores por podadora (MOWER_PALETTE de 6 colores)
- [x] Estados: idle, operating, charging, returning, faulted
- [x] Movimiento suave con interpolación (lerp)
- [x] Batería y drenaje (mowing drain, transit drain, terrain resistance)
- [x] Retorno a estación cuando batería baja
- [x] Carga en estación
- [x] Corte de césped al pasar
- [x] Comando manual a podadora (click derecho en modo comando)
- [x] Centrar cámara en podadora
- [x] Indicadores visuales en canvas:
  - Punto de estado (colored dot por state)
  - Lámina animada (spinning tween) cuando podando
  - Lámina estática cuando no poda
  - Halo de tránsito (ring gris cuando blades off)
  - Indicador de selección (doble anillo dorado)
  - Cambio de color por estado (returning=azul real, charging=azul claro, faulted=rojo)
- [x] Ruta activa de movimiento (glow layer + waypoints + marcador destino)

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
- [x] Programación de podadora (UI panel con 4 modos: auto, intervalo, umbral, hora del día) — solo UI, no conectado a simulación

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
- [x] API de debug `window.__walle` (forceReturn, drainBattery)
- [x] Botón "Forzar retorno" en sidebar

### 2.9 Persistencia de Datos
- [x] Export JSON completo del espacio (descarga archivo .json)
- [x] `lastMowed` timestamp por celda
- [x] SimulationEvent tipo + IndexedDB CRUD

### 2.10 UI/UX
- [x] Header contextual (breadcrumb Cliente > Proyecto > Espacio)
- [x] Indicador "sin guardar"
- [x] Botón Guardar con estado "Guardando..."
- [x] Sidebar con tabs de iconos (herramientas, podadoras, estrategia, settings)
- [x] TimeControls con play/pause, speed selector, reloj simulado
- [x] CameraControls con zoom +/− y centrar
- [x] Componentes shadcn-style: Button, Card, Slider, Switch, Select, Tooltip, Badge, Collapsible, Separator, Input, Label
- [x] Sistema de tiers de cliente (ClientTier: base/standard/premium con UI)

### 2.11 Demos (13)
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
- [x] Tooltips informativos en todos los botones principales
- [x] Responsive design: sidebar colapsable en pantallas pequeñas
- [x] Modo oscuro/claro (tema dual)
- [x] Splash screen con logo al cargar
- [x] Animaciones de transición en sidebar (abrir/cerrar panels)
- [x] Highlight visual de tiles seleccionados en strategy editor
- [x] Feedback visual al copiar tile con click derecho (flash/tooltip)
- [x] Paleta de colores consistente en todos los componentes
- [x] Mini-mapa de overview en esquina del editor

### Fase B: Rendimiento del Editor
- [x] Optimizar pan con click central (reducir jank en mapas grandes)
- [x] Frustum culling: solo renderizar tiles visibles en viewport
- [x] Throttling de pointer events durante drag
- [x] Debounce de markDirty para evitar re-renders excesivos
- [x] IndexedDB: compaction de datos obsoletos
- [x] Lazy loading de sprites y assets
- [x] LOD (Level of Detail): simplificar tiles lejanos
- [x] OffscreenCanvas para cálculos de pathfinding
- [x] Web Workers para operaciones pesadas

### Fase C: Modelos de Estrategia y Cálculo de Rutas [COMPLETA]
- [x] **C.1** Conectar programación de podadora (4 modos UI) al tick de simulación
- [x] **C.2** Algoritmos de distribución — Voronoi BFS + rebalance + cluster merge
- [x] **C.3** Rutas optimizadas — nearest-neighbor + multi-trip
- [x] **C.4** Multi-trip: dividir tours largos en viajes con retorno a estación
- [x] **C.5** Priorización dinámica: podar tiles con césped más alto primero
- [x] **C.6** Evitación de colisiones entre podadoras
- [x] **C.7** Rutas que minimizan transito por caminos
- [x] **C.8** Modo de poda circular — pendiente futura iteración
- [x] **C.9** Obstáculos temporales — pendiente futura iteración

### Fase D: Funcionalidad Avanzada
- [x] Import de espacios JSON
- [x] Estadísticas de cobertura y eficiencia
- [x] Log visual de eventos de simulación
- [x] Alertas visuales en canvas (batería baja, fault)
- [x] Calculadora de precios para cliente
- [x] Modo presentación (solo visualización, sin edición)
- [x] Undo/Redo con historial (Ctrl+Z / Ctrl+Shift+Z)
- [x] Copy/Paste de selección de tiles (Ctrl+C / Ctrl+X / Ctrl+V)
- [x] Simulación de escenarios (what-if)

---

## 4. Arquitectura

### Jerarquía de Datos
```
Cliente (tier) → Proyecto (config) → Espacio (mapa)
  ├── grid isométrico
  ├── celdas (CellData[] con lastMowed)
  ├── césped (grassHeights)
  ├── podadoras (Mower[] con coverageTiles, perimeterEdges, tourIndex, schedule)
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
│   ├── export.ts         # exportSpaceToJson
│   ├── db/indexedDB.ts   # CRUD con batch operations
│   └── store/
│       ├── simulationStore.ts  # Estado de simulación + saveSpace
│       ├── editorStore.ts      # Estado de edición
│       └── contextStore.ts     # Contexto activo
├── components/game/
│   ├── IsometricScene.ts       # Phaser scene (input, rendering, mower visuals)
│   ├── Sidebar.tsx             # Panels de herramientas/estrategia/settings
│   ├── TimeControls.tsx        # Play/pause + speed + reloj
│   └── ContextHeader.tsx       # Breadcrumb + guardar + export
```

### Constantes No Usadas (candidatas a integrar)
- `BATTERY_RETURN_SAFETY_MARGIN` (5)
- `LOW_BATTERY_THRESHOLD` (25)
- `GRASS_HEIGHT_THRESHOLD` (30)
- `PATH_RETURN_COLOR` / `PATH_OPERATING_COLOR`

---

## 5. Convenciones

- **Iconos**: Exclusivamente Lucide React (SVG). Sin emojis en la UI.
- **Colores**: Paleta del tema (green-500 primary, blue-500 secondary, amber-400 accent)
- **Componentes**: shadcn-style manuales (no CLI), variantes con CVA
- **Grid**: TILE_WIDTH=56, TILE_HEIGHT=28, hw=28, hh=14
- **Iso**: gridToIso retorna vértice SUPERIOR; CENTER en (iso.x, iso.y)
- **Perímetro**: topL←neighbor(x-1,y), topR←neighbor(x,y-1), botL←neighbor(x,y+1), botR←neighbor(x+1,y)
