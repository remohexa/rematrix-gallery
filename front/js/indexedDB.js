// Copyright (C) 2026 remohexa
// SPDX-License-Identifier: GPL-3.0
// Github: https://github.com/remohexa/rematrix-gallery
export class IndexedDB {
  #db = null;

  constructor(name = "Rematrix-Gallery", version = 1) {
    this.name = name;
    this.version = version;
  }

  async #init() {
    if (this.#db) return;
    return new Promise((res, rej) => {
      const req = indexedDB.open(this.name, this.version);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("files"))
          db.createObjectStore("files", { keyPath: "name" });
        if (!db.objectStoreNames.contains("values"))
          db.createObjectStore("values", { keyPath: "name" });
      };

      req.onsuccess = (e) => {
        this.#db = e.target.result;
        res();
      };
      req.onerror = (e) => rej(e.target.error);
    });
  }

  #tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.#db.transaction(store, mode);
      const s = t.objectStore(store);
      const req = fn(s);
      req.onsuccess = () => res(req.result);
      req.onerror = (e) => rej(e.target.error);
    });
  }

  async set(name, value) {
    if (!name || value === null || value === undefined) {
      return null;
    }
    await this.#init();
    return this.#tx("values", "readwrite", (s) => s.put({ name, value }));
  }
  async get(name, dummy = false) {
    if (!name) {
      return null;
    }
    await this.#init();
    const result = await this.#tx("values", "readonly", (s) => s.get(name));
    if (!result && name === "account" && dummy) {
      return {};
    }
    return result?.value ?? null;
  }

  async delete(name) {
    if (!name) {
      return null;
    }
    await this.#init();
    return this.#tx("values", "readwrite", (s) => s.delete(name));
  }

  async list() {
    await this.#init();
    return this.#tx("values", "readonly", (s) => s.getAllKeys());
  }
}