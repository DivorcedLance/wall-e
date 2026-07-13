import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Client,
  Project,
  Space,
  CellData,
  Mower,
  ChargingStation,
  SimulationEvent,
} from "@/lib/types";

interface WalleDB extends DBSchema {
  clients: {
    key: string;
    value: Client;
  };
  projects: {
    key: string;
    value: Project;
    indexes: { "by-client": string };
  };
  spaces: {
    key: string;
    value: Space;
    indexes: { "by-project": string };
  };
  mapCells: {
    key: [string, string];
    value: { spaceId: string; key: string; data: CellData };
    indexes: { "by-space": string };
  };
  grassData: {
    key: [string, string];
    value: { spaceId: string; key: string; height: number };
    indexes: { "by-space": string };
  };
  mowers: {
    key: string;
    value: Mower;
    indexes: { "by-space": string };
  };
  chargingStations: {
    key: string;
    value: ChargingStation;
    indexes: { "by-space": string };
  };
  events: {
    key: string;
    value: SimulationEvent;
    indexes: { "by-space": string };
  };
}

const DB_NAME = "wall-e-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WalleDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<WalleDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only available in the browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB<WalleDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("clients")) {
          db.createObjectStore("clients", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("projects")) {
          const projectsStore = db.createObjectStore("projects", { keyPath: "id" });
          projectsStore.createIndex("by-client", "clientId");
        }
        if (!db.objectStoreNames.contains("spaces")) {
          const spacesStore = db.createObjectStore("spaces", { keyPath: "id" });
          spacesStore.createIndex("by-project", "projectId");
        }
        if (!db.objectStoreNames.contains("mapCells")) {
          const cellsStore = db.createObjectStore("mapCells", {
            keyPath: ["spaceId", "key"],
          });
          cellsStore.createIndex("by-space", "spaceId");
        }
        if (!db.objectStoreNames.contains("grassData")) {
          const grassStore = db.createObjectStore("grassData", {
            keyPath: ["spaceId", "key"],
          });
          grassStore.createIndex("by-space", "spaceId");
        }
        if (!db.objectStoreNames.contains("mowers")) {
          const mowersStore = db.createObjectStore("mowers", { keyPath: "id" });
          mowersStore.createIndex("by-space", "spaceId");
        }
        if (!db.objectStoreNames.contains("chargingStations")) {
          const stationsStore = db.createObjectStore("chargingStations", {
            keyPath: "id",
          });
          stationsStore.createIndex("by-space", "spaceId");
        }
        if (!db.objectStoreNames.contains("events")) {
          const eventsStore = db.createObjectStore("events", { keyPath: "id" });
          eventsStore.createIndex("by-space", "spaceId");
        }
      },
    });
  }
  return dbPromise;
}

export const db = {
  // Clients
  async getAllClients(): Promise<Client[]> {
    const database = await getDB();
    return database.getAll("clients");
  },
  async putClient(client: Client): Promise<void> {
    const database = await getDB();
    await database.put("clients", client);
  },
  async deleteClient(id: string): Promise<void> {
    const database = await getDB();
    await database.delete("clients", id);
  },

  // Projects
  async getAllProjects(): Promise<Project[]> {
    const database = await getDB();
    return database.getAll("projects");
  },
  async getProjectsByClient(clientId: string): Promise<Project[]> {
    const database = await getDB();
    return database.getAllFromIndex("projects", "by-client", clientId);
  },
  async putProject(project: Project): Promise<void> {
    const database = await getDB();
    await database.put("projects", project);
  },
  async deleteProject(id: string): Promise<void> {
    const database = await getDB();
    await database.delete("projects", id);
  },

  // Spaces
  async getAllSpaces(): Promise<Space[]> {
    const database = await getDB();
    return database.getAll("spaces");
  },
  async getSpacesByProject(projectId: string): Promise<Space[]> {
    const database = await getDB();
    return database.getAllFromIndex("spaces", "by-project", projectId);
  },
  async putSpace(space: Space): Promise<void> {
    const database = await getDB();
    await database.put("spaces", space);
  },
  async deleteSpace(id: string): Promise<void> {
    const database = await getDB();
    await database.delete("spaces", id);
  },

  // Map Cells
  async getMapCells(spaceId: string): Promise<Map<string, CellData>> {
    const database = await getDB();
    const records = await database.getAllFromIndex("mapCells", "by-space", spaceId);
    const map = new Map<string, CellData>();
    for (const record of records) {
      map.set(record.key, record.data);
    }
    return map;
  },
  async putMapCell(spaceId: string, key: string, data: CellData): Promise<void> {
    const database = await getDB();
    await database.put("mapCells", { spaceId, key, data });
  },
  async putMapCells(
    spaceId: string,
    entries: Array<{ key: string; data: CellData }>,
  ): Promise<void> {
    const database = await getDB();
    const tx = database.transaction("mapCells", "readwrite");
    await Promise.all(
      entries.map(({ key, data }) =>
        tx.store.put({ spaceId, key, data }),
      ),
    );
    await tx.done;
  },
  async clearMapCells(spaceId: string): Promise<void> {
    const database = await getDB();
    const tx = database.transaction("mapCells", "readwrite");
    const index = tx.store.index("by-space");
    let cursor = await index.openCursor(IDBKeyRange.only(spaceId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  // Grass Data
  async getGrassData(spaceId: string): Promise<Map<string, number>> {
    const database = await getDB();
    const records = await database.getAllFromIndex("grassData", "by-space", spaceId);
    const map = new Map<string, number>();
    for (const record of records) {
      map.set(record.key, record.height);
    }
    return map;
  },
  async putGrassData(spaceId: string, key: string, height: number): Promise<void> {
    const database = await getDB();
    await database.put("grassData", { spaceId, key, height });
  },
  async putGrassDataBatch(
    spaceId: string,
    entries: Array<{ key: string; height: number }>,
  ): Promise<void> {
    const database = await getDB();
    const tx = database.transaction("grassData", "readwrite");
    const index = tx.store.index("by-space");
    let cursor = await index.openCursor(IDBKeyRange.only(spaceId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    for (const { key, height } of entries) {
      tx.store.put({ spaceId, key, height });
    }
    await tx.done;
  },
  async clearGrassData(spaceId: string): Promise<void> {
    const database = await getDB();
    const tx = database.transaction("grassData", "readwrite");
    const index = tx.store.index("by-space");
    let cursor = await index.openCursor(IDBKeyRange.only(spaceId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  // Mowers
  async getMowers(spaceId: string): Promise<Mower[]> {
    const database = await getDB();
    return database.getAllFromIndex("mowers", "by-space", spaceId);
  },
  async putMower(mower: Mower): Promise<void> {
    const database = await getDB();
    await database.put("mowers", mower);
  },
  async putMowersBatch(mowers: Mower[]): Promise<void> {
    const database = await getDB();
    const tx = database.transaction("mowers", "readwrite");
    for (const m of mowers) tx.store.put(m);
    await tx.done;
  },
  async deleteMower(id: string): Promise<void> {
    const database = await getDB();
    await database.delete("mowers", id);
  },
  async clearMowers(spaceId: string): Promise<void> {
    const database = await getDB();
    const tx = database.transaction("mowers", "readwrite");
    const index = tx.store.index("by-space");
    let cursor = await index.openCursor(IDBKeyRange.only(spaceId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  // Charging Stations
  async getStations(spaceId: string): Promise<ChargingStation[]> {
    const database = await getDB();
    return database.getAllFromIndex("chargingStations", "by-space", spaceId);
  },
  async putStation(station: ChargingStation): Promise<void> {
    const database = await getDB();
    await database.put("chargingStations", station);
  },
  async putStationsBatch(stations: ChargingStation[]): Promise<void> {
    const database = await getDB();
    const tx = database.transaction("chargingStations", "readwrite");
    for (const s of stations) tx.store.put(s);
    await tx.done;
  },
  async deleteStation(id: string): Promise<void> {
    const database = await getDB();
    await database.delete("chargingStations", id);
  },
  async clearStations(spaceId: string): Promise<void> {
    const database = await getDB();
    const tx = database.transaction("chargingStations", "readwrite");
    const index = tx.store.index("by-space");
    let cursor = await index.openCursor(IDBKeyRange.only(spaceId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  // Events
  async addEvent(event: SimulationEvent): Promise<void> {
    const database = await getDB();
    await database.put("events", event);
  },
  async getEvents(spaceId: string): Promise<SimulationEvent[]> {
    const database = await getDB();
    const events = await database.getAllFromIndex("events", "by-space", spaceId);
    return events.sort((a, b) => b.timestamp - a.timestamp);
  },
};
