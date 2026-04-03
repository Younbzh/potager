// ===== Garden Sync — Supabase-backed storage =====
// Remplace db.js comme couche de données principale.
// Expose exactement la même API que GardenDB + méthodes de gestion du jardin partagé.

const GardenSync = (() => {
  const GARDEN_KEY   = 'potager-garden-id';
  const MIGRATED_KEY = 'potager-migrated-v1';
  const TASK_KEY     = 'potager-tasks-checked';
  const DEVICE_KEY   = 'potager-device-setup';

  let _gardenId = null;

  // ── Helpers Supabase ─────────────────────────────────────────────────────

  async function upsertDoc(store, docId, data, plantId = null) {
    const row = {
      garden_id:  _gardenId,
      store,
      doc_id:     String(docId),
      data,
      updated_at: new Date().toISOString(),
    };
    if (plantId !== null) row.plant_id = Number(plantId);

    const { error } = await supabaseClient
      .from('garden_docs')
      .upsert(row, { onConflict: 'garden_id,store,doc_id' });
    if (error) throw error;
  }

  async function getDoc(store, docId) {
    const { data, error } = await supabaseClient
      .from('garden_docs')
      .select('data')
      .eq('garden_id', _gardenId)
      .eq('store', store)
      .eq('doc_id', String(docId))
      .maybeSingle();
    if (error) throw error;
    return data?.data || null;
  }

  async function getDocs(store) {
    const { data, error } = await supabaseClient
      .from('garden_docs')
      .select('data')
      .eq('garden_id', _gardenId)
      .eq('store', store);
    if (error) throw error;
    return (data || []).map(r => r.data);
  }

  async function getDocsByPlant(store, plantId) {
    const { data, error } = await supabaseClient
      .from('garden_docs')
      .select('data')
      .eq('garden_id', _gardenId)
      .eq('store', store)
      .eq('plant_id', Number(plantId));
    if (error) throw error;
    return (data || []).map(r => r.data);
  }

  async function deleteDoc(store, docId) {
    const { error } = await supabaseClient
      .from('garden_docs')
      .delete()
      .eq('garden_id', _gardenId)
      .eq('store', store)
      .eq('doc_id', String(docId));
    if (error) throw error;
  }

  // ── Garden lifecycle ─────────────────────────────────────────────────────

  async function init() {
    // Détecter un lien d'invitation dans l'URL (?join=gardenId)
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) {
      localStorage.setItem(GARDEN_KEY, joinId);
      history.replaceState({}, '', window.location.pathname);
    }
    _gardenId = localStorage.getItem(GARDEN_KEY);
    return !!_gardenId;
  }

  async function createGarden() {
    const rand = () => Math.random().toString(36).slice(2, 6);
    const id = 'g' + rand() + rand();

    const { error } = await supabaseClient
      .from('gardens')
      .insert({ id, created_at: new Date().toISOString() });
    if (error) throw error;

    localStorage.setItem(GARDEN_KEY, id);
    _gardenId = id;
    return id;
  }

  function getInviteUrl() {
    const loc = window.location;
    // Fonctionne aussi bien sur GitHub Pages que sur un domaine custom
    const path = loc.pathname.replace(/index\.html$/, '');
    return `${loc.origin}${path}?join=${_gardenId}`;
  }

  // ── Plants ───────────────────────────────────────────────────────────────

  async function getPlants()    { return getDocs('plants'); }
  async function getPlant(id)   { return getDoc('plants', id); }

  async function addPlant(data) {
    const id = Date.now();
    await upsertDoc('plants', id, {
      ...data, id,
      createdAt: new Date().toISOString(),
      status: data.status || 'growing',
    });
    return id;
  }

  async function updatePlant(data) {
    await upsertDoc('plants', data.id, data);
  }

  async function deletePlant(id) {
    await deleteDoc('plants', id);
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  async function getNotes(plantId) {
    const notes = await getDocsByPlant('notes', plantId);
    return notes.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function addNote(plantId, text, type = 'note') {
    const id = Date.now();
    const note = { id, plantId: Number(plantId), text, type, date: new Date().toISOString() };
    await upsertDoc('notes', id, note, plantId);
    return id;
  }

  async function deleteNote(id) { await deleteDoc('notes', id); }

  // ── Harvests ─────────────────────────────────────────────────────────────

  async function getHarvests(plantId) {
    const h = await getDocsByPlant('harvests', plantId);
    return h.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function addHarvest(plantId, quantity, note = '') {
    const id = Date.now();
    await upsertDoc('harvests', id, {
      id, plantId: Number(plantId), quantity, note, date: new Date().toISOString(),
    }, plantId);
    return id;
  }

  async function deleteHarvest(id) { await deleteDoc('harvests', id); }

  // ── Generic store (journal, stats, quick-note modal) ─────────────────────

  async function getAll(store) { return getDocs(store); }

  async function add(store, data) {
    const id = Date.now();
    await upsertDoc(store, id, { id, ...data }, data.plantId ?? null);
    return id;
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  async function getStats() {
    const [plants, notes, harvests] = await Promise.all([
      getAll('plants'), getAll('notes'), getAll('harvests'),
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

  // ── Profils (partagés entre appareils — leaderboard XP en temps réel) ────

  async function getProfiles()       { return getDocs('profiles'); }
  async function saveProfile(profile) {
    await upsertDoc('profiles', profile.id, profile);
  }

  // ── Tâches cochées (sync famille) ────────────────────────────────────────

  async function loadTaskChecked() {
    const docs = await getDocs('taskChecked');
    const ids  = docs.filter(d => d.checked).map(d => String(d.id));
    if (ids.length) localStorage.setItem(TASK_KEY, JSON.stringify(ids));
  }

  async function syncTaskToggle(taskId, checked) {
    // Fire & forget — ne bloque pas l'UI
    upsertDoc('taskChecked', taskId, {
      id: taskId, checked, updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }

  // ── Migration IndexedDB → Supabase (admin, une seule fois) ───────────────

  async function migrateFromIndexedDB() {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    localStorage.setItem(MIGRATED_KEY, '1');

    try {
      const idbData = await new Promise(resolve => {
        const req = indexedDB.open('potager-db', 1);
        req.onerror = () => resolve(null);
        req.onsuccess = e => {
          const idb = e.target.result;
          if (![...idb.objectStoreNames].includes('plants')) { idb.close(); resolve(null); return; }
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

      const rows = [
        ...idbData.plants.map(p => ({
          garden_id: _gardenId, store: 'plants',
          doc_id: String(p.id), data: p,
          updated_at: new Date().toISOString(),
        })),
        ...idbData.notes.map(n => ({
          garden_id: _gardenId, store: 'notes',
          doc_id: String(n.id), plant_id: n.plantId || null, data: n,
          updated_at: new Date().toISOString(),
        })),
        ...idbData.harvests.map(h => ({
          garden_id: _gardenId, store: 'harvests',
          doc_id: String(h.id), plant_id: h.plantId || null, data: h,
          updated_at: new Date().toISOString(),
        })),
      ];

      // Supabase upsert par chunks de 200
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabaseClient
          .from('garden_docs')
          .upsert(rows.slice(i, i + 200), { onConflict: 'garden_id,store,doc_id' });
        if (error) throw error;
      }

      console.log(`✅ Migration IndexedDB → Supabase : ${idbData.plants.length} plantes, ${idbData.notes.length} notes, ${idbData.harvests.length} récoltes`);
    } catch (e) {
      console.warn('Migration échouée :', e);
      localStorage.removeItem(MIGRATED_KEY);
    }
  }

  // ── Device identity flags ────────────────────────────────────────────────

  function isDeviceSetup()   { return !!localStorage.getItem(DEVICE_KEY); }
  function markDeviceSetup() { localStorage.setItem(DEVICE_KEY, '1'); }

  // ── Public API ───────────────────────────────────────────────────────────

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

// Alias global — remplace db.js dans toute l'application
const db = GardenSync;
