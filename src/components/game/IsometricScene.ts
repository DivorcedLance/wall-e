"use client";

import * as Phaser from "phaser";
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  GRASS_COLOR_LIGHT,
  GRASS_COLOR_MID,
  GRASS_COLOR_DARK,
  PATH_COLOR,
  FLOWERS_COLOR,
  BUILDING_COLOR,
  OBSTACLE_COLOR,
  TREE_COLOR,
  WATER_COLOR,
  GRAVEL_COLOR,
  SAND_COLOR,
  EMPTY_COLOR,
  CHARGING_COLOR,
  PATH_RETURN_COLOR,
  PATH_OPERATING_COLOR,
} from "@/lib/constants";
import { gridToIso, isoToGrid } from "@/lib/iso";
import { findAllClusters, clusterBounds } from "@/lib/pathfinding";
import { useEditorStore } from "@/lib/store/editorStore";
import { useSimulationStore } from "@/lib/store/simulationStore";
import { clamp } from "@/lib/utils";
import type { CellData, CellType, Mower } from "@/lib/types";

function hex(c: string): number {
  return parseInt(c.replace("#", ""), 16);
}

const COLOR_MAP: Record<CellType, number> = {
  grass: hex(GRASS_COLOR_MID),
  path: hex(PATH_COLOR),
  flowers: hex(FLOWERS_COLOR),
  building: hex(BUILDING_COLOR),
  obstacle: hex(OBSTACLE_COLOR),
  tree: hex(TREE_COLOR),
  water: hex(WATER_COLOR),
  gravel: hex(GRAVEL_COLOR),
  sand: hex(SAND_COLOR),
  charging_station: hex(CHARGING_COLOR),
  empty: hex(EMPTY_COLOR),
};

const TILE_DEPTH = 6;

const EDITOR_TOOLS = new Set([
  "grass", "path", "flowers", "building", "obstacle", "tree",
  "water", "gravel", "sand", "empty", "erase",
]);

function grassColorForHeight(height: number): { fill: number; accent: number } {
  // Use the pleasant green (#22c55e) as the base for all heights.
  // Taller grass gets a slightly darker shade.
  if (height < 50) return { fill: hex(GRASS_COLOR_MID), accent: hex("#16a34a") };
  if (height < 75) return { fill: hex("#15803d"), accent: hex("#14532d") };
  return { fill: hex(GRASS_COLOR_DARK), accent: hex("#052e16") };
}

function dim(color: number, amount: number): number {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) - amount));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) - amount));
  const b = Math.max(0, Math.min(255, (color & 0xff) - amount));
  return (r << 16) | (g << 8) | b;
}

function bright(color: number, amount: number): number {
  return dim(color, -amount);
}

interface PhaserBridge {
  paintAt: (x: number, y: number) => void;
  paintRect: (x0: number, y0: number, x1: number, y1: number) => void;
  getCellAt: (worldX: number, worldY: number) => { x: number; y: number } | null;
  centerView: () => void;
  centerOnMower: (id: string) => void;
}

declare global {
  interface WindowEventMap {
    "walle:center-mower": CustomEvent<{ id: string }>;
    "walle:command-mode": CustomEvent<{ on: boolean }>;
  }
}

export class IsometricScene extends Phaser.Scene {
  private mapContainer!: Phaser.GameObjects.Container;
  private treeClusterContainer!: Phaser.GameObjects.Container;
  private overlayContainer!: Phaser.GameObjects.Container;
  private entityContainer!: Phaser.GameObjects.Container;
  private uiContainer!: Phaser.GameObjects.Container;
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private treeClusterGraphics!: Phaser.GameObjects.Graphics;
  private tooltipText!: Phaser.GameObjects.Text;
  private tooltipBg!: Phaser.GameObjects.Rectangle;
  private mowerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private stationSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private hoverCell: { x: number; y: number } | null = null;
  private isPainting = false;
  private paintStart: { x: number; y: number } | null = null;
  private isPanning = false;
  private panStart: { x: number; y: number } | null = null;
  private camStart: { x: number; y: number } | null = null;
  private unsub?: () => void;
  private unsubSim?: () => void;
  private unsubMowerId?: () => void;
  private lastVersion = -1;
  private treeClusterCacheKey = "";
  private lastZoom = 1;
  private lastShowGrid = true;
  private width = 0;
  private height = 0;
  private bridge?: PhaserBridge;
  private commandMode = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastCursorStyle = "default";

  constructor() {
    super({ key: "IsometricScene" });
  }

  init() {
    this.cameras.main.setBackgroundColor("#0a0e1a");
  }

  create() {
    this.mapContainer = this.add.container(0, 0);
    this.mapGraphics = this.add.graphics();
    this.mapContainer.add(this.mapGraphics);
    this.treeClusterContainer = this.add.container(0, 0);
    this.treeClusterGraphics = this.add.graphics();
    this.treeClusterContainer.add(this.treeClusterGraphics);
    this.overlayContainer = this.add.container(0, 0);
    this.overlayGraphics = this.add.graphics();
    this.overlayContainer.add(this.overlayGraphics);
    this.pathGraphics = this.add.graphics();
    this.overlayContainer.add(this.pathGraphics);
    this.entityContainer = this.add.container(0, 0);
    this.uiContainer = this.add.container(0, 0);

    // Tooltip (screen-space, not affected by camera transform)
    this.tooltipBg = this.add
      .rectangle(0, 0, 80, 22, 0x0f172a, 0.92)
      .setStrokeStyle(1, 0x1e293b)
      .setOrigin(0, 0)
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(1000);
    this.tooltipText = this.add
      .text(0, 0, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f8fafc",
      })
      .setOrigin(0, 0)
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(1001);

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("pointerdownoutside", this.handlePointerUp, this);
    this.input.on("wheel", this.handleWheel, this);
    (this.game.canvas as HTMLCanvasElement).addEventListener("contextmenu", (e) => e.preventDefault());

    this.scale.on("resize", this.handleResize, this);

    this.bridge = {
      paintAt: (x, y) => this.applyPaint(x, y),
      paintRect: (x0, y0, x1, y1) => this.applyPaintRect(x0, y0, x1, y1),
      getCellAt: (worldX, worldY) => this.worldToCell(worldX, worldY),
      centerView: () => this.centerCameraOnMap(),
      centerOnMower: (id) => this.centerOnMower(id),
    };
    (this.game as Phaser.Game & { bridge?: PhaserBridge }).bridge = this.bridge;
    this.game.events.emit("bridge-ready", this.bridge);

    this.unsubscribeAll();
    this.unsub = useEditorStore.subscribe(() => this.markDirty());
    this.unsubSim = useSimulationStore.subscribe(() => this.markDirty());
    this.lastVersion = -1;
    this.handleResize();
    this.refreshFromStore();

    window.addEventListener("walle:center-mower", this.onCenterMowerEvent);
    window.addEventListener("walle:command-mode", this.onCommandModeEvent);
  }

  private unsubscribeAll() {
    this.unsub?.();
    this.unsub = undefined;
    this.unsubSim?.();
    this.unsubSim = undefined;
  }

  private onCenterMowerEvent = (e: CustomEvent<{ id: string }>) => {
    this.centerOnMower(e.detail.id);
  };

  private onCommandModeEvent = (e: CustomEvent<{ on: boolean }>) => {
    this.commandMode = e.detail.on;
  };

  private markDirty() {
    this.refreshFromStore();
  }

  private refreshFromStore() {
    if (!this.entityContainer) return;
    const sim = useSimulationStore.getState();
    const editor = useEditorStore.getState();
    if (!sim.space) return;
    const isFirstLoad = this.lastVersion === -1;
    const showGridChanged = editor.showGrid !== this.lastShowGrid;
    if (sim.version === this.lastVersion && editor.zoom === this.lastZoom && !showGridChanged) {
      this.applyEditorState();
      this.drawHover();
      return;
    }
    this.lastVersion = sim.version;
    this.lastZoom = editor.zoom;
    this.lastShowGrid = editor.showGrid;
    this.width = sim.space.width;
    this.height = sim.space.height;
    this.redrawMap();
    this.updateTreeClusters(true);
    this.updateEntities();
    this.updatePaths();
    this.drawHover();
    if (isFirstLoad) {
      this.centerCameraOnMap();
    } else {
      this.applyCamera();
    }
  }

  private applyEditorState() {
    const editor = useEditorStore.getState();
    if (editor.zoom !== this.lastZoom) {
      this.lastZoom = editor.zoom;
      this.applyCamera();
    }
  }

  private applyCamera() {
    const editor = useEditorStore.getState();
    const cam = this.cameras.main;
    cam.setZoom(editor.zoom);
    cam.setScroll(editor.panX, editor.panY);
  }

  private centerCameraOnMap() {
    const sim = useSimulationStore.getState();
    if (!sim.space) return;
    const w = sim.space.width;
    const h = sim.space.height;
    const center = gridToIso(w / 2 - 0.5, h / 2 - 0.5);
    const cam = this.cameras.main;
    // Use the actual camera viewport dimensions, not this.scale which may
    // not be updated yet during initial load.
    const viewW = cam.width || this.scale.width;
    const viewH = cam.height || this.scale.height;
    const zoom = 1;
    useEditorStore.getState().setZoom(zoom);
    const panX = center.x * zoom - viewW / 2;
    const panY = center.y * zoom - viewH / 2;
    useEditorStore.getState().setPan(panX, panY);
    cam.setZoom(zoom);
    cam.setScroll(panX, panY);
    this.lastZoom = zoom;
  }

  private centerOnMower(id: string) {
    const sim = useSimulationStore.getState();
    const mower = sim.mowers.find((m) => m.id === id);
    if (!mower) return;
    const target = gridToIso(mower.x, mower.y);
    const cam = this.cameras.main;
    const viewW = cam.width || this.scale.width;
    const viewH = cam.height || this.scale.height;
    const zoom = Math.max(cam.zoom, 1.2);
    const panX = target.x * zoom - viewW / 2;
    const panY = (target.y - 16) * zoom - viewH / 2;
    useEditorStore.getState().setZoom(zoom);
    useEditorStore.getState().setPan(panX, panY);
    cam.setZoom(zoom);
    cam.setScroll(panX, panY);
    this.lastZoom = zoom;
  }

  private drawTile(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    fill: number,
    depth = TILE_DEPTH,
  ) {
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;
    // Sides (depth)
    if (depth > 0) {
      const left = dim(fill, 60);
      const right = dim(fill, 30);
      // Right face
      g.fillStyle(right, 1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + hw, cy + hh);
      g.lineTo(cx + hw, cy + hh + depth);
      g.lineTo(cx, cy + depth);
      g.closePath();
      g.fillPath();
      // Left face
      g.fillStyle(left, 1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx - hw, cy + hh);
      g.lineTo(cx - hw, cy + hh + depth);
      g.lineTo(cx, cy + depth);
      g.closePath();
      g.fillPath();
    }
    // Top face
    g.fillStyle(fill, 1);
    g.beginPath();
    g.moveTo(cx, cy - hh);
    g.lineTo(cx + hw, cy);
    g.lineTo(cx, cy + hh);
    g.lineTo(cx - hw, cy);
    g.closePath();
    g.fillPath();
  }

  private redrawMap() {
    if (!this.cameras?.main) {
      console.warn("[IsometricScene] redrawMap skipped: cameras.main is undefined", {
        cameras: this.cameras,
        hasMapGraphics: !!this.mapGraphics,
        hasEntityContainer: !!this.entityContainer,
      });
      return;
    }
    const sim = useSimulationStore.getState();
    if (!sim.space) return;
    const g = this.mapGraphics;
    g.clear();
    const showGrid = useEditorStore.getState().showGrid;
    const zoom = this.cameras.main.zoom;
    const lodLevel = zoom < 0.5 ? 2 : zoom < 0.8 ? 1 : 0;
    for (let y = 0; y < sim.space.height; y++) {
      for (let x = 0; x < sim.space.width; x++) {
        const cell = sim.cells.get(`${x},${y}`);
        if (!cell) continue;
        const pos = gridToIso(x, y);
        const cx = pos.x;
        const cy = pos.y;
        if (cell.type === "empty") {
          const isDark = document.documentElement.classList.contains("dark");
          g.fillStyle(isDark ? 0x050810 : 0xf1f5f9, 1);
          g.beginPath();
          g.moveTo(cx, cy - TILE_HEIGHT / 2);
          g.lineTo(cx + TILE_WIDTH / 2, cy);
          g.lineTo(cx, cy + TILE_HEIGHT / 2);
          g.lineTo(cx - TILE_WIDTH / 2, cy);
          g.closePath();
          g.fillPath();
          if (lodLevel < 2) {
            g.lineStyle(1, 0x1e293b, 0.5);
            g.strokePath();
          }
          continue;
        }
        let fill: number;
        if (cell.type === "grass") {
          fill = grassColorForHeight(cell.grassHeight ?? 0).fill;
        } else {
          fill = COLOR_MAP[cell.type];
        }
        this.drawTile(g, cx, cy, fill);
        // LOD: skip textures at low zoom
        if (lodLevel >= 2) continue;
        // Texture / accent for certain types
        if (cell.type === "grass" && (cell.grassHeight ?? 0) > 0) {
          if (lodLevel >= 1) continue;
          const accent = grassColorForHeight(cell.grassHeight ?? 0).accent;
          g.fillStyle(accent, 0.25);
          const hw = TILE_WIDTH / 2 - 8;
          g.fillEllipse(cx, cy, hw * 1.2, TILE_HEIGHT * 0.6);
        } else if (cell.type === "water") {
          g.lineStyle(1, bright(fill, 40), 0.6);
          g.beginPath();
          g.moveTo(cx - 12, cy - 2);
          g.lineTo(cx + 12, cy - 2);
          g.moveTo(cx - 10, cy + 4);
          g.lineTo(cx + 10, cy + 4);
          g.strokePath();
        } else if (cell.type === "path") {
          g.fillStyle(dim(fill, 30), 0.4);
          for (let i = 0; i < 4; i++) {
            g.fillCircle(cx - 10 + i * 7, cy - 3 + (i % 2) * 2, 0.8);
          }
        } else if (cell.type === "flowers") {
          g.fillStyle(0xfde047, 0.9);
          g.fillCircle(cx - 6, cy - 2, 1.6);
          g.fillStyle(0xf472b6, 0.9);
          g.fillCircle(cx + 6, cy - 2, 1.6);
          g.fillStyle(0xa855f7, 0.9);
          g.fillCircle(cx, cy + 4, 1.6);
        } else if (cell.type === "gravel") {
          g.fillStyle(dim(fill, 40), 0.7);
          g.fillCircle(cx - 6, cy - 3, 1.2);
          g.fillCircle(cx + 4, cy + 3, 1.2);
          g.fillCircle(cx - 2, cy + 5, 1);
          g.fillCircle(cx + 7, cy - 5, 1);
        } else if (cell.type === "sand") {
          g.fillStyle(bright(fill, 20), 0.4);
          g.fillEllipse(cx, cy, TILE_WIDTH * 0.5, TILE_HEIGHT * 0.4);
        } else if (cell.type === "building") {
          g.fillStyle(bright(fill, 25), 0.4);
          g.fillRect(cx - 10, cy - 6, 20, 12);
          g.fillStyle(0xfbbf24, 0.6);
          g.fillRect(cx - 3, cy - 4, 2, 3);
          g.fillRect(cx + 1, cy - 4, 2, 3);
        } else if (cell.type === "obstacle") {
          g.fillStyle(dim(fill, 50), 0.6);
          g.fillTriangle(cx - 8, cy + 4, cx + 8, cy + 4, cx, cy - 8);
        }
        if (showGrid) {
          const isDark = document.documentElement.classList.contains("dark");
          g.lineStyle(1, isDark ? 0x0a0e1a : 0xcbd5e1, 0.35);
          g.beginPath();
          g.moveTo(cx, cy - TILE_HEIGHT / 2);
          g.lineTo(cx + TILE_WIDTH / 2, cy);
          g.lineTo(cx, cy + TILE_HEIGHT / 2);
          g.lineTo(cx - TILE_WIDTH / 2, cy);
          g.closePath();
          g.strokePath();
        }
      }
    }
  }

  private updateTreeClusters(force: boolean) {
    const sim = useSimulationStore.getState();
    if (!sim.space) return;
    const g = this.treeClusterGraphics;
    const cacheKey = `tree:${sim.version}:${this.width}x${this.height}`;
    if (!force && cacheKey === this.treeClusterCacheKey) return;
    this.treeClusterCacheKey = cacheKey;
    g.clear();
    const clusters = findAllClusters(sim.cells, this.width, this.height, "tree");
    for (const cluster of clusters) {
      if (cluster.length === 0) continue;
      const bounds = clusterBounds(cluster);
      const center = gridToIso(bounds.cx, bounds.cy);
      const cx = center.x;
      const cy = center.y;
      const size = cluster.length > 4 ? 1.5 : 1;
      const baseY = cy - 2;
      // Trunk shadow on the ground
      g.fillStyle(0x052e16, 0.35);
      g.fillEllipse(cx, cy + 2, 22 * size, 10);
      // Trunk
      g.fillStyle(hex("#78350f"), 1);
      g.fillRect(cx - 3 * size, baseY - 6 * size, 6 * size, 10 * size);
      g.lineStyle(1, hex("#451a03"), 1);
      g.strokeRect(cx - 3 * size, baseY - 6 * size, 6 * size, 10 * size);
      // Canopy layers (back to front)
      g.fillStyle(hex("#166534"), 1);
      g.fillCircle(cx - 8 * size, baseY - 12 * size, 11 * size);
      g.fillCircle(cx + 8 * size, baseY - 12 * size, 11 * size);
      g.fillStyle(hex("#22c55e"), 1);
      g.fillCircle(cx, baseY - 18 * size, 14 * size);
      g.fillStyle(hex("#4ade80"), 1);
      g.fillCircle(cx - 3 * size, baseY - 22 * size, 7 * size);
      g.fillCircle(cx + 5 * size, baseY - 16 * size, 6 * size);
    }
  }

  private visualPosition(mower: Mower): { x: number; y: number } {
    const t = clamp(mower.moveT, 0, 1);
    const fx = mower.fromX + (mower.x - mower.fromX) * t;
    const fy = mower.fromY + (mower.y - mower.fromY) * t;
    const iso = gridToIso(fx, fy);
    return { x: iso.x, y: iso.y - 12 };
  }

  private updateEntities() {
    const sim = useSimulationStore.getState();
    if (!sim.space) return;
    if (!this.entityContainer) return;
    const seen = new Set<string>();
    for (const mower of sim.mowers) {
      seen.add(mower.id);
      let sprite = this.mowerSprites.get(mower.id);
      if (!sprite) {
        sprite = this.createMowerSprite(mower);
        this.entityContainer.add(sprite);
        this.mowerSprites.set(mower.id, sprite);
      }
      const pos = this.visualPosition(mower);
      sprite.setPosition(pos.x, pos.y);
      this.updateMowerSprite(sprite, mower);
    }
    for (const [id, sprite] of this.mowerSprites) {
      if (!seen.has(id)) {
        sprite.destroy();
        this.mowerSprites.delete(id);
      }
    }
    const seenStations = new Set<string>();
    for (const station of sim.stations) {
      seenStations.add(station.id);
      let sprite = this.stationSprites.get(station.id);
      if (!sprite) {
        sprite = this.createStationSprite();
        this.entityContainer.add(sprite);
        this.stationSprites.set(station.id, sprite);
      }
      const target = gridToIso(station.x, station.y);
      sprite.setPosition(target.x, target.y - 2);
    }
    for (const [id, sprite] of this.stationSprites) {
      if (!seenStations.has(id)) {
        sprite.destroy();
        this.stationSprites.delete(id);
      }
    }
  }

  private createMowerSprite(_mower: Mower): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const shadow = this.add.ellipse(0, 6, 22, 8, 0x000000, 0.35);
    const body = this.add.graphics();
    const top = this.add.graphics();
    const blade = this.add.graphics();
    const indicator = this.add.graphics();
    const statusLight = this.add.graphics();
    container.add([shadow, body, blade, top, statusLight, indicator]);
    container.setData("shadow", shadow);
    container.setData("body", body);
    container.setData("top", top);
    container.setData("blade", blade);
    container.setData("indicator", indicator);
    container.setData("statusLight", statusLight);
    container.setSize(32, 32);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-16, -16, 32, 32),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) return;
      const sim = useSimulationStore.getState();
      sim.setSelectedMower((container as Phaser.GameObjects.Container & { mowerId?: string }).mowerId!);
    });
    return container;
  }

  private updateMowerSprite(
    container: Phaser.GameObjects.Container,
    mower: Mower,
  ) {
    if (!container.scene) return; // sprite was destroyed
    const c = container as Phaser.GameObjects.Container & { mowerId?: string };
    c.mowerId = mower.id;
    const sim = useSimulationStore.getState();
    const selected = sim.selectedMowerId === mower.id;
    const body = container.getData("body") as Phaser.GameObjects.Graphics;
    const top = container.getData("top") as Phaser.GameObjects.Graphics;
    const blade = container.getData("blade") as Phaser.GameObjects.Graphics;
    const indicator = container.getData("indicator") as Phaser.GameObjects.Graphics;
    const statusLight = container.getData(
      "statusLight",
    ) as Phaser.GameObjects.Graphics;
    const shadow = container.getData("shadow") as Phaser.GameObjects.Ellipse;
    if (!body || !top || !blade || !indicator || !statusLight) return;
    body.clear();
    top.clear();
    blade.clear();
    indicator.clear();
    statusLight.clear();

    // Determine if the mower is currently mowing grass or transiting over
    // a hard surface. Mowers on grass have the blades on; everywhere else
    // (path, gravel, sand, flowers, charging_station) the blades are off.
    const cellHere = sim.cells.get(`${mower.x},${mower.y}`);
    const isMowing =
      mower.status === "operating" && cellHere?.type === "grass";

    // Body color: returning mowers get royal blue (reserved), charging gets
    // a lighter blue, otherwise the mower's assigned fleet color.
    const baseColor = mower.color ?? 0x22c55e;
    const bodyColor =
      mower.status === "returning"
        ? 0x1e40af // royal blue — reserved for returning
        : mower.status === "charging"
          ? 0x60a5fa
          : mower.status === "faulted"
            ? 0xef4444
            : baseColor;
    const dark = dim(bodyColor, 70);
    const light = bright(bodyColor, 30);
    // Body
    body.fillStyle(dark, 1);
    body.fillRoundedRect(-11, -6, 22, 12, 3);
    body.fillStyle(bodyColor, 1);
    body.fillRoundedRect(-10, -8, 20, 8, 2.5);
    // Top accent
    top.fillStyle(light, 1);
    top.fillRoundedRect(-8, -7, 16, 2, 1);
    // Status light
    statusLight.fillStyle(0xfafafa, 1);
    statusLight.fillCircle(6, -4, 1.6);
    statusLight.fillStyle(
      mower.status === "charging"
        ? 0xfbbf24
        : mower.status === "returning"
          ? 0x1e40af
          : baseColor,
      1,
    );
    statusLight.fillCircle(6, -4, 1);
    // Blade — only rendered when actively mowing. Outside of grass the
    // blades are off and the tween should not be playing, which we handle
    // by clearing the tween target's rotation/alpha each frame.
    const bladeTweenKey = "bladeSpin";
    const hasBladeTween = this.tweens.getTweensOf(blade).some(
      (t) => (t as Phaser.Tweens.Tween & { key?: string }).key === bladeTweenKey,
    );
    if (isMowing) {
      blade.setAlpha(1);
      blade.lineStyle(1, 0x94a3b8, 0.85);
      blade.beginPath();
      blade.moveTo(0, -8);
      blade.lineTo(0, -12);
      blade.strokePath();
      blade.lineStyle(1.5, 0xcbd5e1, 1);
      blade.fillStyle(0xe2e8f0, 1);
      blade.fillCircle(0, -13, 2.5);
      if (!hasBladeTween) {
        this.tweens.add({
          targets: blade,
          rotation: Math.PI * 2,
          duration: 350,
          repeat: -1,
          key: bladeTweenKey,
        });
      }
    } else {
      this.tweens.killTweensOf(blade);
      blade.setAlpha(0.25);
      blade.rotation = 0;
      // Show a small folded blade as a static line so the mower still
      // looks like a mower, just with the blades tucked up.
      blade.lineStyle(1.2, 0x64748b, 0.6);
      blade.beginPath();
      blade.moveTo(-3, -9);
      blade.lineTo(3, -9);
      blade.strokePath();
    }
    // Transit halo: a small gray ring underneath the mower whenever the
    // blades are off, signalling "fuera del cesped, en transito".
    if (!isMowing && mower.status !== "charging") {
      indicator.lineStyle(1, 0x94a3b8, 0.45);
      indicator.strokeCircle(0, 0, 13);
    }
    // Selection indicator
    if (selected) {
      indicator.lineStyle(2, 0xfbbf24, 0.9);
      indicator.strokeCircle(0, 0, 16);
      indicator.lineStyle(1, 0xfbbf24, 0.35);
      indicator.strokeCircle(0, 0, 20);
    }
    // Low battery / fault alerts
    if (mower.status === "faulted") {
      const alertY = -22;
      indicator.fillStyle(0xef4444, 1);
      indicator.fillTriangle(0, alertY - 5, -4, alertY + 3, 4, alertY + 3);
      indicator.fillStyle(0xffffff, 1);
      indicator.fillRect(-0.5, alertY - 2, 1, 3);
      indicator.fillRect(-0.5, alertY + 0.5, 1, 1);
    } else if (mower.battery <= 20) {
      const alertY = -22;
      const pulseAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 200);
      indicator.fillStyle(0xfbbf24, pulseAlpha);
      indicator.fillTriangle(0, alertY - 5, -4, alertY + 3, 4, alertY + 3);
      indicator.fillStyle(0x000000, 0.8);
      indicator.fillRect(-0.5, alertY - 1, 1, 3);
      indicator.fillRect(-1, alertY + 2, 2, 1);
    }
    shadow.setVisible(true);
  }

  private createStationSprite(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const shadow = this.add.ellipse(0, 8, 24, 8, 0x000000, 0.35);
    const pad = this.add.graphics();
    const ring = this.add.graphics();
    const bolt = this.add.graphics();
    container.add([shadow, pad, ring, bolt]);
    container.setData("pad", pad);
    container.setData("ring", ring);
    container.setData("bolt", bolt);
    pad.fillStyle(0x1e293b, 1);
    pad.fillRoundedRect(-10, -10, 20, 20, 3);
    pad.lineStyle(1, 0xfbbf24, 1);
    pad.strokeRoundedRect(-10, -10, 20, 20, 3);
    pad.fillStyle(0xfbbf24, 0.15);
    pad.fillCircle(0, 0, 7);
    ring.lineStyle(2, 0x3b82f6, 0.5);
    ring.strokeCircle(0, 0, 12);
    bolt.fillStyle(0xfbbf24, 1);
    bolt.beginPath();
    bolt.moveTo(-2, -5);
    bolt.lineTo(2, -1);
    bolt.lineTo(-1, 0);
    bolt.lineTo(2, 5);
    bolt.lineTo(-2, 1);
    bolt.lineTo(1, 0);
    bolt.closePath();
    bolt.fillPath();
    this.tweens.add({
      targets: ring,
      scale: 1.4,
      alpha: 0,
      duration: 1200,
      repeat: -1,
    });
    return container;
  }

  private updatePaths() {
    const sim = useSimulationStore.getState();
    if (!this.pathGraphics) return;
    const g = this.pathGraphics;
    g.clear();
    if (!sim.space) return;

    // Draw active paths for all mowers (current movement segment)
    for (const mower of sim.mowers) {
      if (mower.path.length < mower.pathIndex + 1) continue;
      const colorNum = mower.status === "returning"
        ? 0x1e40af
        : (mower.color ?? 0xfbbf24);
      const start = this.visualPosition(mower);
      // Outer glow
      g.lineStyle(6, colorNum, 0.18);
      g.beginPath();
      g.moveTo(start.x, start.y);
      const first = mower.path[mower.pathIndex];
      if (first) {
        const fp = gridToIso(first.x, first.y);
        g.lineTo(fp.x, fp.y - 12);
        for (let i = mower.pathIndex + 1; i < mower.path.length; i++) {
          const p = gridToIso(mower.path[i].x, mower.path[i].y);
          g.lineTo(p.x, p.y - 12);
        }
      }
      g.strokePath();
      // Main line
      g.lineStyle(2.5, colorNum, 0.85);
      g.beginPath();
      g.moveTo(start.x, start.y);
      if (first) {
        const fp = gridToIso(first.x, first.y);
        g.lineTo(fp.x, fp.y - 12);
        for (let i = mower.pathIndex + 1; i < mower.path.length; i++) {
          const p = gridToIso(mower.path[i].x, mower.path[i].y);
          g.lineTo(p.x, p.y - 12);
        }
      }
      g.strokePath();
      // Waypoint markers
      for (let i = mower.pathIndex; i < mower.path.length; i++) {
        const p = gridToIso(mower.path[i].x, mower.path[i].y);
        const isLast = i === mower.path.length - 1;
        const radius = isLast ? 5 : 2.5;
        g.fillStyle(colorNum, isLast ? 0.95 : 0.55);
        g.fillCircle(p.x, p.y - 12, radius);
        if (isLast) {
          g.lineStyle(1.5, 0xffffff, 0.6);
          g.strokeCircle(p.x, p.y - 12, radius + 1);
        }
      }
    }
  }

  private worldToCell(
    worldX: number,
    worldY: number,
  ): { x: number; y: number } | null {
    const cell = isoToGrid(worldX, worldY);
    if (cell.x < 0 || cell.y < 0 || cell.x >= this.width || cell.y >= this.height) {
      return null;
    }
    return cell;
  }

  private showTooltip(cell: { x: number; y: number }, sx: number, sy: number) {
    const sim = useSimulationStore.getState();
    const data = sim.cells.get(`${cell.x},${cell.y}`);
    if (!data) {
      this.tooltipBg.setVisible(false);
      this.tooltipText.setVisible(false);
      return;
    }
    const lines: string[] = [`(${cell.x}, ${cell.y})`, data.type];
    if (data.type === "grass") {
      const h = Math.round(sim.grassHeights.get(`${cell.x},${cell.y}`) ?? data.grassHeight);
      lines.push(`altura: ${h}%`);
    }
    const text = lines.join(" · ");
    this.tooltipText.setText(text);
    const bounds = this.tooltipText.getBounds();
    const w = bounds.width + 14;
    const h = bounds.height + 8;
    this.tooltipBg.setSize(w, h);
    this.tooltipBg.setPosition(sx + 12, sy + 12);
    this.tooltipText.setPosition(sx + 19, sy + 16);
    this.tooltipBg.setVisible(true);
    this.tooltipText.setVisible(true);
  }

  private hideTooltip() {
    this.tooltipBg.setVisible(false);
    this.tooltipText.setVisible(false);
  }

  private drawHover() {
    const g = this.overlayGraphics;
    g.clear();

    const sim = useSimulationStore.getState();
    const editor = useEditorStore.getState();
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;

    // Helper: draw a mower's zone fill + perimeter edges (computed live from tiles)
    const drawMowerZone = (mower: Mower, alpha: number) => {
      const colorNum = mower.color ?? 0x22c55e;
      const tiles = mower.coverageTiles ?? [];
      if (tiles.length === 0) return;
      // Zone fill
      g.fillStyle(colorNum, 0.06 * alpha);
      for (const t of tiles) {
        const p = gridToIso(t.x, t.y);
        g.beginPath();
        g.moveTo(p.x, p.y - hh);
        g.lineTo(p.x + hw, p.y);
        g.lineTo(p.x, p.y + hh);
        g.lineTo(p.x - hw, p.y);
        g.closePath();
        g.fillPath();
      }
      // Compute perimeter edges live from current tiles
      const tileSet = new Set(tiles.map((t) => `${t.x},${t.y}`));
      g.lineStyle(2.5, colorNum, 0.6 * alpha);
      for (const t of tiles) {
        const iso = gridToIso(t.x, t.y);
        const cx = iso.x;
        const cy = iso.y;
        const vTop = { x: cx, y: cy - hh };
        const vRight = { x: cx + hw, y: cy };
        const vBottom = { x: cx, y: cy + hh };
        const vLeft = { x: cx - hw, y: cy };
        if (!tileSet.has(`${t.x - 1},${t.y}`)) {
          g.beginPath(); g.moveTo(vLeft.x, vLeft.y); g.lineTo(vTop.x, vTop.y); g.strokePath();
        }
        if (!tileSet.has(`${t.x},${t.y - 1}`)) {
          g.beginPath(); g.moveTo(vTop.x, vTop.y); g.lineTo(vRight.x, vRight.y); g.strokePath();
        }
        if (!tileSet.has(`${t.x},${t.y + 1}`)) {
          g.beginPath(); g.moveTo(vBottom.x, vBottom.y); g.lineTo(vLeft.x, vLeft.y); g.strokePath();
        }
        if (!tileSet.has(`${t.x + 1},${t.y}`)) {
          g.beginPath(); g.moveTo(vRight.x, vRight.y); g.lineTo(vBottom.x, vBottom.y); g.strokePath();
        }
      }
    };

    // Helper: draw a mower's full tour route through tile CENTERS
    const drawMowerTour = (mower: Mower) => {
      const colorNum = mower.color ?? 0x22c55e;
      const st = sim.stations.find((s) => s.id === mower.assignedStationId);
      if (!st || !mower.coverageTiles || mower.coverageTiles.length === 0) return;
      // gridToIso returns the TOP vertex. The CENTER is at (iso.x, iso.y).
      g.lineStyle(3, colorNum, 0.7);
      g.beginPath();
      const sp = gridToIso(st.x, st.y);
      g.moveTo(sp.x, sp.y); // center of station tile
      for (const t of mower.coverageTiles) {
        const tp = gridToIso(t.x, t.y);
        g.lineTo(tp.x, tp.y); // center of tile
      }
      g.lineTo(sp.x, sp.y); // back to station center
      g.strokePath();
      // Draw dots at each tile center
      for (const t of mower.coverageTiles) {
        const tp = gridToIso(t.x, t.y);
        g.fillStyle(colorNum, 0.6);
        g.fillCircle(tp.x, tp.y, 2);
      }
      // Station dot (larger)
      g.fillStyle(0xfbbf24, 0.9);
      g.fillCircle(sp.x, sp.y, 4);
    };

    // When strategy tab is active AND fleet is initialized, show ALL mowers' borders and paths
    const strategyTabActive = editor.activeSidebarTab === "strategy";
    const hidePaths = sim.strategyEditing && sim.strategyEditMode === "tiles";

    if (strategyTabActive && sim.fleetInitialized) {
      for (const m of sim.mowers) {
        drawMowerZone(m, 0.7);
        if (!hidePaths) drawMowerTour(m);
      }
    }

    // When a mower is selected (any tab), show ONLY that mower's border + path
    if (sim.selectedMowerId && !strategyTabActive) {
      const mower = sim.mowers.find((m) => m.id === sim.selectedMowerId);
      if (mower) {
        drawMowerZone(mower, 1);
        drawMowerTour(mower);
      }
    }

    // Strategy editor: always show all borders, hide paths in tiles mode
    if (sim.strategyEditing) {
      for (const m of sim.mowers) {
        drawMowerZone(m, m.id === sim.strategyEditMowerId ? 1 : 0.4);
        if (!hidePaths) drawMowerTour(m);
      }
    }

    if (!this.hoverCell) {
      this.hideTooltip();
      return;
    }
    // Refresh tooltip with live data
    if (this.hoverCell) {
      this.showTooltip(this.hoverCell, this.lastPointerX ?? 0, this.lastPointerY ?? 0);
    }
    const pos = gridToIso(this.hoverCell.x, this.hoverCell.y);
    g.lineStyle(2, 0x22c55e, 0.95);
    g.beginPath();
    g.moveTo(pos.x, pos.y - TILE_HEIGHT / 2);
    g.lineTo(pos.x + TILE_WIDTH / 2, pos.y);
    g.lineTo(pos.x, pos.y + TILE_HEIGHT / 2);
    g.lineTo(pos.x - TILE_WIDTH / 2, pos.y);
    g.closePath();
    g.strokePath();
    if (this.commandMode) {
      g.fillStyle(0xfbbf24, 0.3);
      g.fillPath();
    }
    if (editor.selectedCells.length > 0) {
      for (const cell of editor.selectedCells) {
        const p = gridToIso(cell.x, cell.y);
        g.fillStyle(0x3b82f6, 0.2);
        g.beginPath();
        g.moveTo(p.x, p.y - TILE_HEIGHT / 2);
        g.lineTo(p.x + TILE_WIDTH / 2, p.y);
        g.lineTo(p.x, p.y + TILE_HEIGHT / 2);
        g.lineTo(p.x - TILE_WIDTH / 2, p.y);
        g.closePath();
        g.fillPath();
      }
    }
  }

  private setCursor(style: string) {
    if (this.lastCursorStyle !== style) {
      (this.game.canvas as HTMLCanvasElement).style.cursor = style;
      this.lastCursorStyle = style;
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    const editor = useEditorStore.getState();
    const sim = useSimulationStore.getState();

    // Strategy editor: handle tile/path editing
    if (sim.strategyEditing && sim.strategyEditMowerId) {
      if (pointer.middleButtonDown()) {
        this.isPanning = true;
        this.panStart = { x: pointer.x, y: pointer.y };
        this.camStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
        this.setCursor("grabbing");
        return;
      }
      if (pointer.rightButtonDown()) {
        const cell = this.worldToCell(pointer.worldX, pointer.worldY);
        if (cell) {
          const key = `${cell.x},${cell.y}`;
          const owner = sim.mowers.find((m) =>
            (m.coverageTiles ?? []).some((t) => `${t.x},${t.y}` === key),
          );
          if (owner) sim.setStrategyEditMowerId(owner.id);
        }
        return;
      }
      const cell = this.worldToCell(pointer.worldX, pointer.worldY);
      if (!cell) return;
      const targetCell = sim.cells.get(`${cell.x},${cell.y}`);
      if (!targetCell || targetCell.type !== "grass") return;
      if (sim.strategyEditMode === "tiles") {
        this.isPainting = true;
        this.paintStart = cell;
        if (pointer.event.altKey) {
          sim.removeStrategyTile(sim.strategyEditMowerId, cell.x, cell.y);
        } else {
          sim.addStrategyTile(sim.strategyEditMowerId, cell.x, cell.y);
        }
      } else {
        const mower = sim.mowers.find((m) => m.id === sim.strategyEditMowerId);
        const tiles = mower?.coverageTiles ?? [];
        const existingIdx = tiles.findIndex((t) => t.x === cell.x && t.y === cell.y);
        if (existingIdx >= 0) {
          const newTiles = [...tiles];
          newTiles.splice(existingIdx, 1);
          sim.setStrategyPath(sim.strategyEditMowerId, newTiles);
        } else {
          sim.setStrategyPath(sim.strategyEditMowerId, [...tiles, { x: cell.x, y: cell.y }]);
        }
      }
      return;
    }

    // Middle-click: always pan
    if (pointer.middleButtonDown()) {
      this.isPanning = true;
      this.panStart = { x: pointer.x, y: pointer.y };
      this.camStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
      this.setCursor("grabbing");
      return;
    }

    // Right-click: copy tile type (tools) or select mower (strategy)
    if (pointer.rightButtonDown()) {
      const cell = this.worldToCell(pointer.worldX, pointer.worldY);
      if (!cell) return;
      if (EDITOR_TOOLS.has(editor.tool)) {
        const targetCell = sim.cells.get(`${cell.x},${cell.y}`);
        if (targetCell && targetCell.type !== "charging_station") {
          editor.setTool(targetCell.type === "grass" ? "grass" : targetCell.type);
        }
      }
      return;
    }

    if (this.commandMode && sim.selectedMowerId) {
      const cell = this.worldToCell(pointer.worldX, pointer.worldY);
      if (cell) {
        sim.commandMower(sim.selectedMowerId, cell.x, cell.y);
        this.commandMode = false;
        sim.setCommandMode(false);
        window.dispatchEvent(
          new CustomEvent("walle:command-mode", { detail: { on: false } }),
        );
      }
      return;
    }
    if (editor.tool === "select") {
      const cell = this.worldToCell(pointer.worldX, pointer.worldY);
      if (cell) {
        if (pointer.event.ctrlKey || pointer.event.metaKey) {
          editor.toggleCellSelected(cell.x, cell.y);
        } else {
          editor.setSelectedCells([{ x: cell.x, y: cell.y }]);
        }
      }
      this.isPanning = true;
      this.panStart = { x: pointer.x, y: pointer.y };
      this.camStart = {
        x: this.cameras.main.scrollX,
        y: this.cameras.main.scrollY,
      };
      return;
    }
    if (editor.tool === "mower") {
      const cell = this.worldToCell(pointer.worldX, pointer.worldY);
      if (cell) {
        sim.addMower(cell.x, cell.y, "standard");
      }
      return;
    }
    const cell = this.worldToCell(pointer.worldX, pointer.worldY);
    if (!cell) return;
    this.isPainting = true;
    this.paintStart = cell;
    this.applyPaint(cell.x, cell.y);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const cell = this.worldToCell(pointer.worldX, pointer.worldY);
    this.hoverCell = cell;
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;
    this.drawHover();
    if (cell) this.showTooltip(cell, pointer.x, pointer.y);
    else this.hideTooltip();
    if (this.isPanning && this.panStart && this.camStart) {
      const dx = pointer.x - this.panStart.x;
      const dy = pointer.y - this.panStart.y;
      const zoom = this.cameras.main.zoom;
      useEditorStore.getState().setPan(
        this.camStart.x - dx / zoom,
        this.camStart.y - dy / zoom,
      );
      return;
    }
    // Strategy editor: drag to assign/remove tiles
    const simDrag = useSimulationStore.getState();
    if (this.isPainting && simDrag.strategyEditing && simDrag.strategyEditMowerId && cell) {
      const targetCell = simDrag.cells.get(`${cell.x},${cell.y}`);
      if (targetCell && targetCell.type === "grass") {
        const altKey = (pointer.event as MouseEvent).altKey;
        if (altKey) {
          simDrag.removeStrategyTile(simDrag.strategyEditMowerId, cell.x, cell.y);
        } else {
          simDrag.addStrategyTile(simDrag.strategyEditMowerId, cell.x, cell.y);
        }
      }
      return;
    }
    if (this.isPainting && this.paintStart && cell) {
      this.applyPaintRect(
        this.paintStart.x,
        this.paintStart.y,
        cell.x,
        cell.y,
      );
    }
  }

  private handlePointerUp() {
    this.isPainting = false;
    this.paintStart = null;
    this.isPanning = false;
    this.panStart = null;
    this.camStart = null;
    this.setCursor("default");
  }

  private handleWheel(
    _pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ) {
    const editor = useEditorStore.getState();
    const direction = deltaY > 0 ? -1 : 1;
    const factor = 1 + direction * 0.1;
    const next = Math.max(0.3, Math.min(3, editor.zoom * factor));
    editor.setZoom(next);
  }

  private handleResize() {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    this.refreshFromStore();
  }

  private resolvePaintType(tool: string): CellType | null {
    switch (tool) {
      case "grass":
        return "grass";
      case "path":
        return "path";
      case "flowers":
        return "flowers";
      case "building":
        return "building";
      case "obstacle":
        return "obstacle";
      case "tree":
        return "tree";
      case "water":
        return "water";
      case "gravel":
        return "gravel";
      case "sand":
        return "sand";
      case "empty":
        return "empty";
      case "erase":
        return "grass";
      default:
        return null;
    }
  }

  private applyPaint(x: number, y: number) {
    const editor = useEditorStore.getState();
    const sim2 = useSimulationStore.getState();
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const tool = editor.tool;
    if (tool === "charging_station") {
      const exists = sim2.stations.some(
        (s) => s.x === x && s.y === y,
      );
      if (!exists) sim2.addStation(x, y);
      return;
    }
    const type = this.resolvePaintType(tool);
    if (!type) return;
    sim2.paintCell(x, y, type);
    if (type === "grass") {
      sim2.setGrassHeight(x, y, editor.grassBrushHeight);
    }
  }

  private applyPaintRect(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) {
    const editor = useEditorStore.getState();
    const sim2 = useSimulationStore.getState();
    if (editor.tool === "charging_station") {
      this.applyPaint(x1, y1);
      return;
    }
    const type = this.resolvePaintType(editor.tool);
    if (!type) return;
    sim2.paintRect(x0, y0, x1, y1, type);
    if (type === "grass") {
      for (
        let y = Math.min(y0, y1);
        y <= Math.max(y0, y1);
        y++
      ) {
        for (
          let x = Math.min(x0, x1);
          x <= Math.max(x0, x1);
          x++
        ) {
          sim2.setGrassHeight(x, y, editor.grassBrushHeight);
        }
      }
    }
  }

  update(_time: number, delta: number) {
    const sim = useSimulationStore.getState();
    const editor = useEditorStore.getState();

    if (sim.isPlaying) {
      const dt = delta / 1000;
      sim.tick(dt);
    }

    // Camera follow: if a mower is selected and followMower is enabled,
    // smoothly track the mower's position.
    if (editor.followMower && sim.selectedMowerId) {
      const mower = sim.mowers.find((m) => m.id === sim.selectedMowerId);
      if (mower) {
        const target = this.visualPosition(mower);
        const cam = this.cameras.main;
        const viewW = cam.width || this.scale.width;
        const viewH = cam.height || this.scale.height;
        const zoom = cam.zoom;
        const targetPanX = target.x * zoom - viewW / 2;
        const targetPanY = target.y * zoom - viewH / 2;
        // Smooth interpolation (lerp)
        const dt = delta / 1000;
        const smooth = Math.min(1, dt * 5); // smoothing factor
        const newPanX = cam.scrollX + (targetPanX - cam.scrollX) * smooth;
        const newPanY = cam.scrollY + (targetPanY - cam.scrollY) * smooth;
        useEditorStore.getState().setPan(newPanX, newPanY);
        cam.setScroll(newPanX, newPanY);
      }
    }

    // Always update entities and paths so the visual follows the simulation
    this.updateEntities();
    this.updatePaths();
    if (sim.version !== this.lastVersion) {
      this.lastVersion = sim.version;
      this.redrawMap();
      this.updateTreeClusters(true);
    }
    if (editor.zoom !== this.lastZoom) {
      this.lastZoom = editor.zoom;
      this.applyCamera();
    }
  }

  shutdown() {
    this.unsubscribeAll();
    window.removeEventListener("walle:center-mower", this.onCenterMowerEvent);
    window.removeEventListener("walle:command-mode", this.onCommandModeEvent);
  }
}
