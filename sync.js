// ===== Garden Sync — Firestore-backed storage =====
// Remplace db.js comme couche de données principale.
// Expose exactement la même API que GardenDB, plus les méthodes de gestion du jardin partagé.

const GardenSync = (() => {
  const GARDEN_KEY      = 'potager-garden-id';
  const MIGRATED_KEY    = 'firestore-migrated-v1';
  const TASK_KEY        = 'potager-tasks-checked';
  const DEVICE_KEY      = 'potager-device-setup';

  let _gardenId = null;

  // ── Firestore helpers ────────────────────────────────────────────────────
  function col(name) {
    return firestore.collection('gardens').doc(_gardenId).collection(name);
  }

  function docRef(colName, id) {
    return firestore.collection('gardens').doc(_gardenId).collection(colName).doc(String(id));
  }

  // ── Garden lifecycle ─────────────────────────────────────────────────────

  async function init() {
    // Détecter un lien d'invitation dans l'URL
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) {
      localStorage.setItem(GARDEN_KEY, joinId);
      // Nettoyer l'URL sans rechargement
      history.replaceState({}, '', window.location.pathname);
    }
    _gardenId = localStorage.getItem(GARDEN_KEY);
    return !!_gardenId;
  }

  async function createGarden() {
    // Génère un ID court et mémorable : g + 8 chars aléatoires
    const rand = () => Math.random().toString(36).slice(2, 6);
    const id = 'g' + rand() + rand();
    await firestore.collection('gardens').doc(id).set({
      createdAt: new Date().toISOString(),
      version: 1,
    });
    localStorage.setItem(GARDEN_KEY, id);
    _gardenId = id;
    return id;
  }

  // URL d'invitation à partager aux enfants
  function getInviteUrl() {
    const loc = window.location;
    const base = loc.origin + loc.pathname.replace(/\/index\.html$/, '/').replace(/([^/])$/, '$1/');
    return `${base}?join=${_gardenId}`;
  }

  // ── Plants ───────────────────────────────────────────────────────────────

  async function getPlants() {
    const snap = await col('plants').get();
    return snap.docs.map(d => d.data());
  }

  async function getPlant(id) {
    const doc = await docRef('plants', id).get();
    return doc.exists ? doc.data() : null;
  }

  async function addPlant(data) {
    const id = Date.now();
    await docRef('plants', id).set({
      ...data,
      id,
      createdAt: new Date().toISOString(),
      status: data.status || 'growing',
    });
    return id;
  }

  async function updatePlant(data) {
    await docRef('plants', data.id).set(data, { merge: true });
  }

  async function deletePlant(id) {
    await docRef('plants', id).delete();
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  async function getNotes(plantId) {
    const snap = await col('notes').where('plantId', '==', Number(plantId)).get();
    return snap.docs.map(d => d.data()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function addNote(plantId, text, type = 'note') {
    const id = Date.now();
    await docRef('notes', id).set({
      id,
      plantId: Number(plantId),
      text,
      type,
      date: new Date().toISOString(),
    });
    return id;
  }

  async function deleteNote(id) {
    await docRef('notes', id).delete();
  }

  // ── Harvests ─────────────────────────────────────────────────────────────

  async function getHarvests(plantId) {
    const snap = await col('harvests').where('plantId', '==', Number(plantId)).get();
    return snap.docs.map(d => d.data()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function addHarvest(plantId, quantity, note = '') {
    const id = Date.now();
    await docRef('harvests', id).set({
      id,
      plantId: Number(plantId),
      quantity,
      note,
      date: new Date().toISOString(),
    });
    return id;
  }

  async function deleteHarvest(id) {
    await docRef('harvests', id).delete();
  }

  // ── Generic store (journal, stats, quick-note) ────────────────────────────

  async function getAll(store) {
    const snap = await col(store).get();
    return snap.docs.map(d => d.data());
  }

  async function add(store, data) {
    const id = Date.now();
    await docRef(store, id).set({ id, ...data });
    return id;
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  async function getStats() {
    const [plants, notes, harvests] = await Promise.all([
      getAll('plants'),
      getAll('notes'),
      getAll('harvests'),
    ]);
    return {
      plants:      plants.filter(p => p.status === 'growing').length,
      totalPlants: plants.length,
      notes:       notes.length,
      harvests:    harvests.length,
    };
  }

  async function getRecentPlants(limit = 4) {
    const plants = await getAll('plants');
    return plants
      .filter(p => p.status === 'growing')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  // ── Profiles (partagés entre tous les appareils de la famille) ────────────

  async function getProfiles() {
    const snap = await col('profiles').get();
    return snap.docs.map(d => d.data());
  }

  async function saveProfile(profile) {
    await col('profiles').doc(profile.id).set(profile, { merge: true });
  }

  // ── Tâches cochées (synced pour que toute la famille voie le même état) ───

  async function loadTaskChecked() {
    const snap = await col('taskChecked').get();
    const ids = snap.docs.filter(d => d.data().checked).map(d => d.id);
    if (ids.length) {
      localStorage.setItem(TASK_KEY, JSON.stringify(ids));
    }
  }

  async function syncTaskToggle(taskId, checked) {
    // Fire & forget — ne pas bloquer l'UI
    col('taskChecked').doc(String(taskId)).set({
      checked,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  // ── Migration depuis IndexedDB (admin uniquement, une seule fois) ──────────

  async function migrateFromIndexedDB() {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    localStorage.setItem(MIGRATED_KEY, '1'); // verrou optimiste

    try {
      const idbData = await new Promise((resolve) => {
        const req = indexedDB.open('potager-db', 1);
        req.onerror = () => resolve(null);
        req.onsuccess = e => {
          const idb = e.target.result;
          if (![...idb.objectStoreNames].includes('plants')) {
            idb.close();
            resolve(null);
            return;
          }
          const tx = idb.transaction(['plants', 'notes', 'harvests'], 'readonly');
          const result = { plants: [], notes: [], harvests: [] };
          let done = 0;
          ['plants', 'notes', 'harvests'].forEach(s => {
            tx.objectStore(s).getAll().onsuccess = ev => {
              result[s] = ev.target.result || [];
              if (++done === 3) { idb.close(); resolve(result); }
            };
          });
          tx.onerror = () => { idb.close(); resolve(null); };
        };
      });

      if (!idbData || !idbData.plants.length) return;

      // Écriture par lots de 400 (limite Firestore = 500/batch)
      const allDocs = [
        ...idbData.plants.map(p => ({ c: 'plants',   data: p })),
        ...idbData.notes.map(n =>   ({ c: 'notes',    data: n })),
        ...idbData.harvests.map(h => ({ c: 'harvests', data: h })),
      ];

      for (let i = 0; i < allDocs.length; i += 400) {
        const batch = firestore.batch();
        allDocs.slice(i, i + 400).forEach(({ c, data }) => {
          batch.set(
            firestore.collection('gardens').doc(_gardenId).collection(c).doc(String(data.id)),
            data
          );
        });
        await batch.commit();
      }

      console.log(`✅ Migration IndexedDB → Firestore : ${idbData.plants.length} plantes, ${idbData.notes.length} notes, ${idbData.harvests.length} récoltes`);
    } catch (e) {
      console.warn('Migration IndexedDB échouée :', e);
      localStorage.removeItem(MIGRATED_KEY); // permettre une nouvelle tentative
    }
  }

  // ── Device setup flag ────────────────────────────────────────────────────

  function isDeviceSetup() {
    return !!localStorage.getItem(DEVICE_KEY);
  }

  function markDeviceSetup() {
    localStorage.setItem(DEVICE_KEY, '1');
  }

  // ── Expose ───────────────────────────────────────────────────────────────

  return {
    init,
    createGarden,
    getInviteUrl,
    isDeviceSetup,
    markDeviceSetup,

    getPlants, getPlant, addPlant, updatePlant, deletePlant,
    getNotes,  addNote,  deleteNote,
    getHarvests, addHarvest, deleteHarvest,
    getAll, add,
    getStats, getRecentPlants,

    getProfiles, saveProfile,
    loadTaskChecked, syncTaskToggle,
    migrateFromIndexedDB,

    get gardenId() { return _gardenId; },
  };
})();

// Alias global — remplace db.js
const db = GardenSync;
