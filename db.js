class GardenDB {
  constructor() {
    this.dbName = 'potager-db';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);

      req.onupgradeneeded = e => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('plants')) {
          const ps = db.createObjectStore('plants', { keyPath: 'id', autoIncrement: true });
          ps.createIndex('dbId', 'dbId');
          ps.createIndex('status', 'status');
        }

        if (!db.objectStoreNames.contains('notes')) {
          const ns = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
          ns.createIndex('plantId', 'plantId');
          ns.createIndex('date', 'date');
        }

        if (!db.objectStoreNames.contains('harvests')) {
          const hs = db.createObjectStore('harvests', { keyPath: 'id', autoIncrement: true });
          hs.createIndex('plantId', 'plantId');
          hs.createIndex('date', 'date');
        }
      };

      req.onsuccess = e => { this.db = e.target.result; resolve(); };
      req.onerror = e => reject(e.target.error);
    });
  }

  _tx(store, mode = 'readonly') {
    return this.db.transaction(store, mode).objectStore(store);
  }

  _wrap(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  async add(store, data) { return this._wrap(this._tx(store, 'readwrite').add(data)); }
  async get(store, id) { return this._wrap(this._tx(store).get(id)); }
  async getAll(store) { return this._wrap(this._tx(store).getAll()); }
  async put(store, data) { return this._wrap(this._tx(store, 'readwrite').put(data)); }
  async delete(store, id) { return this._wrap(this._tx(store, 'readwrite').delete(id)); }

  async getByIndex(store, indexName, value) {
    return new Promise((resolve, reject) => {
      const req = this._tx(store).index(indexName).getAll(value);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  // Convenience methods
  async getPlants() { return this.getAll('plants'); }
  async getPlant(id) { return this.get('plants', id); }
  async addPlant(data) { return this.add('plants', { ...data, createdAt: new Date().toISOString(), status: 'growing' }); }
  async updatePlant(data) { return this.put('plants', data); }
  async deletePlant(id) { return this.delete('plants', id); }

  async getNotes(plantId) {
    const notes = await this.getByIndex('notes', 'plantId', plantId);
    return notes.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  async addNote(plantId, text, type = 'note') {
    return this.add('notes', { plantId, text, type, date: new Date().toISOString() });
  }
  async deleteNote(id) { return this.delete('notes', id); }

  async getHarvests(plantId) {
    const h = await this.getByIndex('harvests', 'plantId', plantId);
    return h.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  async addHarvest(plantId, quantity, note = '') {
    return this.add('harvests', { plantId, quantity, note, date: new Date().toISOString() });
  }
  async deleteHarvest(id) { return this.delete('harvests', id); }

  async getStats() {
    const [plants, notes, harvests] = await Promise.all([
      this.getAll('plants'),
      this.getAll('notes'),
      this.getAll('harvests')
    ]);
    return {
      plants: plants.filter(p => p.status === 'growing').length,
      totalPlants: plants.length,
      notes: notes.length,
      harvests: harvests.length
    };
  }

  async getRecentPlants(limit = 4) {
    const plants = await this.getAll('plants');
    return plants
      .filter(p => p.status === 'growing')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
}

const db = new GardenDB();
