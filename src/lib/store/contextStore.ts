"use client";

import { create } from "zustand";
import { db } from "@/lib/db/indexedDB";
import { generateId } from "@/lib/utils";
import { DEFAULT_PROJECT_CONFIG } from "@/lib/constants";
import { TIER_CONFIGS } from "@/lib/types";
import type {
  Client,
  ClientTier,
  Project,
  ProjectConfig,
  Space,
  TierConfig,
} from "@/lib/types";

const STORAGE_KEY = "walle-context";

interface StoredContext {
  activeClientId: string | null;
  activeProjectId: string | null;
  activeSpaceId: string | null;
}

function loadPersistedContext(): StoredContext {
  if (typeof window === "undefined") {
    return { activeClientId: null, activeProjectId: null, activeSpaceId: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeClientId: null, activeProjectId: null, activeSpaceId: null };
    const parsed = JSON.parse(raw) as Partial<StoredContext>;
    return {
      activeClientId: parsed.activeClientId ?? null,
      activeProjectId: parsed.activeProjectId ?? null,
      activeSpaceId: parsed.activeSpaceId ?? null,
    };
  } catch {
    return { activeClientId: null, activeProjectId: null, activeSpaceId: null };
  }
}

function persistContext(ctx: StoredContext) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    // ignore
  }
}

interface ContextState {
  clients: Client[];
  projects: Project[];
  spaces: Space[];
  activeClientId: string | null;
  activeProjectId: string | null;
  activeSpaceId: string | null;
  loaded: boolean;
  loadAll: () => Promise<void>;
  createClient: (name: string, tier: ClientTier) => Promise<Client>;
  createProject: (clientId: string, name: string) => Promise<Project>;
  createSpace: (projectId: string, name: string, w: number, h: number) => Promise<Space>;
  updateProjectConfig: (projectId: string, config: ProjectConfig) => Promise<void>;
  setActiveClient: (id: string | null) => void;
  setActiveProject: (id: string | null) => void;
  setActiveSpace: (id: string | null) => void;
  deleteClient: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  updateClientTier: (clientId: string, tier: ClientTier) => Promise<void>;
  getActiveTierConfig: () => TierConfig | null;
}

const persisted = loadPersistedContext();

export const useContextStore = create<ContextState>((set, get) => ({
  clients: [],
  projects: [],
  spaces: [],
  activeClientId: persisted.activeClientId,
  activeProjectId: persisted.activeProjectId,
  activeSpaceId: persisted.activeSpaceId,
  loaded: false,

  loadAll: async () => {
    const [clients, projects, spaces] = await Promise.all([
      db.getAllClients(),
      db.getAllProjects(),
      db.getAllSpaces(),
    ]);
    const state = get();
    // Validate persisted IDs still exist in the database
    const validClientId = state.activeClientId && clients.some((c) => c.id === state.activeClientId)
      ? state.activeClientId
      : null;
    const validProjectId = state.activeProjectId && projects.some((p) => p.id === state.activeProjectId)
      ? state.activeProjectId
      : null;
    const validSpaceId = state.activeSpaceId && spaces.some((s) => s.id === state.activeSpaceId)
      ? state.activeSpaceId
      : null;
    set({ clients, projects, spaces, loaded: true });
    // If any IDs were invalid, update persisted state
    if (validClientId !== state.activeClientId || validProjectId !== state.activeProjectId || validSpaceId !== state.activeSpaceId) {
      set({ activeClientId: validClientId, activeProjectId: validProjectId, activeSpaceId: validSpaceId });
      persistContext({ activeClientId: validClientId, activeProjectId: validProjectId, activeSpaceId: validSpaceId });
    }
  },

  createClient: async (name, tier) => {
    const client: Client = {
      id: generateId(),
      name: name.trim() || "Cliente",
      tier,
      createdAt: Date.now(),
    };
    await db.putClient(client);
    set((s) => ({ clients: [...s.clients, client] }));
    return client;
  },

  createProject: async (clientId, name) => {
    const project: Project = {
      id: generateId(),
      clientId,
      name: name.trim() || "Proyecto",
      config: { ...DEFAULT_PROJECT_CONFIG },
      createdAt: Date.now(),
    };
    await db.putProject(project);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  createSpace: async (projectId, name, w, h) => {
    const space: Space = {
      id: generateId(),
      projectId,
      name: name.trim() || "Espacio",
      width: w,
      height: h,
      cellSize: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.putSpace(space);
    set((s) => ({ spaces: [...s.spaces, space] }));
    return space;
  },

  updateProjectConfig: async (projectId, config) => {
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return;
    const updated = { ...project, config };
    await db.putProject(updated);
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? updated : p)),
    }));
  },

  setActiveClient: (id) => {
    set({ activeClientId: id });
    const s = get();
    persistContext({
      activeClientId: id,
      activeProjectId: s.activeProjectId,
      activeSpaceId: s.activeSpaceId,
    });
  },
  setActiveProject: (id) => {
    set({ activeProjectId: id });
    const s = get();
    persistContext({
      activeClientId: s.activeClientId,
      activeProjectId: id,
      activeSpaceId: s.activeSpaceId,
    });
  },
  setActiveSpace: (id) => {
    set({ activeSpaceId: id });
    const s = get();
    persistContext({
      activeClientId: s.activeClientId,
      activeProjectId: s.activeProjectId,
      activeSpaceId: id,
    });
  },

  deleteClient: async (id) => {
    const projects = get().projects.filter((p) => p.clientId === id);
    for (const p of projects) {
      const spaces = get().spaces.filter((s) => s.projectId === p.id);
      for (const sp of spaces) {
        await db.clearMapCells(sp.id);
        await db.clearGrassData(sp.id);
        await db.clearMowers(sp.id);
        await db.clearStations(sp.id);
      }
      await db.deleteProject(p.id);
    }
    await db.deleteClient(id);
    const s = get();
    const nextClientId = s.activeClientId === id ? null : s.activeClientId;
    const nextProjectId = s.activeProjectId === id ? null : s.activeProjectId;
    set({
      clients: s.clients.filter((c) => c.id !== id),
      projects: s.projects.filter((p) => p.clientId !== id),
      spaces: s.spaces.filter(
        (sp) => !projects.some((p) => p.id === sp.projectId),
      ),
      activeClientId: nextClientId,
      activeProjectId: nextProjectId,
    });
    persistContext({ activeClientId: nextClientId, activeProjectId: nextProjectId, activeSpaceId: s.activeSpaceId });
  },

  deleteProject: async (id) => {
    const spaces = get().spaces.filter((s) => s.projectId === id);
    for (const sp of spaces) {
      await db.clearMapCells(sp.id);
      await db.clearGrassData(sp.id);
      await db.clearMowers(sp.id);
      await db.clearStations(sp.id);
      await db.deleteSpace(sp.id);
    }
    await db.deleteProject(id);
    const s = get();
    const nextProjectId = s.activeProjectId === id ? null : s.activeProjectId;
    set({
      projects: s.projects.filter((p) => p.id !== id),
      spaces: s.spaces.filter((sp) => sp.projectId !== id),
      activeProjectId: nextProjectId,
    });
    persistContext({ activeClientId: s.activeClientId, activeProjectId: nextProjectId, activeSpaceId: s.activeSpaceId });
  },

  deleteSpace: async (id) => {
    await db.clearMapCells(id);
    await db.clearGrassData(id);
    await db.clearMowers(id);
    await db.clearStations(id);
    await db.deleteSpace(id);
    const s = get();
    const nextSpaceId = s.activeSpaceId === id ? null : s.activeSpaceId;
    set({
      spaces: s.spaces.filter((sp) => sp.id !== id),
      activeSpaceId: nextSpaceId,
    });
    persistContext({ activeClientId: s.activeClientId, activeProjectId: s.activeProjectId, activeSpaceId: nextSpaceId });
  },

  updateClientTier: async (clientId, tier) => {
    const client = get().clients.find((c) => c.id === clientId);
    if (!client) return;
    const updated = { ...client, tier };
    await db.putClient(updated);
    set((s) => ({ clients: s.clients.map((c) => (c.id === clientId ? updated : c)) }));
  },

  getActiveTierConfig: () => {
    const { clients, activeClientId } = get();
    const client = clients.find((c) => c.id === activeClientId);
    if (!client) return null;
    return (TIER_CONFIGS as Record<ClientTier, TierConfig>)[client.tier] ?? null;
  },
}));
