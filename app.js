// ===== Profile & Family System =====
const ProfileManager = (() => {
  const KEY = 'potager-profiles';
  const ACTIVE_KEY = 'potager-active-profile';

  const LEVELS = [
    { min: 0,    label: 'Apprenti',         emoji: '🌱' },
    { min: 100,  label: 'Débutant',         emoji: '🌿' },
    { min: 300,  label: 'Jardinier',        emoji: '🥕' },
    { min: 600,  label: 'Cultivateur',      emoji: '🍅' },
    { min: 1000, label: 'Expert',           emoji: '🌻' },
    { min: 1800, label: 'Maître Jardinier', emoji: '👨‍🌾' },
  ];

  const XP_REWARDS = {
    task_complete:  20,
    note_added:     10,
    photo_note:     20,
    harvest_logged: 25,
    plant_adopted:   5,
    plant_added:    15,
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  }
  function save(profiles) { localStorage.setItem(KEY, JSON.stringify(profiles)); }

  function getAll() { return load(); }

  function getActive() {
    const profiles = load();
    const id = localStorage.getItem(ACTIVE_KEY);
    return profiles.find(p => p.id === id) || profiles[0] || null;
  }

  function setActive(id) { localStorage.setItem(ACTIVE_KEY, id); }

  function create(name, emoji, role = 'kid') {
    const profiles = load();
    const id = 'profile-' + Date.now();
    const profile = { id, name, emoji, role, xp: 0, createdAt: new Date().toISOString() };
    profiles.push(profile);
    save(profiles);
    // Sync to Firestore (fire & forget)
    if (typeof GardenSync !== 'undefined' && GardenSync.gardenId) {
      GardenSync.saveProfile(profile).catch(() => {});
    }
    return id;
  }

  function addXp(profileId, action) {
    if (!profileId) return 0;
    const profiles = load();
    const p = profiles.find(x => x.id === profileId);
    if (!p) return 0;
    const earned = XP_REWARDS[action] || 0;
    p.xp = (p.xp || 0) + earned;
    save(profiles);
    // Sync to Firestore (fire & forget)
    if (typeof GardenSync !== 'undefined' && GardenSync.gardenId) {
      GardenSync.saveProfile(p).catch(() => {});
    }
    return earned;
  }

  function getLevelProgress(xp) {
    const idx = [...LEVELS].reverse().findIndex(l => xp >= l.min);
    const realIdx = LEVELS.length - 1 - idx;
    const current = LEVELS[Math.max(realIdx, 0)];
    const next = LEVELS[Math.min(realIdx + 1, LEVELS.length - 1)];
    if (current === next) return { level: current, pct: 100, xpToNext: 0, xp };
    const pct = Math.round(((xp - current.min) / (next.min - current.min)) * 100);
    return { level: current, next, pct, xpToNext: next.min - xp, xp };
  }

  function needsSetup() { return load().length === 0; }

  return { getAll, getActive, setActive, create, addXp, getLevelProgress, needsSetup, XP_REWARDS };
})();

// ===== Main Application =====
class PotagerApp {
  constructor() {
    this.state = { view: 'home', params: {}, calMonth: new Date().getMonth(), calYear: new Date().getFullYear() };
    this.activeTab = 'fiche';
    this.selectedDbPlant = null;
    this.isCustomPlant = false;
    this.plantFilter = '';
    this.plantSearch = '';
  }

  async init() {
    // ── 1. Initialiser la sync Firestore (détecte aussi ?join= dans l'URL) ──
    const hasGarden = await GardenSync.init();

    if (!hasGarden) {
      // Nouveau appareil, aucun jardin connu → écran de bienvenue
      this.showGardenSetup();
      return;
    }

    // ── 2. Synchroniser profils + tâches cochées depuis Firestore ────────────
    try {
      const remoteProfiles = await GardenSync.getProfiles();
      if (remoteProfiles.length > 0) {
        localStorage.setItem('potager-profiles', JSON.stringify(remoteProfiles));
      }
    } catch (_) { /* hors ligne — on utilise le cache localStorage */ }

    GardenSync.loadTaskChecked().catch(() => {});

    // ── 3. Migrations données ────────────────────────────────────────────────
    await this.migrateDeduplicateBatch();
    await this.autoImportAprilBatch();

    this.setupNav();
    this.registerSW();
    BadgeSystem.trackStreak();
    this.checkNotifications();

    // ── 4. Vérifier identité sur cet appareil ────────────────────────────────
    if (!GardenSync.isDeviceSetup()) {
      const profiles = ProfileManager.getAll();
      if (profiles.length === 0) {
        // Jardin vide (admin vient de créer) → onboarding famille
        this.showFamilySetup();
      } else {
        // Jardin existant (enfant rejoint via lien) → "Qui es-tu ?"
        this.showWhoAreYou(profiles);
      }
      return;
    }

    this.updateHeaderProfile();

    const shared = this.checkSharedUrl();
    if (shared) {
      this.navigate('add-plant');
    } else {
      this.navigate('home');
    }

    setTimeout(() => this.checkBadges(), 1200);
  }

  updateHeaderProfile() {
    const profile = ProfileManager.getActive();
    if (!profile) return;
    const header = document.getElementById('app-header');
    if (!header) return;
    // Inject avatar button if not already present
    if (!header.querySelector('#profile-avatar-btn')) {
      const btn = document.createElement('button');
      btn.id = 'profile-avatar-btn';
      btn.className = 'profile-avatar-btn';
      btn.title = profile.name;
      btn.textContent = profile.emoji;
      btn.addEventListener('click', () => this.showProfileSwitcher());
      header.appendChild(btn);
    } else {
      header.querySelector('#profile-avatar-btn').textContent = profile.emoji;
    }
  }

  // ===== FAMILY SETUP (first launch) =====
  showFamilySetup() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay family-setup-overlay';
    overlay.style.background = 'linear-gradient(135deg,#1b4332 0%,#2d6a4f 100%)';
    overlay.innerHTML = `
      <div class="family-setup-sheet">
        <div style="text-align:center;margin-bottom:24px">
          <div style="font-size:48px;margin-bottom:8px">🌱</div>
          <h2 style="font-size:22px;font-weight:800;color:var(--text)">Bienvenue au Potager !</h2>
          <p style="font-size:14px;color:var(--text-mid);margin-top:6px">
            Qui va jardiner ? Ajoutez les membres de votre famille.
          </p>
        </div>
        <div id="setup-profiles-list" class="setup-profiles-list"></div>
        <div class="setup-add-row">
          <input class="form-input" id="setup-name" placeholder="Prénom…" maxlength="20">
          <button class="setup-emoji-btn" id="setup-emoji-pick">🌱</button>
          <select class="form-select setup-role-sel" id="setup-role">
            <option value="adult">👨‍🌾 Adulte</option>
            <option value="kid" selected>🧒 Enfant</option>
          </select>
          <button class="btn btn-primary btn-sm" id="setup-add-member">Ajouter</button>
        </div>
        <div id="setup-emoji-grid" class="setup-emoji-grid" style="display:none">
          ${['🌱','🌿','🌻','🍅','🥕','🐛','🦋','🐝','🌸','🍓','🧑‍🌾','👨‍🌾','👩‍🌾','🌈','⭐','🔥'].map(e =>
            `<button class="setup-emoji-opt">${e}</button>`
          ).join('')}
        </div>
        <button class="btn btn-primary btn-full" id="setup-done" style="display:none;margin-top:20px">
          Commencer l'aventure →
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    let pickedEmoji = '🌱';
    const list = overlay.querySelector('#setup-profiles-list');
    const doneBtn = overlay.querySelector('#setup-done');
    const emojiBtn = overlay.querySelector('#setup-emoji-pick');
    const emojiGrid = overlay.querySelector('#setup-emoji-grid');

    overlay.querySelectorAll('.setup-emoji-opt').forEach(b => {
      b.addEventListener('click', () => {
        pickedEmoji = b.textContent;
        emojiBtn.textContent = pickedEmoji;
        emojiGrid.style.display = 'none';
      });
    });
    emojiBtn.addEventListener('click', () => {
      emojiGrid.style.display = emojiGrid.style.display === 'none' ? 'flex' : 'none';
    });

    const refreshList = () => {
      const profiles = ProfileManager.getAll();
      list.innerHTML = profiles.map(p => `
        <div class="setup-profile-item">
          <span style="font-size:24px">${p.emoji}</span>
          <span style="font-weight:700">${p.name}</span>
          <span class="setup-role-badge">${p.role === 'adult' ? '👨‍🌾 Adulte' : '🧒 Enfant'}</span>
        </div>
      `).join('');
      doneBtn.style.display = profiles.length ? '' : 'none';
    };

    overlay.querySelector('#setup-add-member').addEventListener('click', () => {
      const name = overlay.querySelector('#setup-name').value.trim();
      const role = overlay.querySelector('#setup-role').value;
      if (!name) return;
      const id = ProfileManager.create(name, pickedEmoji, role);
      if (ProfileManager.getAll().length === 1) ProfileManager.setActive(id);
      overlay.querySelector('#setup-name').value = '';
      refreshList();
    });

    overlay.querySelector('#setup-done').addEventListener('click', () => {
      GardenSync.markDeviceSetup();
      overlay.remove();
      this.updateHeaderProfile();
      this.navigate('home');
      setTimeout(() => this.checkBadges(), 1200);
    });
  }

  // ===== GARDEN SETUP (premier lancement — aucun jardin connu) =====
  showGardenSetup() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay garden-setup-overlay';
    overlay.innerHTML = `
      <div class="garden-setup-sheet">
        <div class="garden-setup-logo">🌱</div>
        <h1 class="garden-setup-title">Mon Potager</h1>
        <p class="garden-setup-sub">Gérez votre potager en famille,<br>chacun sur son téléphone.</p>

        <button class="btn btn-primary btn-full garden-setup-cta" id="btn-create-garden">
          Créer mon jardin →
        </button>

        <div class="garden-setup-divider"><span>ou rejoindre un jardin existant</span></div>

        <div class="garden-setup-join-row">
          <input class="form-input" id="garden-join-input"
            placeholder="Coller le lien ou le code…" autocomplete="off" spellcheck="false">
          <button class="btn btn-outline" id="btn-join-garden">Rejoindre</button>
        </div>
        <p class="garden-setup-hint">💡 Demandez le lien d'invitation à l'administrateur du jardin.</p>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#btn-create-garden').addEventListener('click', async () => {
      const btn = overlay.querySelector('#btn-create-garden');
      btn.disabled = true;
      btn.textContent = 'Création…';
      await GardenSync.createGarden();
      // Migration des données IndexedDB existantes
      await GardenSync.migrateFromIndexedDB();
      overlay.remove();
      // Onboarding profils
      this.showFamilySetup();
    });

    overlay.querySelector('#btn-join-garden').addEventListener('click', () => {
      const raw = overlay.querySelector('#garden-join-input').value.trim();
      // Extraire l'ID depuis une URL ou un code direct
      let id = raw;
      try {
        const u = new URL(raw);
        id = u.searchParams.get('join') || raw;
      } catch (_) { /* raw n'est pas une URL valide, c'est déjà le code */ }

      if (!id || id.length < 4) {
        overlay.querySelector('#garden-join-input').style.borderColor = 'var(--danger)';
        return;
      }
      localStorage.setItem('potager-garden-id', id);
      window.location.reload();
    });
  }

  // ===== QUI ES-TU ? (appareil qui rejoint un jardin existant) =====
  showWhoAreYou(profiles) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title" style="text-align:center;font-size:20px;margin-bottom:6px">
          👋 Quel jardinier es-tu ?
        </div>
        <p style="text-align:center;font-size:14px;color:var(--text-mid);margin-bottom:20px">
          Choisis ton profil sur cet appareil.
        </p>
        <div class="who-are-you-grid">
          ${profiles.map(p => {
            const prog = ProfileManager.getLevelProgress(p.xp || 0);
            return `
              <div class="who-card" data-id="${p.id}">
                <span class="who-card-emoji">${p.emoji}</span>
                <div class="who-card-name">${p.name}</div>
                <div class="who-card-level">${prog.level.emoji} ${prog.level.label}</div>
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn btn-outline btn-full mt-12" id="btn-who-new">
          + Je suis un nouveau membre
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.who-card').forEach(card => {
      card.addEventListener('click', () => {
        ProfileManager.setActive(card.dataset.id);
        GardenSync.markDeviceSetup();
        overlay.remove();
        this.updateHeaderProfile();
        this.navigate('home');
        setTimeout(() => this.checkBadges(), 1200);
      });
    });

    overlay.querySelector('#btn-who-new').addEventListener('click', () => {
      overlay.remove();
      this.showFamilySetup();
    });
  }

  // ===== MODAL INVITATION ENFANTS =====
  showInviteModal() {
    const url = GardenSync.getInviteUrl();
    const code = GardenSync.gardenId;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">📤 Inviter mes enfants</div>
        <p style="font-size:14px;color:var(--text-mid);line-height:1.6;margin-bottom:16px">
          Partagez ce lien avec vos enfants. Ils peuvent l'ouvrir sur leur téléphone
          et installer l'app pour rejoindre <strong>votre potager</strong>.
        </p>

        <div class="invite-url-box">
          <span class="invite-url-text" id="invite-url-text">${url}</span>
          <button class="invite-copy-btn" id="btn-copy-invite">📋</button>
        </div>

        <div style="display:flex;align-items:center;gap:10px;margin:14px 0">
          <div style="flex:1;height:1px;background:var(--border)"></div>
          <span style="font-size:12px;color:var(--text-light)">Code du jardin</span>
          <div style="flex:1;height:1px;background:var(--border)"></div>
        </div>

        <div class="invite-code-box">
          <span style="font-size:22px;font-weight:900;letter-spacing:3px;color:var(--primary)">${code}</span>
        </div>

        <button class="btn btn-primary btn-full mt-12" id="btn-share-invite">
          📤 Partager via…
        </button>
        <button class="btn btn-outline btn-full mt-8" id="btn-close-invite">Fermer</button>
      </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    overlay.querySelector('#btn-copy-invite').addEventListener('click', async () => {
      await navigator.clipboard.writeText(url).catch(() => {});
      const btn = overlay.querySelector('#btn-copy-invite');
      btn.textContent = '✅';
      setTimeout(() => { btn.textContent = '📋'; }, 2000);
    });

    overlay.querySelector('#btn-share-invite').addEventListener('click', async () => {
      if (navigator.share) {
        await navigator.share({
          title: 'Rejoins mon potager !',
          text: 'Clique pour rejoindre notre potager partagé 🌱',
          url,
        }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url).catch(() => {});
        alert('Lien copié ! Collez-le dans un SMS ou email.');
      }
    });

    overlay.querySelector('#btn-close-invite').addEventListener('click', () => overlay.remove());
  }

  // ===== PROFILE SWITCHER =====
  showProfileSwitcher() {
    const profiles = ProfileManager.getAll();
    const active = ProfileManager.getActive();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">👨‍👩‍👧‍👦 Qui jardine ?</div>
        <div class="profile-list">
          ${profiles.map(p => {
            const prog = ProfileManager.getLevelProgress(p.xp || 0);
            return `
              <div class="profile-item ${p.id === active?.id ? 'active' : ''}" data-id="${p.id}">
                <span class="profile-emoji">${p.emoji}</span>
                <div class="profile-item-info">
                  <div class="profile-item-name">${p.name}</div>
                  <div class="profile-item-level">${prog.level.emoji} ${prog.level.label} · ${p.xp || 0} XP</div>
                  <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:${prog.pct}%"></div></div>
                </div>
                ${p.id === active?.id ? '<span class="profile-check">✓</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn btn-outline btn-full mt-12" id="btn-add-profile">+ Ajouter un membre</button>
        <button class="btn btn-invite btn-full mt-8" id="btn-invite-kids">📤 Inviter mes enfants</button>
      </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.profile-item').forEach(item => {
      item.addEventListener('click', () => {
        ProfileManager.setActive(item.dataset.id);
        this.updateHeaderProfile();
        overlay.remove();
        this.navigate('home');
      });
    });

    overlay.querySelector('#btn-add-profile').addEventListener('click', () => {
      overlay.remove();
      this.showAddProfileModal();
    });

    overlay.querySelector('#btn-invite-kids').addEventListener('click', () => {
      overlay.remove();
      this.showInviteModal();
    });
  }

  showAddProfileModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">Nouveau membre</div>
        <div class="form-group">
          <label class="form-label">Prénom</label>
          <input class="form-input" id="new-profile-name" placeholder="Prénom…" maxlength="20">
        </div>
        <div class="form-group">
          <label class="form-label">Avatar</label>
          <div class="setup-emoji-grid" style="display:flex">
            ${['🌱','🌿','🌻','🍅','🥕','🐛','🦋','🐝','🌸','🍓','🧑‍🌾','👨‍🌾','👩‍🌾','🌈','⭐','🔥'].map(e =>
              `<button class="setup-emoji-opt">${e}</button>`
            ).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Rôle</label>
          <select class="form-select" id="new-profile-role">
            <option value="adult">👨‍🌾 Adulte</option>
            <option value="kid" selected>🧒 Enfant</option>
          </select>
        </div>
        <button class="btn btn-primary btn-full" id="btn-save-profile">Créer le profil</button>
      </div>
    `;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    let pickedEmoji = '🌱';
    overlay.querySelectorAll('.setup-emoji-opt').forEach(b => {
      b.addEventListener('click', () => {
        overlay.querySelectorAll('.setup-emoji-opt').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        pickedEmoji = b.textContent;
      });
    });

    overlay.querySelector('#btn-save-profile').addEventListener('click', () => {
      const name = overlay.querySelector('#new-profile-name').value.trim();
      const role = overlay.querySelector('#new-profile-role').value;
      if (!name) return;
      const id = ProfileManager.create(name, pickedEmoji, role);
      ProfileManager.setActive(id);
      this.updateHeaderProfile();
      overlay.remove();
      this.navigate('home');
    });
  }

  // One-time migration: merge duplicate batch plants created by old import code
  async migrateDeduplicateBatch() {
    if (localStorage.getItem('migration-dedup-batch-v2')) return;
    localStorage.setItem('migration-dedup-batch-v2', '1');

    try {
      const BATCH_QTY = {
        'basilic|Grand vert': 4,
        'capucine|Empress of India': 4,
        'capucine|Couleurs mélangées': 4,
        'tagete|Double Pinwheel': 4,
        'bourrache|Bleue': 4,
        'salade|Buttercrunch': 3,
        'tabac|Ghost Pipes': 3,
      };

      const plants = await db.getPlants();
      const batchPlants = plants.filter(p => p.plantedAt === '2026-04-02');

      // Group by dbId+variety
      const groups = {};
      batchPlants.forEach(p => {
        const key = `${p.dbId}|${p.variety || ''}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      });

      for (const [key, group] of Object.entries(groups)) {
        if (group.length <= 1) {
          // Single entry: just ensure quantity is set
          if (!group[0].quantity) {
            await db.updatePlant({ ...group[0], quantity: BATCH_QTY[key] || 1 });
          }
          continue;
        }
        // Multiple entries: keep first with correct quantity, delete the rest
        await db.updatePlant({ ...group[0], quantity: BATCH_QTY[key] || group.length });
        for (let i = 1; i < group.length; i++) {
          await db.deletePlant(group[i].id);
        }
      }
    } catch (e) {
      console.warn('Migration dedup failed:', e);
    }

    // Always reset import flag so the banner is visible to re-import if needed
    localStorage.removeItem('semis-20260402-imported');
  }

  // Auto-import April 2 batch if not already done
  async autoImportAprilBatch() {
    if (localStorage.getItem('auto-import-april2-v1')) return;

    const BATCH = [
      { dbId: 'basilic',   variety: 'Grand vert',          qty: 4, location: 'B2',          note: 'En godets — entre les tomates' },
      { dbId: 'capucine',  variety: 'Empress of India',    qty: 4, location: 'bordures',     note: 'Naine — bordure de toutes les planches' },
      { dbId: 'capucine',  variety: 'Couleurs mélangées',  qty: 4, location: 'piquet Ouest', note: 'Grimpante — piquet côté Ouest' },
      { dbId: 'tagete',    variety: 'Double Pinwheel',     qty: 4, location: 'B2',           note: 'Au pied des tomates en B2' },
      { dbId: 'bourrache', variety: 'Bleue',               qty: 4, location: 'bordures',     note: 'Bordure de toutes les planches' },
      { dbId: 'salade',    variety: 'Buttercrunch',        qty: 3, location: 'terre-plate',  note: 'Espaces libres zone terre plate' },
      { dbId: 'tabac',     variety: 'Ghost Pipes',         qty: 3, location: 'B2-B3',        note: 'Intercalé entre B2 et B3' },
    ];

    try {
      const existing = await db.getPlants();
      for (const b of BATCH) {
        const alreadyIn = existing.some(p =>
          p.dbId === b.dbId && p.variety === b.variety && p.plantedAt === '2026-04-02'
        );
        if (alreadyIn) continue;
        const plantId = await db.addPlant({
          dbId: b.dbId,
          variety: b.variety,
          plantedAt: '2026-04-02',
          location: b.location,
          status: 'growing',
          quantity: b.qty,
        });
        await db.addNote(plantId, b.note, 'note');
      }
      localStorage.setItem('auto-import-april2-v1', '1');
      localStorage.setItem('semis-20260402-imported', '1');
    } catch (e) {
      console.warn('Auto-import April batch failed:', e);
    }
  }

  async checkBadges() {
    const stats = await db.getStats();
    const plants = await db.getPlants();
    const growing = plants.filter(p => p.status !== 'removed');
    const locations = new Set(growing.map(p => p.location).filter(Boolean));
    const categories = new Set(growing.map(p => {
      const dbP = PLANTS_DB.find(d => d.id === p.dbId);
      return p.category || dbP?.category;
    }).filter(Boolean));
    const hasCompanion = growing.some(p => {
      const dbP = PLANTS_DB.find(d => d.id === p.dbId);
      return (p.category || dbP?.category) === 'fleur-compagne';
    });

    const badgeStats = {
      totalPlants: growing.length,
      notes: stats.notes,
      harvests: stats.harvests,
      streak: BadgeSystem.trackStreak(),
      hasCompanion,
      zones: locations.size,
      categories: categories.size
    };

    const newBadges = await BadgeSystem.check(badgeStats);
    newBadges.forEach(b => BadgeSystem.showToast(b));
  }

  checkNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const nextPhases = MoonCalc.getNextPhases(new Date());
    const soon = nextPhases.filter(p => p.daysUntil <= 1);
    soon.forEach(phase => {
      const key = `notif-${phase.name}-${new Date().toDateString()}`;
      if (!localStorage.getItem(key)) {
        new Notification(`${phase.emoji} ${phase.name} ${phase.daysUntil === 0 ? 'aujourd\'hui' : 'demain'} !`, {
          body: phase.dateStr, icon: './icon.svg', badge: './icon.svg'
        });
        localStorage.setItem(key, '1');
      }
    });
  }

  async requestNotifications() {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') this.checkNotifications();
    this.navigate('home');
  }

  // Check if app was opened via Share Target (Kokopelli URL shared from browser)
  checkSharedUrl() {
    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get('shared_url') || params.get('text') || '';
    if (!sharedUrl || !sharedUrl.includes('kokopelli')) return null;

    const parsed = this.parseKokopelliUrl(sharedUrl);
    if (parsed) {
      this._kokopelliImport = parsed;
      // Clean the URL bar without reload
      history.replaceState({}, '', './index.html');
      return parsed;
    }
    return null;
  }

  // Parse a Kokopelli product URL to extract plant + variety
  // e.g. /fr/p/tomate-marmande-lycopersicon-esculentum → { plant: <dbEntry>, variety: 'Marmande' }
  parseKokopelliUrl(url) {
    const match = url.match(/\/(?:fr|en)\/p\/([^/?#\s]+)/);
    if (!match) return { plant: null, variety: '', url };

    const slug = match[1];
    const parts = slug.split('-');

    // Latin name stopwords — marks end of French variety name
    const LATIN = new Set([
      'lycopersicon','solanum','daucus','lactuca','phaseolus','capsicum',
      'brassica','allium','ocimum','petroselinum','borago','tagetes',
      'tropaeolum','nicotiana','beta','cucumis','cucurbita','fragaria',
      'raphanus','spinacia','mentha'
    ]);

    // Name aliases → PLANTS_DB id
    const ALIAS = {
      'tomate':'tomate','courgette':'courgette','carotte':'carotte',
      'salade':'salade','laitue':'salade','mesclun':'salade',
      'haricot':'haricot','poivron':'poivron','aubergine':'aubergine',
      'radis':'radis','oignon':'oignon','ail':'ail','basilic':'basilic',
      'persil':'persil','ciboulette':'ciboulette','menthe':'menthe',
      'epinard':'epinard','fraise':'fraise','concombre':'concombre',
      'betterave':'betterave','capucine':'capucine','tagete':'tagete',
      'tagetes':'tagete','bourrache':'bourrache','tabac':'tabac',
      'nicotiana':'tabac','pomme':'pomme-de-terre','piment':'poivron'
    };

    // Try matching first 1 or 2 parts as plant name
    let matchedPlant = null;
    let varietyStart = 1;
    for (let i = Math.min(2, parts.length); i >= 1; i--) {
      const candidate = parts.slice(0, i).join('-');
      const dbId = ALIAS[candidate];
      const plant = dbId ? PLANTS_DB.find(p => p.id === dbId) : null;
      if (plant) { matchedPlant = plant; varietyStart = i; break; }
    }

    // Extract variety parts (stop at latin indicators)
    const varietyParts = [];
    for (let i = varietyStart; i < parts.length; i++) {
      if (LATIN.has(parts[i])) break;
      varietyParts.push(parts[i].charAt(0).toUpperCase() + parts[i].slice(1));
    }
    const variety = varietyParts.join(' ');

    return { plant: matchedPlant, variety, slug, url };
  }

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.view));
    });
  }

  navigate(view, params = {}) {
    this.state.view = view;
    this.state.params = params;
    this.activeTab = 'fiche';

    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });

    const navViews = ['home', 'plants', 'tasks', 'moon', 'garden'];
    const showNav = navViews.includes(view);
    document.getElementById('app-nav').style.display = showNav ? 'flex' : 'none';

    this.renderView(view, params);
  }

  async renderView(view, params) {
    const main = document.getElementById('app-main');
    const header = document.getElementById('app-header');

    main.className = 'view-enter';

    switch (view) {
      case 'home':     this.renderHeader(header, 'Mon Potager', false); main.innerHTML = await this.viewHome(); break;
      case 'plants':   this.renderHeader(header, 'Mes Plantes', false); main.innerHTML = await this.viewPlants(); break;
      case 'tasks':    this.renderHeader(header, 'Mes Tâches', false); main.innerHTML = await this.viewTasks(); break;
      case 'calendar': this.renderHeader(header, 'Calendrier Lunaire', true); main.innerHTML = this.viewCalendar(); break;
      case 'moon':     this.renderHeader(header, 'Lune & Biodynamie', false); main.innerHTML = this.viewMoon(); break;
      case 'garden':   this.renderHeader(header, 'Plan du Jardin', false); main.innerHTML = await this.viewGarden(); break;
      case 'stats':    this.renderHeader(header, 'Statistiques & Badges', true); main.innerHTML = await this.viewStats(); break;
      case 'journal':  this.renderHeader(header, 'Journal de saison', true); main.innerHTML = await this.viewJournal(); break;
      case 'rotation': this.renderHeader(header, 'Rotation des cultures', true); main.innerHTML = this.viewRotation(); break;
      case 'plant-detail': this.renderHeader(header, '', true); main.innerHTML = await this.viewPlantDetail(params.id); break;
      case 'add-plant': this.renderHeader(header, 'Ajouter une plante', true); main.innerHTML = this.viewAddPlant(); break;
      case 'add-note': this.renderHeader(header, 'Ajouter une note', true); main.innerHTML = this.viewAddNote(params.plantId); break;
      case 'add-harvest': this.renderHeader(header, 'Enregistrer une récolte', true); main.innerHTML = this.viewAddHarvest(params.plantId); break;
    }

    this.attachListeners(view, params);
  }

  renderHeader(header, title, showBack) {
    header.innerHTML = `
      ${showBack ? `<button class="header-back" id="btn-back">←</button>` : ''}
      <span class="header-title">${title}</span>
    `;
    if (showBack) {
      document.getElementById('btn-back').addEventListener('click', () => history.back() || this.navigate('home'));
    }
  }

  // ===== HOME VIEW =====
  async viewHome() {
    const profile = ProfileManager.getActive();
    if (profile?.role === 'kid') return this.viewKidHome(profile);
    const now = new Date();
    const phase = MoonCalc.getPhase(now);
    const phaseName = MoonCalc.getPhaseName(phase);
    const phaseEmoji = MoonCalc.getPhaseEmoji(phase);
    const illumination = Math.round(MoonCalc.getIllumination(phase) * 100);
    const bioType = MoonCalc.getBiodynamicType(now);
    const bioLabel = MoonCalc.getBiodynamicLabel(bioType);
    const phaseAdvice = MoonCalc.getPhaseAdvice(phase);
    const stats = await db.getStats();
    const recent = await db.getRecentPlants(4);
    const succReminders = await this.getSuccessionReminders();

    // Weather (async, injected after render)
    const weatherHTML = `<div class="weather-widget" id="weather-widget">
      <div class="weather-loading">⛅ Chargement météo…</div></div>`;

    const showNotifBanner = ('Notification' in window) && Notification.permission === 'default';

    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    const plantCount = stats.plants;

    return `
      <p class="home-greeting">Bonjour 👋</p>
      <p class="home-date">${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>

      ${plantCount === 0 ? `
        <div class="card mb-12" style="border-color:#a5d6a7;background:#f1f8e9">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:20px">🌱</span>
            <strong style="color:#2e7d32">Semis du 2 avril prêts à importer</strong>
          </div>
          <p style="font-size:13px;color:#388e3c;margin-bottom:10px;line-height:1.5">
            Vos 7 lots de godets ne sont pas encore dans l'app. Cliquez pour les ajouter.
          </p>
          <button class="btn btn-primary btn-sm" id="btn-force-import" style="background:#388e3c">
            Importer mes semis →
          </button>
        </div>
      ` : ''}

      ${showNotifBanner ? `<div class="notif-banner">
        🔔 Recevez des rappels pour la lune et vos semis
        <button id="btn-enable-notif">Activer</button>
      </div>` : ''}

      ${weatherHTML}

      <div class="moon-widget card" style="cursor:pointer" id="home-moon-btn">
        <div class="moon-widget-emoji">${phaseEmoji}</div>
        <div class="moon-widget-info">
          <div class="moon-widget-phase">${phaseName}</div>
          <div class="moon-widget-ill">${illumination}% illuminée</div>
          <span class="badge badge-${bioType}">${bioLabel.emoji} ${bioLabel.label}</span>
        </div>
      </div>

      <div class="rec-card card">
        <div class="bio-stripe ${bioType}"></div>
        <div class="rec-header">
          <span style="font-size:18px">${bioLabel.emoji}</span>
          <span class="rec-title">${bioLabel.label}</span>
        </div>
        <p class="rec-advice">${bioLabel.advice}</p>
        <p class="rec-phase">${phaseAdvice}</p>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-number">${stats.plants}</span>
          <span class="stat-label">Variétés</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${stats.notes}</span>
          <span class="stat-label">Notes</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${stats.harvests}</span>
          <span class="stat-label">Récoltes</span>
        </div>
      </div>

      ${succReminders.length > 0 ? `
        <div class="section-header">
          <span class="section-title">🔄 Semis à planifier</span>
        </div>
        <div class="reminder-list" id="reminders-list">
          ${succReminders.map(r => {
            const badgeCls = r.daysUntil < 0 ? 'overdue' : r.daysUntil <= 3 ? 'soon' : 'ok';
            const badgeTxt = r.daysUntil < 0 ? `En retard de ${Math.abs(r.daysUntil)}j`
              : r.daysUntil === 0 ? 'Aujourd\'hui !'
              : r.daysUntil <= 3 ? 'Dans ' + r.daysUntil + 'j'
              : 'Dans ' + r.daysUntil + 'j';
            return `
              <div class="reminder-item" data-plant-id="${r.plant.id}">
                <span class="reminder-emoji">${r.dbPlant.emoji}</span>
                <div class="reminder-info">
                  <div class="reminder-name">${r.dbPlant.name}${r.plant.variety ? ' · ' + r.plant.variety : ''}</div>
                  <div class="reminder-detail">Prochain lot : ${r.nextDateStr}</div>
                </div>
                <span class="reminder-badge ${badgeCls}">${badgeTxt}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <div class="section-header">
        <span class="section-title">Mes plantes récentes</span>
        <button class="section-link" id="home-see-all">Voir tout →</button>
      </div>

      ${recent.length === 0
        ? `<div class="empty-state">
            <span class="empty-icon">🌱</span>
            <h3>Aucune plante encore</h3>
            <p>Commencez par ajouter vos premières variétés !</p>
            <button class="btn btn-primary mt-12" id="home-add-plant">+ Ajouter une plante</button>
          </div>`
        : `<div class="recent-plants-grid">
            ${recent.map(p => this.plantCardHTML(p)).join('')}
          </div>`
      }

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
        <button class="btn btn-outline" id="btn-go-stats" style="justify-content:center;gap:6px">
          📊 Statistiques
        </button>
        <button class="btn btn-outline" id="btn-go-journal" style="justify-content:center;gap:6px">
          📖 Journal 2026
        </button>
      </div>

      <button class="fab" id="fab-quick-note" title="Note rapide">✏️</button>
    `;
  }

  // ===== KID HOME VIEW =====
  async viewKidHome(profile) {
    const prog = ProfileManager.getLevelProgress(profile.xp || 0);
    const allProfiles = ProfileManager.getAll();
    const sorted = [...allProfiles].sort((a, b) => (b.xp || 0) - (a.xp || 0));

    // Adopted plants
    const allPlants = await db.getPlants();
    const owned = allPlants.filter(p => p.ownerId === profile.id && p.status !== 'removed');

    // Tasks as quests
    const weatherData = await Weather.fetch().catch(() => null);
    const tasks = await TaskEngine.generateTasks(weatherData);
    const quests = tasks.filter(t => !t.checked).slice(0, 3);

    const questTypeLabels = {
      acclimatation: { emoji: '🌤', text: 'Sortir dehors pour s\'habituer' },
      repiquage:     { emoji: '🌱', text: 'Planter en pleine terre' },
      recolte:       { emoji: '🧺', text: 'Cueillir et récolter' },
    };

    const leaderHTML = sorted.map((p, i) => {
      const pProg = ProfileManager.getLevelProgress(p.xp || 0);
      const isMe = p.id === profile.id;
      const medals = ['🥇','🥈','🥉'];
      return `
        <div class="kid-leader-item ${isMe ? 'me' : ''}">
          <span class="kid-leader-rank">${medals[i] || `${i+1}`}</span>
          <span style="font-size:22px">${p.emoji}</span>
          <div class="kid-leader-info">
            <div class="kid-leader-name">${p.name}${isMe ? ' (moi)' : ''}</div>
            <div class="kid-leader-level">${pProg.level.emoji} ${pProg.level.label}</div>
          </div>
          <span class="kid-leader-xp">${p.xp || 0} XP</span>
        </div>
      `;
    }).join('');

    const ownedHTML = owned.length === 0
      ? `<div class="kid-adopt-empty">
           <span style="font-size:32px">🌱</span>
           <p>Tu n'as pas encore adopté de plante !<br>Va dans une fiche et clique <strong>Adopter</strong>.</p>
         </div>`
      : owned.map(p => {
          const dbP = PLANTS_DB.find(d => d.id === p.dbId);
          const emoji = p.customEmoji || dbP?.emoji || '🌱';
          const name = p.customName || dbP?.name || 'Plante';
          return `<div class="kid-plant-chip" data-plant-id="${p.id}">
            <span style="font-size:22px">${emoji}</span>
            <span>${name}${p.variety ? ' · ' + p.variety : ''}</span>
          </div>`;
        }).join('');

    const questsHTML = quests.length === 0
      ? `<div class="kid-quest-empty">🎉 Aucune mission urgente ! Profites-en pour observer le jardin.</div>`
      : quests.map(t => {
          const def = TaskEngine.TASK_DEF[t.type];
          const qt = questTypeLabels[t.type] || { emoji: def.emoji, text: def.label };
          const urgClass = t.daysUntil <= 0 ? 'overdue' : t.daysUntil <= 3 ? 'soon' : 'ok';
          return `
            <div class="kid-quest-card ${urgClass}" data-task-id="${t.id}" data-plant-id="${t.plantId}">
              <div class="kid-quest-top">
                <span class="kid-quest-emoji">${qt.emoji}</span>
                <div class="kid-quest-info">
                  <div class="kid-quest-plant">${t.plantEmoji} ${t.plantName}${t.variety ? ' · ' + t.variety : ''}</div>
                  <div class="kid-quest-action">${qt.text}</div>
                </div>
                <span class="kid-quest-xp">+20 XP</span>
              </div>
              <div class="kid-quest-date">${
                t.daysUntil < 0 ? `En retard de ${Math.abs(t.daysUntil)} jours !`
                : t.daysUntil === 0 ? `Aujourd'hui !`
                : t.daysUntil === 1 ? 'Demain'
                : `Dans ${t.daysUntil} jours`
              }</div>
              <label class="kid-quest-check-wrap">
                <input type="checkbox" class="task-check" data-task-id="${t.id}" ${t.checked ? 'checked' : ''}>
                <span class="kid-quest-check-label">${t.checked ? '✅ Fait !' : 'Marquer comme fait'}</span>
              </label>
            </div>
          `;
        }).join('');

    return `
      <div class="kid-home">
        <div class="kid-hero">
          <span class="kid-hero-emoji">${profile.emoji}</span>
          <div class="kid-hero-info">
            <div class="kid-hero-name">Salut ${profile.name} ! 👋</div>
            <div class="kid-hero-level">${prog.level.emoji} ${prog.level.label}</div>
          </div>
          <div class="kid-hero-xp">${profile.xp || 0} XP</div>
        </div>

        <div class="kid-xp-section">
          <div class="kid-xp-label">
            <span>Progression</span>
            ${prog.xpToNext > 0 ? `<span>${prog.xpToNext} XP pour <strong>${prog.next?.label}</strong></span>` : '<span>Niveau max ! 🏆</span>'}
          </div>
          <div class="kid-xp-bar"><div class="kid-xp-fill" style="width:${prog.pct}%"></div></div>
        </div>

        <div class="kid-section-title">🎯 Missions du jour</div>
        <div class="kid-quests">${questsHTML}</div>

        <div class="kid-section-title">🌱 Mes plantes adoptées</div>
        <div class="kid-owned">${ownedHTML}</div>

        <div class="kid-section-title">🏆 Classement famille</div>
        <div class="kid-leaderboard">${leaderHTML}</div>

        <div class="kid-explore-row">
          <button class="kid-explore-btn" onclick="app.navigate('plants')">🌿<br>Plantes</button>
          <button class="kid-explore-btn" onclick="app.navigate('tasks')">📋<br>Tâches</button>
          <button class="kid-explore-btn" onclick="app.navigate('moon')">🌙<br>Lune</button>
          <button class="kid-explore-btn" onclick="app.navigate('garden')">🗺<br>Jardin</button>
        </div>
      </div>
    `;
  }

  // Show a floating +XP toast
  showXpToast(earned, action) {
    if (!earned) return;
    const labels = {
      task_complete:  'Tâche accomplie !',
      note_added:     'Note ajoutée',
      photo_note:     'Photo ajoutée',
      harvest_logged: 'Récolte enregistrée',
      plant_added:    'Plante ajoutée',
      plant_adopted:  'Plante adoptée !',
    };
    const toast = document.createElement('div');
    toast.className = 'xp-toast';
    toast.innerHTML = `<span class="xp-toast-amt">+${earned} XP</span> <span class="xp-toast-label">${labels[action] || ''}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('out'), 1800);
    setTimeout(() => toast.remove(), 2300);
  }

  plantCardHTML(plant) {
    const dbPlant = PLANTS_DB.find(p => p.id === plant.dbId);
    const emoji = plant.customEmoji || (dbPlant ? dbPlant.emoji : '🌱');
    const name = plant.customName || (dbPlant ? dbPlant.name : 'Plante');
    const cat = plant.category || (dbPlant ? dbPlant.category : '');
    const catColor = CATEGORIES[cat] ? CATEGORIES[cat].color : '#52b788';
    const date = new Date(plant.plantedAt || plant.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const statusKey = plant.growthStatus || plant.status || 'semis';
    const st = PLANT_STATUS[statusKey] || PLANT_STATUS.semis;

    const qty = plant.quantity && plant.quantity > 1
      ? `<span style="position:absolute;top:8px;left:8px;background:var(--primary);color:white;font-size:10px;font-weight:800;padding:2px 6px;border-radius:10px">×${plant.quantity}</span>`
      : '';
    return `
      <div class="plant-card" data-plant-id="${plant.id}">
        ${qty}
        <div class="plant-card-cat" style="background:${catColor}"></div>
        <span class="plant-card-emoji">${emoji}</span>
        <div class="plant-card-name">${name}</div>
        <div class="plant-card-variety">${plant.variety || '—'}</div>
        <div style="margin-top:6px">
          <span class="status-badge" style="background:${st.color};color:${st.textColor}">${st.emoji} ${st.label}</span>
        </div>
        <div class="plant-card-date" style="margin-top:4px">🗓 ${date}</div>
      </div>
    `;
  }

  // ===== PLANTS VIEW =====
  async viewPlants() {
    let plants = await db.getPlants();
    plants = plants.filter(p => p.status !== 'removed');

    if (this.plantSearch) {
      const q = this.plantSearch.toLowerCase();
      plants = plants.filter(p => {
        const dbP = PLANTS_DB.find(d => d.id === p.dbId);
        const name = (p.customName || (dbP ? dbP.name : '')).toLowerCase();
        return name.includes(q) || (p.variety || '').toLowerCase().includes(q);
      });
    }
    if (this.plantFilter) {
      plants = plants.filter(p => {
        const dbP = PLANTS_DB.find(d => d.id === p.dbId);
        return (p.category || (dbP ? dbP.category : '')) === this.plantFilter;
      });
    }

    return `
      <button class="catalog-btn" id="btn-koko-catalog">
        🌻 Parcourir le catalogue Kokopelli →
      </button>
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" class="form-input" id="plant-search" placeholder="Rechercher une plante…" value="${this.plantSearch}">
      </div>
      <div class="filter-scroll">
        <button class="filter-btn ${!this.plantFilter ? 'active' : ''}" data-cat="">Tout</button>
        ${Object.entries(CATEGORIES).map(([k, v]) =>
          `<button class="filter-btn ${this.plantFilter === k ? 'active' : ''}" data-cat="${k}">${v.emoji} ${v.label}</button>`
        ).join('')}
      </div>
      ${plants.length === 0
        ? `<div class="empty-state">
            <span class="empty-icon">${this.plantSearch || this.plantFilter ? '🔍' : '🌱'}</span>
            <h3>${this.plantSearch || this.plantFilter ? 'Aucun résultat' : 'Votre potager est vide'}</h3>
            <p>${this.plantSearch || this.plantFilter ? 'Essayez une autre recherche.' : 'Ajoutez vos premières variétés !'}</p>
          </div>`
        : `<div class="plants-grid">${plants.map(p => this.plantCardHTML(p)).join('')}</div>`
      }
      <button class="fab" id="fab-add-plant" title="Ajouter une plante">+</button>
    `;
  }

  // ===== PLANT DETAIL VIEW =====
  async viewPlantDetail(id) {
    const plant = await db.getPlant(id);
    if (!plant) return '<p>Plante introuvable.</p>';

    const dbPlant = PLANTS_DB.find(p => p.id === plant.dbId);
    const emoji = plant.customEmoji || (dbPlant ? dbPlant.emoji : '🌱');
    const name = plant.customName || (dbPlant ? dbPlant.name : 'Plante');
    const date = new Date(plant.plantedAt || plant.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    document.querySelector('.header-title').textContent = name;

    const [notes, harvests] = await Promise.all([
      db.getNotes(id),
      db.getHarvests(id)
    ]);

    // Kokopelli product URL stored with the plant
    const kokoUrlBadge = plant.kokoUrl ? `
      <a href="${plant.kokoUrl}" target="_blank" rel="noopener"
         style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;
                padding:6px 14px;background:#fff8e1;border:1px solid #d4a017;
                border-radius:20px;font-size:13px;font-weight:700;color:#7b4f00;text-decoration:none">
        🌻 Fiche Kokopelli ↗
      </a>` : '';

    const ficheHTML = (dbPlant ? this.ficheHTML(dbPlant, plant) : `
      <div class="card">
        <p style="color:var(--text-mid)">${plant.description || 'Aucune description.'}</p>
      </div>
    `) + kokoUrlBadge;

    return `
      <div class="plant-hero">
        <span class="plant-hero-emoji">${emoji}</span>
        <div class="plant-hero-name">${name}</div>
        ${plant.variety ? `<div class="plant-hero-variety">${plant.variety}</div>` : ''}
        ${plant.quantity && plant.quantity > 1 ? `<div style="margin-bottom:4px"><span style="background:var(--primary);color:white;font-size:12px;font-weight:800;padding:3px 10px;border-radius:12px">×${plant.quantity} godets</span></div>` : ''}
        <div class="plant-hero-date">Planté le ${date}</div>
        ${plant.location ? `<div class="plant-hero-date">📍 ${plant.location}</div>` : ''}
      </div>

      ${this.plantTimelineHTML(plant)}

      ${this.statusStepperHTML(plant)}

      <div class="tabs-bar">
        <button class="tab-btn ${this.activeTab === 'fiche' ? 'active' : ''}" data-tab="fiche">Fiche</button>
        <button class="tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes">Notes (${notes.length})</button>
        <button class="tab-btn ${this.activeTab === 'recoltes' ? 'active' : ''}" data-tab="recoltes">Récoltes (${harvests.length})</button>
      </div>

      <div class="tab-pane ${this.activeTab === 'fiche' ? 'active' : ''}" id="pane-fiche">
        ${ficheHTML}
        <div class="mt-12">
          <button class="btn btn-danger btn-sm" id="btn-delete-plant">Supprimer cette plante</button>
        </div>
      </div>

      <div class="tab-pane ${this.activeTab === 'notes' ? 'active' : ''}" id="pane-notes">
        ${notes.length === 0
          ? `<div class="empty-state"><span class="empty-icon">📝</span><h3>Aucune note</h3><p>Notez vos observations et résultats.</p></div>`
          : `<div class="notes-list">${notes.map(n => this.noteHTML(n)).join('')}</div>`
        }
      </div>

      <div class="tab-pane ${this.activeTab === 'recoltes' ? 'active' : ''}" id="pane-recoltes">
        ${harvests.length === 0
          ? `<div class="empty-state"><span class="empty-icon">🧺</span><h3>Aucune récolte</h3><p>Enregistrez vos premières récoltes !</p></div>`
          : `<div class="harvest-list">${harvests.map(h => this.harvestHTML(h)).join('')}</div>`
        }
        <button class="btn btn-outline btn-full mt-12" id="btn-add-harvest">🧺 Enregistrer une récolte</button>
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;padding-bottom:4px">
        <button class="btn btn-outline" style="flex:1;justify-content:center;font-size:13px" id="btn-resemer">
          🔄 Resemer
        </button>
        <button class="fab-inline" id="fab-add-note" title="Ajouter une note">✏️ Note</button>
      </div>

      <div style="margin-top:8px">
        ${plant.ownerId
          ? `<div class="adopt-badge">
               <span>${ProfileManager.getAll().find(p => p.id === plant.ownerId)?.emoji || '🌱'}</span>
               <span>Adoptée par <strong>${ProfileManager.getAll().find(p => p.id === plant.ownerId)?.name || '…'}</strong></span>
             </div>`
          : `<button class="btn btn-adopt" id="btn-adopt-plant">🌱 Adopter cette plante</button>`
        }
      </div>
    `;
  }

  statusStepperHTML(plant) {
    const steps = ['semis', 'croissance', 'floraison', 'recolte', 'termine'];
    const current = plant.growthStatus || (plant.status === 'removed' ? 'termine' : 'semis');
    const currentIdx = steps.indexOf(current);
    return `
      <div class="status-stepper" id="status-stepper">
        ${steps.map((s, i) => {
          const st = PLANT_STATUS[s];
          const isDone = i < currentIdx;
          const isActive = i === currentIdx;
          return `<div class="status-step ${isActive ? 'active' : isDone ? 'done' : ''}"
            data-status="${s}" data-plant-id="${plant.id}">
            <span class="step-emoji">${st.emoji}</span>
            <span>${st.label}</span>
          </div>`;
        }).join('')}
      </div>`;
  }

  // ===== STATS VIEW =====
  async viewStats() {
    const plants = await db.getPlants();
    const notes = await db.getAll('notes');
    const harvests = await db.getAll('harvests');
    const growing = plants.filter(p => p.status !== 'removed');

    // Monthly harvest counts (current year)
    const year = new Date().getFullYear();
    const byMonth = Array(12).fill(0);
    harvests.forEach(h => {
      const d = new Date(h.date);
      if (d.getFullYear() === year) byMonth[d.getMonth()]++;
    });
    const maxVal = Math.max(...byMonth, 1);

    const chartHTML = byMonth.map((v, i) => {
      const h = Math.round((v / maxVal) * 80);
      return `<div class="hchart-col">
        <div class="hchart-bar" style="height:${Math.max(h, v > 0 ? 8 : 0)}px">
          ${v > 0 ? `<span class="hchart-val">${v}</span>` : ''}
        </div>
        <span class="hchart-month">${MONTHS_SHORT[i]}</span>
      </div>`;
    }).join('');

    // Category breakdown
    const catCount = {};
    growing.forEach(p => {
      const dbP = PLANTS_DB.find(d => d.id === p.dbId);
      const cat = p.category || dbP?.category || 'autre';
      catCount[cat] = (catCount[cat] || 0) + 1;
    });

    const badges = BadgeSystem.getAll();
    const unlockedCount = badges.filter(b => b.unlocked).length;

    return `
      <div class="stats-full-grid">
        <div class="stats-full-card">
          <span class="stats-full-num">${growing.length}</span>
          <span class="stats-full-lbl">Plantes actives</span>
        </div>
        <div class="stats-full-card">
          <span class="stats-full-num">${plants.length}</span>
          <span class="stats-full-lbl">Total saison</span>
        </div>
        <div class="stats-full-card">
          <span class="stats-full-num">${notes.length}</span>
          <span class="stats-full-lbl">Notes journal</span>
        </div>
        <div class="stats-full-card">
          <span class="stats-full-num">${harvests.length}</span>
          <span class="stats-full-lbl">Récoltes</span>
        </div>
      </div>

      <div class="card mb-12">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">🧺 Récoltes ${year}</h3>
        <div class="harvest-chart-wrap">
          <div class="hchart">${chartHTML}</div>
        </div>
        ${harvests.length === 0 ? '<p style="font-size:13px;color:var(--text-light);text-align:center;margin-top:8px">Aucune récolte enregistrée pour l\'instant</p>' : ''}
      </div>

      <div class="card mb-12">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">🌱 Par catégorie</h3>
        ${Object.entries(catCount).map(([cat, n]) => {
          const c = CATEGORIES[cat] || { label: cat, emoji: '🌿', color: '#95d5b2' };
          const pct = Math.round((n / growing.length) * 100);
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:18px">${c.emoji}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;margin-bottom:3px">${c.label} <span style="color:var(--text-light);font-weight:400">(${n})</span></div>
              <div style="height:6px;background:var(--bg);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${c.color};border-radius:3px;transition:width 0.5s"></div>
              </div>
            </div>
            <span style="font-size:12px;color:var(--text-light);font-weight:700">${pct}%</span>
          </div>`;
        }).join('')}
      </div>

      <div class="card mb-12">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3 style="font-size:15px;font-weight:700">🏆 Succès (${unlockedCount}/${badges.length})</h3>
        </div>
        <div class="badges-grid">
          ${badges.map(b => `
            <div class="badge-card ${b.unlocked ? 'badge-rarity-' + b.rarity : 'locked'}" title="${b.desc}">
              <span class="badge-emoji">${b.emoji}</span>
              <span class="badge-label">${b.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <button class="btn btn-outline btn-full" id="btn-go-rotation" style="justify-content:center;gap:8px">
        🔄 Guide rotation des cultures
      </button>
    `;
  }

  // ===== TASKS VIEW =====
  async viewTasks() {
    const weatherData = await Weather.fetch().catch(() => null);
    const tasks = await TaskEngine.generateTasks(weatherData);

    if (tasks.length === 0) {
      const bioType = MoonCalc.getBiodynamicType(new Date());
      const bioLabel = MoonCalc.getBiodynamicLabel(bioType);
      return `
        <div class="empty-state" style="margin-top:40px">
          <span class="empty-icon">${bioLabel.emoji}</span>
          <h3>Aucune tâche urgente</h3>
          <p>${bioLabel.advice}</p>
          <button class="btn btn-outline mt-12" onclick="app.navigate('calendar')">📅 Voir le calendrier lunaire</button>
        </div>
      `;
    }

    const urgent = tasks.filter(t => !t.checked && t.daysUntil <= 7);
    const week   = tasks.filter(t => !t.checked && t.daysUntil > 7 && t.daysUntil <= 14);
    const coming = tasks.filter(t => !t.checked && t.daysUntil > 14);
    const done   = tasks.filter(t => t.checked);

    const taskCardHTML = (t) => {
      const def = TaskEngine.TASK_DEF[t.type];
      const urgLabel = t.daysUntil < 0 ? `En retard de ${Math.abs(t.daysUntil)}j`
        : t.daysUntil === 0 ? 'Aujourd\'hui !'
        : t.daysUntil === 1 ? 'Demain'
        : `${t.dateStr}${t.type === 'recolte' && t.dateEndStr ? ' → ' + t.dateEndStr : ''}`;
      const scoreBar = Math.round((t.urgency * 0.5 + t.weatherScore * 0.3 + t.moonScore * 0.2));

      return `
        <div class="task-card ${t.checked ? 'checked' : ''}" data-task-id="${t.id}" data-plant-id="${t.plantId}">
          <div class="task-card-bar" style="background:${def.border}"></div>
          <label class="task-card-check-wrap">
            <input type="checkbox" class="task-check" data-task-id="${t.id}" ${t.checked ? 'checked' : ''}>
          </label>
          <div class="task-card-body">
            <div class="task-card-title">
              ${def.emoji} ${t.plantEmoji} ${t.plantName}${t.variety ? ' · ' + t.variety : ''}
              ${t.quantity > 1 ? `<span class="task-qty">×${t.quantity}</span>` : ''}
            </div>
            <div class="task-card-sub">${def.label}${t.location ? ' · 📍 ' + t.location : ''}</div>
            <div class="task-card-date ${t.daysUntil < 0 ? 'overdue' : t.daysUntil <= 3 ? 'soon' : ''}">${urgLabel}</div>
            <div class="task-card-hints">
              <span class="task-hint">${t.weatherNote}</span>
              <span class="task-hint">${t.moonNote}</span>
            </div>
          </div>
          <div class="task-score">${scoreBar}</div>
        </div>
      `;
    };

    const sectionHTML = (title, dot, items, collapsible = false) => {
      if (!items.length) return '';
      const id = 'sec-' + title.replace(/\s/g,'');
      return `
        <div class="task-section">
          <div class="task-section-header">
            <span class="task-section-dot" style="background:${dot}"></span>
            <span class="task-section-title">${title}</span>
            <span class="task-section-count">${items.length}</span>
          </div>
          ${items.map(taskCardHTML).join('')}
        </div>
      `;
    };

    return `
      <div class="tasks-today-hint">
        ${MoonCalc.getPhaseEmoji(MoonCalc.getPhase(new Date()))} ${MoonCalc.getPhaseName(MoonCalc.getPhase(new Date()))}
        · ${MoonCalc.getBiodynamicLabel(MoonCalc.getBiodynamicType(new Date())).label}
        · ${weatherData ? weatherData.current.emoji + ' ' + weatherData.current.temp + '°C' : ''}
      </div>

      ${sectionHTML('🔴 Urgent — cette semaine', '#e63946', urgent)}
      ${sectionHTML('🟡 Dans 2 semaines', '#f4a261', week)}
      ${sectionHTML('🟢 À venir', '#52b788', coming)}
      ${done.length ? sectionHTML('✅ Faites', '#aaa', done) : ''}

      <div style="text-align:center;margin:20px 0">
        <button class="btn btn-outline btn-sm" onclick="app.navigate('calendar')">📅 Calendrier lunaire</button>
      </div>
    `;
  }

  // ===== PLANT TIMELINE BAR =====
  plantTimelineHTML(plant) {
    const steps = TaskEngine.getPlantTimeline(plant);
    if (steps.length <= 1) return '';

    const phaseColor = { past: '#52b788', overdue: '#e63946', today: '#f4a261', future: '#b7c9c1' };

    return `
      <div class="ptl-wrap">
        ${steps.map((s, i) => `
          <div class="ptl-step">
            <div class="ptl-icon" style="background:${phaseColor[s.phase] || '#b7c9c1'}">${s.emoji}</div>
            ${i < steps.length - 1 ? `<div class="ptl-line" style="background:${s.phase === 'past' ? '#52b788' : '#dce9e3'}"></div>` : ''}
            <div class="ptl-label">${s.label}</div>
            <div class="ptl-date">${s.dateStr}</div>
            <div class="ptl-rel ${s.phase}">${s.relStr}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ===== JOURNAL VIEW =====
  async viewJournal() {
    const plants = await db.getPlants();
    const notes = await db.getAll('notes');
    const harvests = await db.getAll('harvests');
    const year = new Date().getFullYear();

    const sortedNotes = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
    const sortedHarvests = [...harvests].sort((a, b) => new Date(b.date) - new Date(a.date));

    const plantName = (id) => {
      const p = plants.find(pl => pl.id === id);
      const dbP = p ? PLANTS_DB.find(d => d.id === p.dbId) : null;
      return p ? (p.customName || dbP?.name || '?') : '?';
    };
    const plantEmoji = (id) => {
      const p = plants.find(pl => pl.id === id);
      const dbP = p ? PLANTS_DB.find(d => d.id === p.dbId) : null;
      return p ? (p.customEmoji || dbP?.emoji || '🌱') : '🌱';
    };

    const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    return `
      <div class="journal-section">
        <div class="journal-section-title">🌱 Plantes cultivées en ${year} (${plants.filter(p=>p.status!=='removed').length})</div>
        ${plants.filter(p => p.status !== 'removed').map(p => {
          const dbP = PLANTS_DB.find(d => d.id === p.dbId);
          return `<div class="journal-entry">
            <span>${p.customEmoji || dbP?.emoji || '🌱'} ${p.customName || dbP?.name || '?'}${p.variety ? ' · ' + p.variety : ''}</span>
            <span class="journal-entry-date">${fmtDate(p.plantedAt || p.createdAt)}</span>
          </div>`;
        }).join('')}
      </div>

      <div class="journal-section">
        <div class="journal-section-title">📓 Dernières observations (${notes.length})</div>
        ${sortedNotes.map(n => `
          <div class="journal-entry">
            <div>
              <span style="font-weight:600">${plantEmoji(n.plantId)} ${plantName(n.plantId)}</span>
              — ${n.text.slice(0, 80)}${n.text.length > 80 ? '…' : ''}
              ${n.photo ? ' 📸' : ''}
            </div>
            <span class="journal-entry-date">${fmtDate(n.date)}</span>
          </div>
        `).join('')}
        ${notes.length === 0 ? '<p style="font-size:13px;color:var(--text-light)">Aucune note pour l\'instant</p>' : ''}
      </div>

      <div class="journal-section">
        <div class="journal-section-title">🧺 Récoltes (${harvests.length})</div>
        ${sortedHarvests.map(h => `
          <div class="journal-entry">
            <span>${plantEmoji(h.plantId)} ${plantName(h.plantId)} — <strong>${h.quantity}</strong>${h.note ? ' · ' + h.note : ''}</span>
            <span class="journal-entry-date">${fmtDate(h.date)}</span>
          </div>
        `).join('')}
        ${harvests.length === 0 ? '<p style="font-size:13px;color:var(--text-light)">Aucune récolte enregistrée</p>' : ''}
      </div>

      <button class="share-btn" id="btn-share-journal">📤 Copier le résumé de saison</button>
    `;
  }

  // ===== ROTATION VIEW =====
  viewRotation() {
    const familyZones = {};
    GARDEN_ZONES.filter(z => z.type !== 'repos').forEach(zone => {
      zone._familyHint && (familyZones[zone.id] = zone._familyHint);
    });

    return `
      <p style="font-size:14px;color:var(--text-mid);margin-bottom:16px;line-height:1.5">
        La rotation des cultures évite d'épuiser le sol et limite les maladies spécifiques à chaque famille botanique.
      </p>
      ${Object.entries(BOTANICAL_FAMILIES).map(([key, fam]) => `
        <div class="rotation-family-card">
          <div class="rotation-family-header">
            <span style="font-size:20px">${fam.emoji}</span>
            <span class="rotation-family-name">${fam.label}</span>
            <span class="rotation-years-badge">⏱ ${fam.rotationYears} ans</span>
          </div>
          <div style="font-size:13px;color:var(--text-mid);margin-bottom:8px">
            ${fam.members.map(id => {
              const p = PLANTS_DB.find(d => d.id === id);
              return p ? `${p.emoji} ${p.name}` : id;
            }).join(', ')}
          </div>
          <div style="font-size:12px;color:var(--text-light)">
            ⚠️ Ne pas planter les ${fam.label} au même endroit avant <strong>${fam.rotationYears} ans</strong>.
          </div>
        </div>
      `).join('')}

      <div class="card" style="background:#fff9c4;border-color:#f9a825">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:8px">💡 Règle d'or pour ton jardin</h3>
        <p style="font-size:13px;color:#7b4f00;line-height:1.5">
          Tes buttes B1→B3 font chacune 1m². En 2026 : B2 = Solanacées (tomates).
          En 2027, mets les Cucurbitacées (courgettes) en B2 et les Solanacées en B3.
          Après 4 ans, le cycle est complet et le sol est régénéré.
        </p>
      </div>
    `;
  }

  // ===== QUICK NOTE MODAL =====
  async showQuickNoteModal() {
    const plants = await db.getPlants();
    const growing = plants.filter(p => p.status !== 'removed');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">✏️ Note rapide</div>

        <div class="quick-note-plant-list" id="qn-plant-list">
          <div class="quick-note-plant-item ${this._qnSelectedPlant === null ? 'selected' : ''}" data-plant-id="null">
            🌿 Note générale (sans plante)
          </div>
          ${growing.map(p => {
            const dbP = PLANTS_DB.find(d => d.id === p.dbId);
            const emoji = p.customEmoji || dbP?.emoji || '🌱';
            const name = p.customName || dbP?.name || 'Plante';
            return `<div class="quick-note-plant-item" data-plant-id="${p.id}">
              <span style="font-size:22px">${emoji}</span>
              <span>${name}${p.variety ? ' — ' + p.variety : ''}</span>
            </div>`;
          }).join('')}
        </div>

        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-select" id="qn-type">
            <option value="note">📝 Observation</option>
            <option value="harvest">🧺 Récolte</option>
            <option value="problem">⚠️ Problème</option>
          </select>
        </div>
        <div class="form-group">
          <textarea class="form-textarea" id="qn-text" placeholder="Votre observation…" style="min-height:100px"></textarea>
          <label class="photo-input-label" for="qn-photo">📷 Ajouter une photo</label>
          <input type="file" id="qn-photo" accept="image/*" capture="environment" style="display:none">
          <img id="qn-preview" style="display:none;width:100%;max-height:150px;object-fit:cover;border-radius:8px;margin-top:8px">
        </div>
        <button class="btn btn-primary btn-full" id="qn-save">Enregistrer</button>
      </div>`;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    let selectedPlantId = null;
    overlay.querySelectorAll('.quick-note-plant-item').forEach(item => {
      item.addEventListener('click', () => {
        overlay.querySelectorAll('.quick-note-plant-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedPlantId = item.dataset.plantId === 'null' ? null : parseInt(item.dataset.plantId);
      });
    });

    // Photo preview
    const photoInput = overlay.querySelector('#qn-photo');
    const preview = overlay.querySelector('#qn-preview');
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
      reader.readAsDataURL(file);
    });

    overlay.querySelector('#qn-save').addEventListener('click', async () => {
      const text = overlay.querySelector('#qn-text').value.trim();
      const type = overlay.querySelector('#qn-type').value;
      if (!text) { overlay.querySelector('#qn-text').focus(); return; }

      const photoSrc = preview.style.display !== 'none' ? preview.src : null;

      if (selectedPlantId !== null) {
        await db.add('notes', { plantId: selectedPlantId, text, type, photo: photoSrc, date: new Date().toISOString() });
      } else {
        // General note — store with plantId = 0 (general)
        await db.add('notes', { plantId: 0, text, type, photo: photoSrc, date: new Date().toISOString() });
      }
      overlay.remove();
      this.checkBadges();
      // Refresh current view if on home
      if (this.state.view === 'home') this.navigate('home');
    });
  }

  ficheHTML(p, userPlant = null) {
    const allMonths = [1,2,3,4,5,6,7,8,9,10,11,12];
    const bioLabel = MoonCalc.getBiodynamicLabel(p.biodynamic);

    return `
      <div class="card mb-12">
        <div class="info-section">
          <h3>Description</h3>
          <p style="font-size:14px;line-height:1.6;color:var(--text-mid)">${p.description}</p>
        </div>

        ${p.varieties && p.varieties.length ? `
        <div class="info-section">
          <h3>Variétés populaires</h3>
          <div class="tags">${p.varieties.map(v => `<span class="tag">${v}</span>`).join('')}</div>
        </div>` : ''}

        <div class="info-section">
          <h3>Entretien</h3>
          <div class="care-grid">
            <div class="care-item"><strong>💧 Arrosage</strong>${p.care.water}</div>
            <div class="care-item"><strong>☀️ Soleil</strong>${p.care.sun}</div>
            <div class="care-item"><strong>🌱 Plantation</strong>${p.planting.method}</div>
            <div class="care-item"><strong>📏 Espacement</strong>${p.planting.spacing} cm</div>
          </div>
        </div>

        <div class="info-section">
          <h3>Conseils</h3>
          <div class="tips-list">${p.care.tips.map(t => `<div class="tip-item">${t}</div>`).join('')}</div>
        </div>

        <div class="info-section">
          <h3>Calendrier</h3>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="width:12px;height:12px;border-radius:3px;background:#c7f4dc;display:inline-block"></span>
            <span style="font-size:12px;color:var(--text-mid)">Plantation</span>
            <span style="width:12px;height:12px;border-radius:3px;background:#fde8e1;display:inline-block;margin-left:8px"></span>
            <span style="font-size:12px;color:var(--text-mid)">Récolte</span>
          </div>
          <div class="month-bar">
            ${allMonths.map(m => {
              const isPlant = p.planting.months.includes(m);
              const isHarvest = p.harvest.months.includes(m);
              const cls = (isPlant && isHarvest) ? 'both' : isPlant ? 'planting' : isHarvest ? 'harvest' : '';
              return `<div class="month-cell ${cls}">${MONTHS_SHORT[m-1]}</div>`;
            }).join('')}
          </div>
          <p style="font-size:12px;color:var(--text-light);margin-top:8px">⏱ ${p.harvest.duration}</p>
        </div>

        <div class="info-section">
          <h3>Biodynamie</h3>
          <span class="badge badge-${p.biodynamic}">${bioLabel.emoji} ${bioLabel.label}</span>
          <p style="font-size:13px;color:var(--text-mid);margin-top:8px">${bioLabel.advice}</p>
        </div>

        <div class="info-section">
          <h3>Bons voisins</h3>
          <div class="tags">${p.companions.map(c => `<span class="tag">✅ ${c}</span>`).join('')}</div>
        </div>

        <div class="info-section">
          <h3>À éviter ensemble</h3>
          <div class="tags">${p.avoid.map(a => `<span class="tag tag-danger">❌ ${a}</span>`).join('')}</div>
        </div>
      </div>

      ${p.kokopelli ? this.kokopelliHTML(p, userPlant) : ''}

      ${userPlant && p.succession ? this.successionHTML(userPlant, p) : p.succession ? `
        <div class="succession-section">
          <div class="succession-header">
            <span style="font-size:18px">🔄</span>
            <span class="succession-title">Semis échelonnés recommandés</span>
            <span class="succession-interval">${
              p.succession.interval === 14 ? 'toutes les 2 sem.'
              : p.succession.interval === 21 ? 'toutes les 3 sem.'
              : p.succession.interval === 28 ? 'toutes les 4 sem.'
              : `tous les ${p.succession.interval}j`
            }</span>
          </div>
          <p class="succession-note">${p.succession.note}</p>
          <div class="succession-timeline">
            <div class="succession-timeline-label">Fenêtre de semis (${MONTHS_FR[p.succession.seasonStart-1]} → ${MONTHS_FR[p.succession.seasonEnd-1]})</div>
            <div class="timeline-track">
              ${[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                const inSeason = m >= p.succession.seasonStart && m <= p.succession.seasonEnd;
                return `<div class="timeline-month ${inSeason ? 'active' : ''}">${MONTHS_SHORT[m-1]}</div>`;
              }).join('')}
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  noteHTML(note) {
    const date = new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    const typeLabel = { note: 'Note', harvest: 'Récolte', problem: 'Problème' }[note.type] || 'Note';
    return `
      <div class="note-card">
        <div class="note-meta">
          <span class="note-date">${date}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="note-type-badge note-type-${note.type}">${typeLabel}</span>
            <button class="note-delete" data-note-id="${note.id}">✕</button>
          </div>
        </div>
        <p class="note-text">${note.text}</p>
      </div>
    `;
  }

  harvestHTML(harvest) {
    const date = new Date(harvest.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `
      <div class="harvest-item">
        <span class="harvest-emoji">🧺</span>
        <div class="harvest-info">
          <div class="harvest-qty">${harvest.quantity}</div>
          <div class="harvest-date">${date}</div>
          ${harvest.note ? `<div class="harvest-note">${harvest.note}</div>` : ''}
        </div>
        <button class="note-delete" data-harvest-id="${harvest.id}">✕</button>
      </div>
    `;
  }

  // ===== CALENDAR VIEW =====
  viewCalendar() {
    const { calYear: year, calMonth: month } = this.state;
    const monthData = MoonCalc.getMonthData(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const now = new Date();
    const isCurrentMonth = now.getMonth() === month && now.getFullYear() === year;

    // Plants to plant this month
    const plantingNow = PLANTS_DB.filter(p => p.planting.months.includes(month + 1));

    const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    return `
      <div class="cal-nav">
        <button class="cal-nav-btn" id="cal-prev">‹</button>
        <span class="cal-month-label">${MONTHS_FR[month]} ${year}</span>
        <button class="cal-nav-btn" id="cal-next">›</button>
      </div>

      <div class="cal-legend">
        <span class="legend-dot fruit">Fruit</span>
        <span class="legend-dot racine">Racine</span>
        <span class="legend-dot fleur">Fleur</span>
        <span class="legend-dot feuille">Feuille</span>
      </div>

      <div class="cal-grid">
        ${weekdays.map(d => `<div class="cal-weekday">${d}</div>`).join('')}
        ${Array(startOffset).fill('<div class="cal-day empty"></div>').join('')}
        ${monthData.map(d => {
          const isToday = isCurrentMonth && d.day === now.getDate();
          return `
            <div class="cal-day ${d.type} ${isToday ? 'today' : ''}" data-day="${d.day}">
              <span class="cal-day-num">${d.day}</span>
              <span class="cal-day-moon">${d.emoji}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div id="day-detail-container"></div>

      <div class="card">
        <div class="planting-section">
          <h3>🌱 À planter en ${MONTHS_FR[month]}</h3>
          ${plantingNow.length === 0
            ? '<p style="font-size:14px;color:var(--text-light)">Pas de semis prévu ce mois-ci.</p>'
            : plantingNow.map(p => `
                <div class="planting-item">
                  <span class="planting-emoji">${p.emoji}</span>
                  <div>
                    <div class="planting-name">${p.name}</div>
                    <div class="planting-info">${p.planting.method}</div>
                  </div>
                </div>
              `).join('')
          }
        </div>
      </div>

      <div class="card mt-12">
        <div class="planting-section">
          <h3>🧺 À récolter en ${MONTHS_FR[month]}</h3>
          ${(() => {
            const h = PLANTS_DB.filter(p => p.harvest.months.includes(month + 1));
            return h.length === 0
              ? '<p style="font-size:14px;color:var(--text-light)">Pas de récolte prévue ce mois-ci.</p>'
              : h.map(p => `
                  <div class="planting-item">
                    <span class="planting-emoji">${p.emoji}</span>
                    <div>
                      <div class="planting-name">${p.name}</div>
                      <div class="planting-info">${p.harvest.duration}</div>
                    </div>
                  </div>
                `).join('');
          })()}
        </div>
      </div>
    `;
  }

  // ===== MOON VIEW =====
  viewMoon() {
    const now = new Date();
    const phase = MoonCalc.getPhase(now);
    const phaseName = MoonCalc.getPhaseName(phase);
    const illumination = MoonCalc.getIllumination(phase);
    const bioType = MoonCalc.getBiodynamicType(now);
    const bioLabel = MoonCalc.getBiodynamicLabel(bioType);
    const phaseAdvice = MoonCalc.getPhaseAdvice(phase);
    const nextPhases = MoonCalc.getNextPhases(now);
    const moonCSS = MoonCalc.getMoonCSS(phase);

    const monthData = MoonCalc.getMonthData(now.getFullYear(), now.getMonth());
    const today = now.getDate();

    const shadowStyle = `box-shadow: ${moonCSS.boxShadow}`;

    return `
      <div class="moon-view-hero">
        <div class="moon-display-wrapper">
          <div class="moon-circle" style="${shadowStyle}"></div>
        </div>
        <div class="moon-phase-name">${phaseName}</div>
        <div class="moon-illumination">${Math.round(illumination * 100)}% illuminée</div>
        <span class="badge badge-${bioType}">${bioLabel.emoji} ${bioLabel.label}</span>
      </div>

      <div class="card mb-12">
        <div class="bio-stripe ${bioType}"></div>
        <h3 style="font-size:15px;font-weight:700;margin-bottom:8px">${bioLabel.emoji} ${bioLabel.label}</h3>
        <p class="rec-advice">${bioLabel.advice}</p>
        <p class="rec-phase mt-8">${phaseAdvice}</p>
      </div>

      <div class="card mb-12">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Prochaines phases</h3>
        <div class="next-phases-list">
          ${nextPhases.slice(0, 4).map(p => `
            <div class="next-phase-item">
              <span class="next-phase-emoji">${p.emoji}</span>
              <div class="next-phase-info">
                <div class="next-phase-name">${p.name}</div>
                <div class="next-phase-date">${p.dateStr}</div>
              </div>
              <span class="next-phase-days">${p.daysUntil === 0 ? 'auj.' : `J-${p.daysUntil}`}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">🌙 Lune de ${MONTHS_FR[now.getMonth()]}</h3>
        <div class="mini-month-grid">
          ${monthData.map(d => `
            <div class="mini-day ${d.day === today ? 'today' : ''}">
              <span class="mini-day-num">${d.day}</span>
              <span class="mini-day-moon" title="${d.phaseName}">${d.emoji}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ===== ADD PLANT VIEW =====
  viewAddPlant() {
    const imp = this._kokopelliImport;
    const importBanner = imp ? `
      <div style="background:#fff8e1;border:1.5px solid #d4a017;border-radius:var(--r);padding:12px 14px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:18px">🌻</span>
          <strong style="color:#7b4f00;font-size:14px">Importé depuis Kokopelli</strong>
        </div>
        <p style="font-size:13px;color:#a0761a;margin-bottom:4px">
          ${imp.plant ? `Plante détectée : <strong>${imp.plant.emoji} ${imp.plant.name}</strong>` : 'Plante non reconnue — remplis manuellement.'}
          ${imp.variety ? ` · Variété : <strong>${imp.variety}</strong>` : ''}
        </p>
        <a href="${imp.url}" target="_blank" style="font-size:12px;color:#d4a017;text-decoration:underline">Voir la fiche Kokopelli ↗</a>
      </div>
    ` : '';

    return `
      <div style="padding-bottom:16px">
        ${importBanner}
        <p style="font-size:14px;color:var(--text-mid);margin-bottom:16px">Choisissez une plante dans notre base ou créez une fiche personnalisée.</p>

        <div class="form-group">
          <label class="form-label">Rechercher dans la base de données</label>
          <input class="form-input" id="db-search" placeholder="Ex: tomate, basilic…" type="text">
        </div>

        <div class="db-plant-list" id="db-plant-list">
          ${PLANTS_DB.map(p => `
            <div class="db-plant-item" data-db-id="${p.id}">
              <span class="db-plant-item-emoji">${p.emoji}</span>
              <div style="flex:1">
                <div class="db-plant-item-name">${p.name}</div>
                <div class="db-plant-item-cat">${CATEGORIES[p.category]?.label || p.category}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="custom-toggle mt-12">
          <button class="toggle-btn" id="toggle-custom">+ Créer une plante personnalisée</button>
        </div>

        <div id="custom-plant-fields" class="${this.isCustomPlant ? '' : 'hidden'}">
          <div class="form-group">
            <label class="form-label">Nom de la plante *</label>
            <input class="form-input" id="custom-name" placeholder="Ex: Melon Cantaloup" type="text">
          </div>
          <div class="form-group">
            <label class="form-label">Emoji</label>
            <input class="form-input" id="custom-emoji" placeholder="🌿" type="text" maxlength="2">
          </div>
          <div class="form-group">
            <label class="form-label">Catégorie</label>
            <select class="form-select" id="custom-cat">
              ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v.emoji} ${v.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" id="custom-desc" placeholder="Notes sur cette variété…"></textarea>
          </div>
        </div>

        <div id="selected-plant-info" class="card mb-12 ${this.selectedDbPlant ? '' : 'hidden'}">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:36px" id="sel-emoji"></span>
            <div><div id="sel-name" style="font-weight:700;font-size:16px"></div><div id="sel-cat" style="font-size:13px;color:var(--text-light)"></div></div>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
          <div class="form-group">
            <label class="form-label">Variété / Nom spécifique</label>
            <input class="form-input" id="plant-variety" placeholder="Ex: Marmande, Charlotte…" type="text">
          </div>
          <div class="form-group">
            <label class="form-label">Date de plantation</label>
            <input class="form-input" id="plant-date" type="date" value="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">Emplacement (optionnel)</label>
            <input class="form-input" id="plant-location" placeholder="Ex: Carré A, Serre, Bac nord…" type="text">
          </div>
          <div class="form-group">
            <label class="form-label">Nombre de godets / plants</label>
            <input class="form-input" id="plant-qty" type="number" min="1" value="1" style="max-width:120px">
          </div>
          <div class="form-group">
            <label class="form-label">Lien fiche Kokopelli (optionnel)</label>
            <input class="form-input" id="plant-koko-url" type="url"
              placeholder="https://www.kokopelli-semences.fr/fr/p/…"
              value="${imp?.url || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">Note initiale (optionnel)</label>
            <textarea class="form-textarea" id="plant-note" placeholder="Observations de départ…"></textarea>
          </div>
          <button class="btn btn-primary btn-full" id="btn-save-plant">Ajouter au potager 🌱</button>
        </div>
      </div>
    `;
  }

  // ===== ADD NOTE VIEW =====
  viewAddNote(plantId) {
    return `
      <div class="form-group">
        <label class="form-label">Type de note</label>
        <select class="form-select" id="note-type">
          <option value="note">📝 Observation</option>
          <option value="harvest">🧺 Récolte</option>
          <option value="problem">⚠️ Problème</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Note *</label>
        <textarea class="form-textarea" id="note-text" placeholder="Décrivez vos observations…" style="min-height:150px"></textarea>
      </div>
      <button class="btn btn-primary btn-full" id="btn-save-note" data-plant-id="${plantId}">Enregistrer la note</button>
    `;
  }

  // ===== ADD HARVEST VIEW =====
  viewAddHarvest(plantId) {
    return `
      <div class="form-group">
        <label class="form-label">Quantité *</label>
        <input class="form-input" id="harvest-qty" placeholder="Ex: 2kg, 10 tomates, 1 botte…" type="text">
      </div>
      <div class="form-group">
        <label class="form-label">Note (optionnel)</label>
        <textarea class="form-textarea" id="harvest-note" placeholder="Qualité, observations…"></textarea>
      </div>
      <button class="btn btn-primary btn-full" id="btn-save-harvest" data-plant-id="${plantId}">Enregistrer la récolte 🧺</button>
    `;
  }

  // ===== EVENT LISTENERS =====
  attachListeners(view, params) {
    const $ = id => document.getElementById(id);
    const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

    // Plant card clicks (global delegation)
    document.querySelectorAll('.plant-card[data-plant-id]').forEach(card => {
      card.addEventListener('click', () => this.navigate('plant-detail', { id: parseInt(card.dataset.plantId) }));
    });

    if (view === 'home') {
      on('home-moon-btn', 'click', () => this.navigate('moon'));
      on('home-see-all', 'click', () => this.navigate('plants'));
      on('home-add-plant', 'click', () => this.showQuickAddModal());
      on('btn-enable-notif', 'click', () => this.requestNotifications());
      on('btn-go-stats', 'click', () => this.navigate('stats'));
      on('btn-go-journal', 'click', () => this.navigate('journal'));
      on('fab-quick-note', 'click', () => this.showQuickNoteModal());
      on('btn-force-import', 'click', async () => {
        localStorage.removeItem('auto-import-april2-v1');
        await this.autoImportAprilBatch();
        this.navigate('plants');
      });
      // Reminder clicks → plant detail
      document.querySelectorAll('#reminders-list .reminder-item').forEach(item => {
        item.addEventListener('click', () => this.navigate('plant-detail', { id: parseInt(item.dataset.plantId) }));
      });
      // Async weather inject (adult home only)
      if (!document.querySelector('.kid-home')) {
        Weather.fetch().then(data => {
          const widget = document.getElementById('weather-widget');
          if (widget) widget.outerHTML = Weather.render(data);
        });
      }

      // Kid home: quest checkboxes
      document.querySelectorAll('.kid-home .task-check').forEach(cb => {
        cb.addEventListener('change', () => {
          TaskEngine.toggleChecked(cb.dataset.taskId);
          const label = cb.nextElementSibling;
          if (label) label.textContent = cb.checked ? '✅ Fait !' : 'Marquer comme fait';
          if (cb.checked) {
            const profile = ProfileManager.getActive();
            if (profile) {
              const earned = ProfileManager.addXp(profile.id, 'task_complete');
              this.showXpToast(earned, 'task_complete');
            }
          }
        });
      });

      // Kid home: quest card click → plant detail
      document.querySelectorAll('.kid-quest-card').forEach(card => {
        card.addEventListener('click', e => {
          if (e.target.type === 'checkbox' || e.target.closest('label')) return;
          const plantId = parseInt(card.dataset.plantId);
          if (plantId) this.navigate('plant-detail', { id: plantId });
        });
      });

      // Kid home: owned plant click → plant detail
      document.querySelectorAll('.kid-plant-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const plantId = parseInt(chip.dataset.plantId);
          if (plantId) this.navigate('plant-detail', { id: plantId });
        });
      });
    }

    if (view === 'plants') {
      on('btn-koko-catalog', 'click', () => this.showCatalogModal());
      on('fab-add-plant', 'click', () => this.showQuickAddModal());
      on('plant-search', 'input', e => {
        this.plantSearch = e.target.value;
        this.renderView('plants', {});
      });
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.plantFilter = btn.dataset.cat;
          this.renderView('plants', {});
        });
      });
    }

    if (view === 'plant-detail') {
      // Tabs
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.activeTab = btn.dataset.tab;
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
          document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${btn.dataset.tab}`));
        });
      });

      on('fab-add-note', 'click', () => this.navigate('add-note', { plantId: params.id }));

      on('btn-adopt-plant', 'click', async () => {
        const profile = ProfileManager.getActive();
        if (!profile) return;
        const plant = await db.getPlant(params.id);
        if (!plant) return;
        plant.ownerId = profile.id;
        await db.updatePlant(plant);
        const earned = ProfileManager.addXp(profile.id, 'plant_adopted');
        this.showXpToast(earned, 'plant_adopted');
        this.navigate('plant-detail', { id: params.id });
      });

      on('btn-resemer', 'click', async () => {
        const plant = await db.getPlant(params.id);
        if (!plant) return;
        const dbPlant = PLANTS_DB.find(p => p.id === plant.dbId);
        this.showQuickAddModal({ prefill: { dbPlant, variety: plant.variety, location: plant.location } });
      });
      on('btn-add-harvest', 'click', () => this.navigate('add-harvest', { plantId: params.id }));
      on('btn-delete-plant', 'click', () => this.confirmDeletePlant(params.id));

      // Kokopelli variety tag clicks → update search link dynamically
      document.querySelectorAll('.koko-variety-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          const variety = tag.dataset.variety;
          const dbPlant = PLANTS_DB.find(p => p.id === params.id?.toString()) ||
            (async () => { const pl = await db.getPlant(params.id); return PLANTS_DB.find(p => p.id === pl?.dbId); })();
          // Toggle selection
          const container = tag.closest('.koko-variety-tags');
          container.querySelectorAll('.koko-variety-tag').forEach(t => t.classList.remove('selected'));
          tag.classList.add('selected');
          // Update the search link
          const searchLink = tag.closest('.koko-section').querySelector('.koko-link-search');
          if (searchLink) {
            const dbP = [...document.querySelectorAll('.koko-variety-tag')][0]
              ?.closest('.koko-section')?.dataset?.plantId;
            const plantName = tag.closest('.koko-section').querySelector('.koko-title')?.parentElement
              ?.closest('.card')?.querySelector('.plant-hero-name')?.textContent || variety;
            searchLink.href = KOKOPELLI.search + encodeURIComponent(variety);
            searchLink.querySelector('span:first-of-type') && (searchLink.innerHTML =
              `🔍 Rechercher "${variety}" <span class="koko-link-ext">↗</span>`);
          }
        });
      });

      // Succession "Planifier" button → add-plant pre-filled
      document.querySelectorAll('.btn-plan-next').forEach(btn => {
        btn.addEventListener('click', () => {
          this._successionPrefill = { dbId: btn.dataset.dbId, date: btn.dataset.sowDate };
          this.navigate('add-plant');
        });
      });

      // Status stepper clicks
      document.querySelectorAll('#status-stepper .status-step').forEach(step => {
        step.addEventListener('click', async () => {
          const plantId = parseInt(step.dataset.plantId);
          const newStatus = step.dataset.status;
          const plant = await db.getPlant(plantId);
          if (!plant) return;
          plant.growthStatus = newStatus;
          await db.updatePlant(plant);
          // Re-render stepper in place
          const stepper = document.getElementById('status-stepper');
          if (stepper) stepper.outerHTML = this.statusStepperHTML(plant);
          // Re-attach
          document.querySelectorAll('#status-stepper .status-step').forEach(s2 => {
            s2.addEventListener('click', async () => {
              const p2 = await db.getPlant(parseInt(s2.dataset.plantId));
              if (!p2) return;
              p2.growthStatus = s2.dataset.status;
              await db.updatePlant(p2);
              this.navigate('plant-detail', { id: plantId });
            });
          });
          this.checkBadges();
        });
      });

      // Delete note
      document.querySelectorAll('[data-note-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await db.deleteNote(parseInt(btn.dataset.noteId));
          this.navigate('plant-detail', { id: params.id });
        });
      });

      // Delete harvest
      document.querySelectorAll('[data-harvest-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await db.deleteHarvest(parseInt(btn.dataset.harvestId));
          this.navigate('plant-detail', { id: params.id });
        });
      });
    }

    if (view === 'garden') {
      on('btn-open-batch', 'click', () => this.showBatchImportModal());
      document.querySelectorAll('.gplan-zone[data-zone-id]').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('.gplan-zone').forEach(z => z.classList.remove('selected'));
          el.classList.add('selected');
          this.showZoneDetail(el.dataset.zoneId);
        });
      });
    }

    if (view === 'tasks') {
      document.querySelectorAll('.task-check').forEach(cb => {
        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          const id = cb.dataset.taskId;
          TaskEngine.toggleChecked(id);
          const card = cb.closest('.task-card');
          if (card) card.classList.toggle('checked', cb.checked);
          if (cb.checked) {
            const profile = ProfileManager.getActive();
            if (profile) {
              const earned = ProfileManager.addXp(profile.id, 'task_complete');
              this.showXpToast(earned, 'task_complete');
            }
          }
        });
      });
      document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.type === 'checkbox') return;
          const plantId = parseInt(card.dataset.plantId);
          if (plantId) this.navigate('plant-detail', { id: plantId });
        });
      });
    }

    if (view === 'stats') {
      on('btn-go-rotation', 'click', () => this.navigate('rotation'));
    }

    if (view === 'journal') {
      on('btn-share-journal', 'click', async () => {
        const plants = await db.getPlants();
        const harvests = await db.getAll('harvests');
        const notes = await db.getAll('notes');
        const growing = plants.filter(p => p.status !== 'removed');
        const lines = [
          `🌱 Mon Potager — Saison ${new Date().getFullYear()}`,
          ``,
          `${growing.length} variétés cultivées · ${harvests.length} récoltes · ${notes.length} observations`,
          ``,
          ...growing.map(p => {
            const dbP = PLANTS_DB.find(d => d.id === p.dbId);
            return `${p.customEmoji || dbP?.emoji || '🌱'} ${p.customName || dbP?.name || '?'}${p.variety ? ' — ' + p.variety : ''}`;
          })
        ];
        const text = lines.join('\n');
        if (navigator.share) {
          navigator.share({ title: 'Mon Potager', text }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(text);
          alert('Résumé copié dans le presse-papier !');
        }
      });
    }

    if (view === 'calendar') {
      on('cal-prev', 'click', () => {
        this.state.calMonth--;
        if (this.state.calMonth < 0) { this.state.calMonth = 11; this.state.calYear--; }
        this.renderView('calendar', {});
      });
      on('cal-next', 'click', () => {
        this.state.calMonth++;
        if (this.state.calMonth > 11) { this.state.calMonth = 0; this.state.calYear++; }
        this.renderView('calendar', {});
      });

      const year = this.state.calYear, month = this.state.calMonth;
      document.querySelectorAll('.cal-day[data-day]').forEach(day => {
        day.addEventListener('click', () => {
          document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
          day.classList.add('selected');
          const d = parseInt(day.dataset.day);
          const date = new Date(year, month, d);
          const phase = MoonCalc.getPhase(date);
          const bioType = MoonCalc.getBiodynamicType(date);
          const bioLabel = MoonCalc.getBiodynamicLabel(bioType);
          const container = $('day-detail-container');
          if (container) {
            container.innerHTML = `
              <div class="day-detail-card">
                <div class="day-detail-title">${d} ${MONTHS_FR[month]} — ${MoonCalc.getPhaseEmoji(phase)} ${MoonCalc.getPhaseName(phase)}</div>
                <span class="badge badge-${bioType} mb-8">${bioLabel.emoji} ${bioLabel.label}</span>
                <p class="day-detail-advice mt-8">${bioLabel.advice}</p>
              </div>
            `;
          }
        });
      });
    }

    if (view === 'add-plant') {
      this.selectedDbPlant = null;
      this.isCustomPlant = false;

      // Pre-fill from Kokopelli import (Web Share Target)
      if (this._kokopelliImport) {
        const imp = this._kokopelliImport;
        if (imp.plant) {
          this.selectedDbPlant = imp.plant;
          const item = document.querySelector(`.db-plant-item[data-db-id="${imp.plant.id}"]`);
          if (item) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          const info = $('selected-plant-info');
          if (info) {
            info.classList.remove('hidden');
            $('sel-emoji').textContent = imp.plant.emoji;
            $('sel-name').textContent = imp.plant.name;
            $('sel-cat').textContent = CATEGORIES[imp.plant.category]?.label || '';
          }
        }
        if (imp.variety) {
          const varInput = $('plant-variety');
          if (varInput) varInput.value = imp.variety;
        }
        this._kokopelliImport = null;
      }

      // Pre-fill location if coming from a garden zone
      if (this._prefillLocation) {
        const locInput = $('plant-location');
        if (locInput) locInput.value = this._prefillLocation;
        this._prefillLocation = null;
      }

      // Pre-fill if coming from a succession "Planifier" button
      if (this._successionPrefill) {
        const { dbId, date } = this._successionPrefill;
        this._successionPrefill = null;
        const dbPlant = PLANTS_DB.find(p => p.id === dbId);
        if (dbPlant) {
          this.selectedDbPlant = dbPlant;
          // Highlight the matching item
          const item = document.querySelector(`.db-plant-item[data-db-id="${dbId}"]`);
          if (item) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          const info = $('selected-plant-info');
          if (info) {
            info.classList.remove('hidden');
            $('sel-emoji').textContent = dbPlant.emoji;
            $('sel-name').textContent = dbPlant.name;
            $('sel-cat').textContent = CATEGORIES[dbPlant.category]?.label || '';
          }
          const dateInput = $('plant-date');
          if (dateInput) dateInput.value = date;
          const varInput = $('plant-variety');
          if (varInput) varInput.placeholder = dbPlant.varieties?.[0] || 'Variété';
        }
      }

      on('toggle-custom', 'click', () => {
        this.isCustomPlant = !this.isCustomPlant;
        const fields = $('custom-plant-fields');
        const toggle = $('toggle-custom');
        if (fields) fields.classList.toggle('hidden', !this.isCustomPlant);
        if (toggle) toggle.textContent = this.isCustomPlant ? '− Masquer la fiche personnalisée' : '+ Créer une plante personnalisée';
        this.selectedDbPlant = null;
        const info = $('selected-plant-info');
        if (info) info.classList.add('hidden');
        document.querySelectorAll('.db-plant-item').forEach(i => i.classList.remove('selected'));
      });

      on('db-search', 'input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.db-plant-item').forEach(item => {
          const name = item.querySelector('.db-plant-item-name').textContent.toLowerCase();
          item.style.display = name.includes(q) ? '' : 'none';
        });
      });

      document.querySelectorAll('.db-plant-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('.db-plant-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          const dbId = item.dataset.dbId;
          this.selectedDbPlant = PLANTS_DB.find(p => p.id === dbId);
          const info = $('selected-plant-info');
          if (info && this.selectedDbPlant) {
            info.classList.remove('hidden');
            $('sel-emoji').textContent = this.selectedDbPlant.emoji;
            $('sel-name').textContent = this.selectedDbPlant.name;
            $('sel-cat').textContent = CATEGORIES[this.selectedDbPlant.category]?.label || '';
          }
          // Auto-fill variety suggestions
          const varInput = $('plant-variety');
          if (varInput) varInput.placeholder = this.selectedDbPlant.varieties?.[0] || 'Variété';
        });
      });

      on('btn-save-plant', 'click', async () => {
        const variety = $('plant-variety')?.value.trim();
        const plantedAt = $('plant-date')?.value || new Date().toISOString().split('T')[0];
        const location = $('plant-location')?.value.trim();
        const noteText = $('plant-note')?.value.trim();
        const quantity = parseInt($('plant-qty')?.value) || 1;

        let plantData;

        const kokoUrl = $('plant-koko-url')?.value.trim() || null;

        if (this.isCustomPlant) {
          const customName = $('custom-name')?.value.trim();
          if (!customName) { alert('Veuillez saisir un nom pour la plante.'); return; }
          plantData = {
            dbId: null,
            customName,
            customEmoji: $('custom-emoji')?.value.trim() || '🌿',
            category: $('custom-cat')?.value || 'legume-feuille',
            description: $('custom-desc')?.value.trim(),
            variety, plantedAt, location, kokoUrl, quantity
          };
        } else {
          if (!this.selectedDbPlant) { alert('Veuillez sélectionner une plante.'); return; }
          plantData = { dbId: this.selectedDbPlant.id, variety, plantedAt, location, kokoUrl, quantity };
        }

        const plantId = await db.addPlant(plantData);
        if (noteText) await db.addNote(plantId, noteText, 'note');
        const profile = ProfileManager.getActive();
        if (profile) {
          const earned = ProfileManager.addXp(profile.id, 'plant_added');
          this.showXpToast(earned, 'plant_added');
        }
        this.checkBadges();
        this.navigate('plants');
      });
    }

    if (view === 'add-note') {
      on('btn-save-note', 'click', async e => {
        const text = $('note-text')?.value.trim();
        const type = $('note-type')?.value || 'note';
        const plantId = parseInt(e.target.dataset.plantId);
        if (!text) { alert('Veuillez saisir une note.'); return; }
        await db.addNote(plantId, text, type);
        const profile = ProfileManager.getActive();
        if (profile) {
          const action = type === 'photo' ? 'photo_note' : 'note_added';
          const earned = ProfileManager.addXp(profile.id, action);
          this.showXpToast(earned, action);
        }
        this.activeTab = 'notes';
        this.navigate('plant-detail', { id: plantId });
      });
    }

    if (view === 'add-harvest') {
      on('btn-save-harvest', 'click', async e => {
        const qty = $('harvest-qty')?.value.trim();
        const note = $('harvest-note')?.value.trim();
        const plantId = parseInt(e.target.dataset.plantId);
        if (!qty) { alert('Veuillez saisir une quantité.'); return; }
        await db.addHarvest(plantId, qty, note);
        const profile = ProfileManager.getActive();
        if (profile) {
          const earned = ProfileManager.addXp(profile.id, 'harvest_logged');
          this.showXpToast(earned, 'harvest_logged');
        }
        this.activeTab = 'recoltes';
        this.navigate('plant-detail', { id: plantId });
      });
    }
  }

  // ===== GARDEN PLAN VIEW =====

  async viewGarden() {
    const plants = await db.getPlants();
    const growing = plants.filter(p => p.status === 'growing');

    // Count plants per zone (match location field containing zone ID)
    const countByZone = {};
    const plantsByZone = {};
    GARDEN_ZONES.forEach(z => { countByZone[z.id] = 0; plantsByZone[z.id] = []; });
    growing.forEach(p => {
      const loc = (p.location || '').toUpperCase();
      GARDEN_ZONES.forEach(z => {
        if (loc.includes(z.id.toUpperCase())) {
          countByZone[z.id]++;
          plantsByZone[z.id].push(p);
        }
      });
    });

    const totalActive = GARDEN_ZONES.filter(z => z.type !== 'repos').length;
    const totalPlants = growing.length;

    // Build plan rows HTML
    const SCALE = 44; // px per meter
    const rowsHTML = GARDEN_ZONES.map((z, i) => {
      const h = Math.max(44, Math.round(z.mSize * SCALE));
      const count = countByZone[z.id];
      const isRest = z.type === 'repos';
      const alleeHTML = i < GARDEN_ZONES.length - 1 ? `
        <div class="gplan-allee-row" style="height:25px">
          <div class="gplan-brise" style="width:28px;background:#b0bec5"></div>
          <div class="gplan-allee-center">— allée 90 cm —</div>
          <div class="gplan-allee-e"></div>
        </div>` : '';

      return `
        <div class="gplan-row" style="height:${h}px">
          <div class="gplan-brise" style="${i===0?'':''}">🌿</div>
          <div class="gplan-zone ${isRest ? 'opacity-50' : ''}" data-zone-id="${z.id}"
               style="background:${z.color};${isRest?'opacity:0.6':''}">
            <span class="gplan-zone-emoji">${z.emoji}</span>
            <span class="gplan-zone-label">${z.label}</span>
            ${count > 0 ? `<span class="gplan-zone-count">${count}</span>` : ''}
          </div>
          <div class="gplan-allee-e"></div>
        </div>
        ${alleeHTML}
      `;
    }).join('');

    const hasBatchToImport = !localStorage.getItem('semis-20260402-imported');

    return `
      ${hasBatchToImport ? `
        <div class="card mb-12" style="border-color:#a5d6a7;background:#f1f8e9">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:20px">🌱</span>
            <strong style="color:#2e7d32">Semis du 2 avril — prêts à enregistrer</strong>
          </div>
          <p style="font-size:13px;color:#388e3c;margin-bottom:10px;line-height:1.5">
            7 lots en godets à enregistrer dans l\'app. Cliquez pour les ajouter tous d\'un coup.
          </p>
          <button class="btn btn-primary btn-sm" id="btn-open-batch" style="background:#388e3c">
            Importer les semis du jour →
          </button>
        </div>
      ` : ''}

      <div class="garden-meta">
        <div class="garden-meta-item">
          <span class="garden-meta-val">100 m²</span>
          <span class="garden-meta-lbl">Surface totale</span>
        </div>
        <div class="garden-meta-item">
          <span class="garden-meta-val">${totalPlants}</span>
          <span class="garden-meta-lbl">Plantes</span>
        </div>
        <div class="garden-meta-item">
          <span class="garden-meta-val">${GARDEN_ZONES.filter(z=>z.type==='repos').length}</span>
          <span class="garden-meta-lbl">En repos</span>
        </div>
      </div>

      <div class="garden-legend">
        <span class="gleg-item"><span class="gleg-swatch" style="background:#c8e6c9"></span>Butte Hügelkultur</span>
        <span class="gleg-item"><span class="gleg-swatch" style="background:#fff9c4"></span>Terre plate no-dig</span>
        <span class="gleg-item"><span class="gleg-swatch" style="background:#ffcdd2"></span>Fraises</span>
        <span class="gleg-item"><span class="gleg-swatch" style="background:#eeeeee"></span>Repos 2026</span>
      </div>

      <div class="garden-plan-wrap">
        <div class="garden-plan-compass">
          <span>🧭 NORD — Haie</span>
          <span style="font-size:10px;opacity:0.7">← 5 m →</span>
          <span>Houblon ↔ Allée Est</span>
        </div>
        ${rowsHTML}
        <div class="gplan-river" style="height:32px">
          💧 RIVIÈRE — Rive non cultivée (1 m)
        </div>
      </div>

      <div id="zone-detail-panel"></div>
    `;
  }

  async showZoneDetail(zoneId, plantsByZone) {
    const zone = GARDEN_ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    const plants = await db.getPlants();
    const growing = plants.filter(p => p.status === 'growing');
    const zonePlants = growing.filter(p => (p.location || '').toUpperCase().includes(zoneId.toUpperCase()));

    const panel = document.getElementById('zone-detail-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div class="zone-detail">
        <div class="zone-detail-title">${zone.emoji} ${zone.label}</div>
        <div class="zone-detail-note">${zone.note}</div>
        ${zonePlants.length > 0 ? `
          <div class="zone-plants-grid">
            ${zonePlants.map(p => {
              const dbP = PLANTS_DB.find(d => d.id === p.dbId);
              const emoji = p.customEmoji || (dbP?.emoji || '🌱');
              const name = p.customName || (dbP?.name || 'Plante');
              return `<div class="zone-plant-chip" data-plant-id="${p.id}">
                <span>${emoji}</span><span>${name}${p.variety ? ' · ' + p.variety : ''}</span>
              </div>`;
            }).join('')}
          </div>
          <button class="btn btn-outline btn-sm mt-12" id="btn-add-to-zone" data-zone="${zoneId}">+ Ajouter une plante ici</button>
        ` : `
          <p class="zone-empty">Aucune plante enregistrée dans cette zone.</p>
          <button class="btn btn-primary btn-sm mt-8" id="btn-add-to-zone" data-zone="${zoneId}">+ Ajouter une plante</button>
        `}
      </div>
    `;
    panel.querySelectorAll('.zone-plant-chip[data-plant-id]').forEach(c => {
      c.addEventListener('click', () => this.navigate('plant-detail', { id: parseInt(c.dataset.plantId) }));
    });
    const addBtn = document.getElementById('btn-add-to-zone');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._prefillLocation = zoneId;
        this.navigate('add-plant');
      });
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showBatchImportModal() {
    // Today's plantings — Saint-Thélo, 2 avril 2026
    const BATCH = [
      { dbId: 'basilic',   variety: 'Grand vert',         qty: 4, location: 'B2',       note: 'En godets — entre les tomates' },
      { dbId: 'capucine',  variety: 'Empress of India',   qty: 4, location: 'bordures',  note: 'Naine — bordure de toutes les planches' },
      { dbId: 'capucine',  variety: 'Couleurs mélangées', qty: 4, location: 'piquet Ouest', note: 'Grimpante — piquet côté Ouest' },
      { dbId: 'tagete',    variety: 'Double Pinwheel',    qty: 4, location: 'B2',        note: 'Au pied des tomates en B2' },
      { dbId: 'bourrache', variety: 'Bleue',              qty: 4, location: 'bordures',  note: 'Bordure de toutes les planches' },
      { dbId: 'salade',    variety: 'Buttercrunch',       qty: 3, location: 'terre-plate', note: 'Espaces libres zone terre plate' },
      { dbId: 'tabac',     variety: 'Ghost Pipes',        qty: 3, location: 'B2-B3',     note: 'Intercalé entre B2 et B3' },
    ];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'batch-modal';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">🌱 Semis du 2 avril 2026</div>
        <p style="font-size:13px;color:var(--text-light);margin-bottom:14px;line-height:1.5">
          Cochez les godets à enregistrer. Date de semis : 02/04/2026.
        </p>
        <div class="batch-import-list" id="batch-list">
          ${BATCH.map((b, i) => {
            const dbP = PLANTS_DB.find(p => p.id === b.dbId);
            return `
              <div class="batch-item">
                <input type="checkbox" class="batch-check" id="bc-${i}" checked>
                <div class="batch-info">
                  <div class="batch-name">${dbP?.emoji || '🌱'} ${dbP?.name || b.dbId} — ${b.variety} <span style="color:var(--text-light);font-weight:400">(×${b.qty})</span></div>
                  <div class="batch-dest">📍 ${b.location} · ${b.note}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn btn-primary btn-full mt-12" id="btn-confirm-batch">Enregistrer les godets cochés</button>
      </div>
    `;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    document.getElementById('btn-confirm-batch').addEventListener('click', async () => {
      const existingPlants = await db.getPlants();
      let count = 0;
      for (let i = 0; i < BATCH.length; i++) {
        const cb = document.getElementById(`bc-${i}`);
        if (!cb?.checked) continue;
        const b = BATCH[i];
        // Skip if already imported (same dbId + variety + plantedAt)
        const alreadyExists = existingPlants.some(p =>
          p.dbId === b.dbId && p.variety === b.variety && p.plantedAt === '2026-04-02'
        );
        if (alreadyExists) continue;
        const plantId = await db.addPlant({
          dbId: b.dbId,
          variety: b.variety,
          plantedAt: '2026-04-02',
          location: b.location,
          status: 'growing',
          quantity: b.qty
        });
        if (b.note) {
          await db.addNote(plantId, b.note, 'note');
        }
        count += b.qty;
      }
      localStorage.setItem('semis-20260402-imported', '1');
      overlay.remove();
      if (count > 0) {
        alert(`✅ ${count} godets enregistrés !`);
      } else {
        alert('Tous ces lots sont déjà dans votre jardin.');
      }
      this.checkBadges();
      this.navigate('garden');
    });
  }

  // ===== KOKOPELLI =====

  kokopelliHTML(dbPlant, userPlant = null) {
    const k = dbPlant.kokopelli;
    const selectedVariety = userPlant?.variety || '';
    // Build search URL: if a specific variety is set, search for "plante variété", else generic
    const searchTerm = selectedVariety
      ? encodeURIComponent(`${dbPlant.name} ${selectedVariety}`)
      : encodeURIComponent(k.search);
    const searchURL = KOKOPELLI.search + searchTerm;
    const catURL = KOKOPELLI.base + k.catalogPath;

    const varietyTagsHTML = (k.varietiesKoko || []).map(v => `
      <span class="koko-variety-tag ${v === selectedVariety ? 'selected' : ''}" data-variety="${v}">${v}</span>
    `).join('');

    return `
      <div class="koko-section">
        <div class="koko-header">
          <span class="koko-logo">🌻</span>
          <span class="koko-title">Catalogue Kokopelli</span>
        </div>
        <p class="koko-disclaimer">
          ⚠️ Ces liens pointent vers la recherche Kokopelli, pas une fiche produit directe — plus robuste si une variété change de nom ou disparaît du catalogue.
        </p>
        ${k.varietiesKoko?.length ? `
          <div class="koko-varieties">
            <div class="koko-varieties-label">Variétés Kokopelli disponibles</div>
            <div class="koko-variety-tags" id="koko-tags-${dbPlant.id}">${varietyTagsHTML}</div>
          </div>
        ` : ''}
        <div class="koko-links">
          <a href="${searchURL}" target="_blank" rel="noopener" class="koko-link koko-link-search">
            🔍 Rechercher${selectedVariety ? ' "' + selectedVariety + '"' : ''} <span class="koko-link-ext">↗</span>
          </a>
          <a href="${catURL}" target="_blank" rel="noopener" class="koko-link koko-link-cat">
            📖 Catégorie <span class="koko-link-ext">↗</span>
          </a>
        </div>
      </div>
    `;
  }

  // ===== QUICK ADD MODAL =====
  async showQuickAddModal(options = {}) {
    const { prefill } = options;

    // Season suggestions: plants ideal to sow this month in Bretagne
    const month = new Date().getMonth() + 1; // 1-12
    const seasonal = PLANTS_DB.filter(p => {
      const tl = PLANT_TIMELINE[p.id];
      if (!tl) return false;
      if (tl.plantType === 'indoor') {
        // Ideal indoor sow month: minOutdoorMonth - weekToTransplant/4 (approx)
        const idealSowMonth = (tl.minOutdoorMonth || 5) - Math.ceil((tl.weekToTransplant || 6) / 4);
        return month >= idealSowMonth - 1 && month <= idealSowMonth + 1;
      }
      if (tl.plantType === 'direct') {
        return month >= (tl.minOutdoorMonth || 4) && month <= (tl.minOutdoorMonth || 4) + 2;
      }
      return false;
    }).slice(0, 6);

    // Recently added plants
    const recentPlants = await db.getRecentPlants(3);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay quick-add-overlay';
    overlay.innerHTML = `
      <div class="modal-sheet quick-add-sheet">
        <div class="modal-handle"></div>

        <!-- Step 1: Search -->
        <div id="qa-step-1">
          <div class="qa-search-bar">
            <input class="qa-search-input" id="qa-search" type="text"
              placeholder="Tomate, basilic, carotte…"
              autocomplete="off" autocorrect="off" spellcheck="false"
              value="${prefill?.dbPlant?.name || ''}">
            <button class="qa-mic-btn" id="qa-mic" title="Reconnaissance vocale">🎤</button>
          </div>
          <div class="qa-mic-status" id="qa-mic-status"></div>

          <!-- Suggestions live -->
          <div id="qa-suggestions" class="qa-suggestions"></div>

          <!-- Seasonal suggestions -->
          ${seasonal.length ? `
            <div class="qa-section-label">🌱 Idéal à semer en ${['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][month-1]}</div>
            <div class="qa-chips">
              ${seasonal.map(p => `
                <button class="qa-chip" data-db-id="${p.id}">
                  <span>${p.emoji}</span><span>${p.name}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}

          ${recentPlants.length ? `
            <div class="qa-section-label">🕐 Récents</div>
            <div class="qa-chips">
              ${recentPlants.map(rp => {
                const dbP = PLANTS_DB.find(p => p.id === rp.dbId);
                if (!dbP) return '';
                return `<button class="qa-chip qa-chip-recent" data-db-id="${dbP.id}">
                  <span>${dbP.emoji}</span><span>${dbP.name}${rp.variety ? ' · ' + rp.variety : ''}</span>
                </button>`;
              }).join('')}
            </div>
          ` : ''}

          <div style="margin-top:16px;text-align:center">
            <button class="btn btn-outline btn-sm" id="qa-advanced">✏️ Fiche complète</button>
          </div>
        </div>

        <!-- Step 2: Confirm (hidden initially) -->
        <div id="qa-step-2" style="display:none">
          <button class="qa-back-btn" id="qa-back">← Changer</button>
          <div class="qa-plant-confirm" id="qa-plant-confirm"></div>

          <!-- Variety chips -->
          <div id="qa-variety-wrap" style="display:none">
            <div class="qa-section-label">Variété</div>
            <div class="qa-chips" id="qa-variety-chips"></div>
            <input class="form-input qa-variety-input" id="qa-variety-custom"
              placeholder="Autre variété…" type="text">
          </div>

          <!-- Quantity stepper -->
          <div class="qa-row">
            <span class="qa-row-label">Nombre de godets</span>
            <div class="qa-stepper">
              <button class="qa-step-btn" id="qa-qty-minus">−</button>
              <span class="qa-qty-val" id="qa-qty-val">1</span>
              <button class="qa-step-btn" id="qa-qty-plus">+</button>
            </div>
          </div>

          <!-- Zone chips -->
          <div class="qa-section-label">Zone de plantation</div>
          <div class="qa-chips qa-zone-chips" id="qa-zone-chips">
            ${GARDEN_ZONES.filter(z => z.type !== 'repos').map(z => `
              <button class="qa-chip qa-zone-chip" data-zone="${z.id}">
                <span>${z.emoji}</span><span>${z.label}</span>
              </button>
            `).join('')}
          </div>

          <!-- Date -->
          <div class="qa-row">
            <span class="qa-row-label">Date de semis</span>
            <input type="date" class="qa-date-input" id="qa-date"
              value="${new Date().toISOString().split('T')[0]}">
          </div>

          <button class="btn btn-primary btn-full qa-confirm-btn" id="qa-confirm">
            Ajouter au potager 🌱
          </button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);

    // Focus search
    setTimeout(() => overlay.querySelector('#qa-search')?.focus(), 100);

    let selectedDbPlant = prefill?.dbPlant || null;
    let selectedVariety = prefill?.variety || '';
    let selectedZone = prefill?.location || '';
    let qty = 1;

    // ── Text parsing ──────────────────────────────────────────────────────
    const parseText = (text) => {
      const lower = text.toLowerCase().trim();
      if (!lower) return [];
      return PLANTS_DB.filter(p => {
        const n = p.name.toLowerCase();
        const id = p.id.toLowerCase();
        const aliases = [n, id, ...(p.varieties || []).map(v => v.toLowerCase())];
        return aliases.some(a => a.includes(lower) || lower.includes(a.split(' ')[0]));
      }).slice(0, 6);
    };

    const parseNumberFromText = (text) => {
      const m = text.match(/\b(\d+)\b/);
      return m ? parseInt(m[1]) : null;
    };

    const parseZoneFromText = (text) => {
      const lower = text.toLowerCase();
      return GARDEN_ZONES.find(z =>
        lower.includes(z.id.toLowerCase()) ||
        lower.includes(z.label.toLowerCase().split(' — ')[0])
      );
    };

    const parseVarietyFromText = (text, dbPlant) => {
      if (!dbPlant) return '';
      const lower = text.toLowerCase();
      // Check known varieties
      const koko = dbPlant.kokopelli?.varietiesKoko || [];
      const match = koko.find(v => lower.includes(v.toLowerCase()));
      if (match) return match;
      // Check PLANTS_DB varieties
      const varMatch = (dbPlant.varieties || []).find(v => lower.includes(v.toLowerCase()));
      return varMatch || '';
    };

    // ── Show suggestions ──────────────────────────────────────────────────
    const showSuggestions = (results) => {
      const el = overlay.querySelector('#qa-suggestions');
      if (!el) return;
      if (!results.length) { el.innerHTML = ''; return; }
      el.innerHTML = results.map(p => `
        <div class="qa-suggestion" data-db-id="${p.id}">
          <span class="qa-sug-emoji">${p.emoji}</span>
          <div class="qa-sug-info">
            <div class="qa-sug-name">${p.name}</div>
            <div class="qa-sug-cat">${CATEGORIES[p.category]?.label || ''} · ${p.varieties?.slice(0,3).join(', ') || ''}</div>
          </div>
          <span class="qa-sug-arrow">→</span>
        </div>
      `).join('');
      el.querySelectorAll('.qa-suggestion').forEach(s => {
        s.addEventListener('click', () => selectPlant(s.dataset.dbId));
      });
    };

    // ── Select a plant → show step 2 ─────────────────────────────────────
    const selectPlant = (dbId, textOverride = '') => {
      const dbPlant = PLANTS_DB.find(p => p.id === dbId);
      if (!dbPlant) return;
      selectedDbPlant = dbPlant;

      // Auto-parse variety + zone from search text
      const searchText = overlay.querySelector('#qa-search')?.value || textOverride;
      const autoVariety = parseVarietyFromText(searchText, dbPlant);
      const autoZone = parseZoneFromText(searchText);
      const autoQty = parseNumberFromText(searchText);

      if (autoVariety) selectedVariety = autoVariety;
      if (autoZone) {
        selectedZone = autoZone.id;
        overlay.querySelectorAll('.qa-zone-chip').forEach(c => c.classList.toggle('active', c.dataset.zone === autoZone.id));
      }
      if (autoQty) {
        qty = Math.min(autoQty, 99);
        const qv = overlay.querySelector('#qa-qty-val');
        if (qv) qv.textContent = qty;
      }

      const tl = PLANT_TIMELINE[dbPlant.id];
      const bioType = dbPlant.biodynamic || tl?.biodynamicIdeal || 'fruit';
      const bioLabel = MoonCalc.getBiodynamicLabel(bioType);

      // Build confirm card
      const confirmEl = overlay.querySelector('#qa-plant-confirm');
      confirmEl.innerHTML = `
        <div class="qa-confirm-card">
          <span style="font-size:36px">${dbPlant.emoji}</span>
          <div class="qa-confirm-info">
            <div style="font-size:18px;font-weight:800">${dbPlant.name}</div>
            <div style="font-size:12px;color:var(--text-light)">${CATEGORIES[dbPlant.category]?.label || ''}</div>
            ${tl ? `<div style="font-size:11px;color:var(--primary);margin-top:4px">
              ${tl.plantType === 'indoor' ? `🌱 Semis intérieur · ${tl.weekToTransplant}sem → pleine terre` : '🌿 Semis direct'}
              · Récolte dans ~${tl.harvestDaysMin}j
            </div>` : ''}
          </div>
          <span class="badge badge-${bioType}" style="align-self:flex-start">${bioLabel.emoji}</span>
        </div>
      `;

      // Populate variety chips
      const varietyWrap = overlay.querySelector('#qa-variety-wrap');
      const allVarieties = [...(dbPlant.varieties || []), ...(dbPlant.kokopelli?.varietiesKoko || [])];
      const uniqueVarieties = [...new Set(allVarieties)].slice(0, 8);

      if (uniqueVarieties.length) {
        varietyWrap.style.display = '';
        const chipsEl = overlay.querySelector('#qa-variety-chips');
        chipsEl.innerHTML = uniqueVarieties.map(v => `
          <button class="qa-chip qa-var-chip ${v === selectedVariety ? 'active' : ''}" data-variety="${v}">${v}</button>
        `).join('');

        const customInput = overlay.querySelector('#qa-variety-custom');
        if (selectedVariety && !uniqueVarieties.includes(selectedVariety)) {
          customInput.value = selectedVariety;
        }

        chipsEl.querySelectorAll('.qa-var-chip').forEach(c => {
          c.addEventListener('click', () => {
            chipsEl.querySelectorAll('.qa-var-chip').forEach(x => x.classList.remove('active'));
            c.classList.toggle('active');
            selectedVariety = c.classList.contains('active') ? c.dataset.variety : '';
            if (selectedVariety) customInput.value = '';
          });
        });

        customInput.addEventListener('input', () => {
          if (customInput.value) {
            chipsEl.querySelectorAll('.qa-var-chip').forEach(x => x.classList.remove('active'));
            selectedVariety = customInput.value;
          }
        });
      } else {
        varietyWrap.style.display = 'none';
      }

      // Show step 2
      overlay.querySelector('#qa-step-1').style.display = 'none';
      overlay.querySelector('#qa-step-2').style.display = '';
    };

    // ── Search input listener ─────────────────────────────────────────────
    overlay.querySelector('#qa-search').addEventListener('input', e => {
      const val = e.target.value.trim();
      showSuggestions(val.length >= 1 ? parseText(val) : []);
    });

    // ── Chip clicks (seasonal + recent) ──────────────────────────────────
    overlay.querySelectorAll('.qa-chip[data-db-id]').forEach(c => {
      c.addEventListener('click', () => selectPlant(c.dataset.dbId));
    });

    // ── Back button ───────────────────────────────────────────────────────
    overlay.querySelector('#qa-back').addEventListener('click', () => {
      overlay.querySelector('#qa-step-1').style.display = '';
      overlay.querySelector('#qa-step-2').style.display = 'none';
      selectedDbPlant = null;
      overlay.querySelector('#qa-suggestions').innerHTML = '';
    });

    // ── Qty stepper ───────────────────────────────────────────────────────
    overlay.querySelector('#qa-qty-minus').addEventListener('click', () => {
      if (qty > 1) { qty--; overlay.querySelector('#qa-qty-val').textContent = qty; }
    });
    overlay.querySelector('#qa-qty-plus').addEventListener('click', () => {
      qty++; overlay.querySelector('#qa-qty-val').textContent = qty;
    });

    // ── Zone chips ────────────────────────────────────────────────────────
    overlay.querySelectorAll('.qa-zone-chip').forEach(c => {
      if (c.dataset.zone === selectedZone) c.classList.add('active');
      c.addEventListener('click', () => {
        overlay.querySelectorAll('.qa-zone-chip').forEach(x => x.classList.remove('active'));
        if (selectedZone === c.dataset.zone) {
          selectedZone = '';
        } else {
          c.classList.add('active');
          selectedZone = c.dataset.zone;
        }
      });
    });

    // ── Advanced mode ─────────────────────────────────────────────────────
    overlay.querySelector('#qa-advanced').addEventListener('click', () => {
      overlay.remove();
      this.navigate('add-plant');
    });

    // ── Voice input ───────────────────────────────────────────────────────
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = overlay.querySelector('#qa-mic');
    const micStatus = overlay.querySelector('#qa-mic-status');

    if (!SpeechRec) {
      micBtn.style.opacity = '0.3';
      micBtn.title = 'Reconnaissance vocale non disponible sur ce navigateur';
    } else {
      micBtn.addEventListener('click', () => {
        const rec = new SpeechRec();
        rec.lang = 'fr-FR';
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        micStatus.textContent = '🎙️ À l\'écoute…';
        micStatus.style.color = '#e63946';
        micBtn.textContent = '⏹️';

        rec.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          micStatus.textContent = `"${transcript}"`;
          micStatus.style.color = 'var(--text-mid)';
          micBtn.textContent = '🎤';

          const searchInput = overlay.querySelector('#qa-search');
          searchInput.value = transcript;
          const results = parseText(transcript);
          if (results.length === 1) {
            // Unique match → auto-select
            setTimeout(() => selectPlant(results[0].id, transcript), 400);
          } else {
            showSuggestions(results);
          }
        };

        rec.onerror = () => {
          micStatus.textContent = '⚠️ Microphone non disponible';
          micBtn.textContent = '🎤';
        };
        rec.onend = () => { if (micBtn.textContent === '⏹️') micBtn.textContent = '🎤'; };

        rec.start();
      });
    }

    // ── Confirm save ─────────────────────────────────────────────────────
    overlay.querySelector('#qa-confirm').addEventListener('click', async () => {
      if (!selectedDbPlant) return;
      const customVariety = overlay.querySelector('#qa-variety-custom')?.value.trim();
      const finalVariety = customVariety || selectedVariety || '';
      const plantedAt = overlay.querySelector('#qa-date')?.value || new Date().toISOString().split('T')[0];

      const plantId = await db.addPlant({
        dbId: selectedDbPlant.id,
        variety: finalVariety,
        plantedAt,
        location: selectedZone,
        quantity: qty,
        growthStatus: 'semis',
      });

      const profile = ProfileManager.getActive();
      if (profile) {
        const earned = ProfileManager.addXp(profile.id, 'plant_added');
        this.showXpToast(earned, 'plant_added');
      }

      this.checkBadges();
      overlay.remove();

      // Navigate to the new plant's detail
      this.navigate('plant-detail', { id: plantId });
    });

    // Auto-select if prefill given
    if (prefill?.dbPlant) {
      selectPlant(prefill.dbPlant.id);
    }
  }

  showCatalogModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'catalog-modal';
    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle"></div>
        <div class="modal-title">🌻 Catalogue Kokopelli</div>
        <p style="font-size:13px;color:var(--text-light);margin-bottom:14px;line-height:1.5">
          Semences biologiques reproductibles. Cliquez sur une catégorie pour ouvrir le catalogue dans votre navigateur.
        </p>
        <div class="catalog-grid">
          ${KOKOPELLI.catalog.map(cat => `
            <a href="${KOKOPELLI.base + cat.path}" target="_blank" rel="noopener" class="catalog-item">
              <span class="catalog-item-emoji">${cat.emoji}</span>
              <span>${cat.label}</span>
            </a>
          `).join('')}
        </div>
        <div class="catalog-note">
          💡 Les liens ouvrent le site Kokopelli dans votre navigateur. Si une URL ne fonctionne pas, utilisez "Tout le catalogue" et naviguez depuis là.
        </div>
      </div>
    `;
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  // ===== SUCCESSION HELPERS =====

  // For a plant already in the garden, compute the ideal next sowing date
  // based on the most recent batch of the same dbId
  successionNextDate(plant, dbPlant) {
    if (!dbPlant.succession) return null;
    const base = new Date(plant.plantedAt || plant.createdAt);
    const next = new Date(base);
    next.setDate(next.getDate() + dbPlant.succession.interval);
    return next;
  }

  // Generate the batch schedule for a given planting date
  // Returns array of { batchNum, sowDate, harvestStart, status }
  successionBatches(plant, dbPlant) {
    if (!dbPlant || !dbPlant.succession) return [];
    const { interval, maxBatches, seasonStart, seasonEnd } = dbPlant.succession;
    const firstSow = new Date(plant.plantedAt || plant.createdAt);
    const now = new Date();
    const batches = [];

    for (let i = 0; i < maxBatches; i++) {
      const sowDate = new Date(firstSow);
      sowDate.setDate(sowDate.getDate() + i * interval);
      // Stop if sowing month is past season window
      if (sowDate.getMonth() + 1 > seasonEnd) break;

      const harvestStart = new Date(sowDate);
      const harvestDays = parseInt(dbPlant.harvest.duration) || 60;
      harvestStart.setDate(harvestStart.getDate() + harvestDays);

      const daysUntil = Math.round((sowDate - now) / (1000 * 60 * 60 * 24));
      let status = 'past';
      if (daysUntil > 7) status = 'future';
      else if (daysUntil > 0) status = 'soon';
      else if (daysUntil >= -3) status = 'next'; // sow now window

      batches.push({
        num: i + 1,
        sowDate,
        harvestStart,
        daysUntil,
        status,
        sowStr: sowDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        harvestStr: harvestStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      });
    }
    return batches;
  }

  successionHTML(plant, dbPlant) {
    const s = dbPlant.succession;
    if (!s) return '';

    const intervalLabel = s.interval === 14 ? 'toutes les 2 semaines'
      : s.interval === 21 ? 'toutes les 3 semaines'
      : s.interval === 28 ? 'toutes les 4 semaines'
      : `tous les ${s.interval} jours`;

    const batches = this.successionBatches(plant, dbPlant);
    const seasonMonths = Array.from({ length: s.seasonEnd - s.seasonStart + 1 }, (_, i) => s.seasonStart + i);

    // Timeline: months of the year, highlight season window + batch months
    const batchMonths = new Set(batches.map(b => b.sowDate.getMonth() + 1));
    const timelineHTML = [1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
      const inSeason = m >= s.seasonStart && m <= s.seasonEnd;
      const isBatch = batchMonths.has(m);
      const cls = isBatch ? 'batch' : inSeason ? 'active' : '';
      return `<div class="timeline-month ${cls}">${MONTHS_SHORT[m-1]}</div>`;
    }).join('');

    // Batch dots
    const dotsHTML = batches.map(b => `
      <div class="batch-dot ${b.status}" title="Semis ${b.sowStr} → récolte ~${b.harvestStr}">
        Lot ${b.num} · ${b.sowStr}
      </div>
    `).join('');

    // Next action card
    const nextBatch = batches.find(b => b.daysUntil >= -3 && b.daysUntil <= 30);
    const nextCardHTML = nextBatch ? `
      <div class="next-sowing-card">
        <span class="next-sowing-icon">🗓</span>
        <div class="next-sowing-info">
          <div class="next-sowing-label">Prochain semis — lot ${nextBatch.num}</div>
          <div class="next-sowing-date">${nextBatch.sowStr}</div>
          <div class="next-sowing-days">${nextBatch.daysUntil <= 0 ? 'C\'est maintenant !' : `Dans ${nextBatch.daysUntil} jour${nextBatch.daysUntil > 1 ? 's' : ''}`}</div>
        </div>
        <button class="btn-plan-next" data-db-id="${dbPlant.id}" data-sow-date="${nextBatch.sowDate.toISOString().split('T')[0]}">+ Planifier</button>
      </div>
    ` : '';

    return `
      <div class="succession-section">
        <div class="succession-header">
          <span style="font-size:18px">🔄</span>
          <span class="succession-title">Semis échelonnés</span>
          <span class="succession-interval">${intervalLabel}</span>
        </div>
        <p class="succession-note">${s.note}</p>

        <div class="succession-timeline">
          <div class="succession-timeline-label">Fenêtre de semis</div>
          <div class="timeline-track">${timelineHTML}</div>
        </div>

        ${batches.length > 0 ? `
          <div class="succession-timeline-label" style="margin-top:10px;margin-bottom:6px">Planning depuis votre 1er semis</div>
          <div class="batch-dots">${dotsHTML}</div>
        ` : ''}

        ${nextCardHTML}
      </div>
    `;
  }

  // Returns plants in garden whose next succession sowing is within 14 days (or overdue)
  async getSuccessionReminders() {
    const plants = await db.getPlants();
    const growing = plants.filter(p => p.status === 'growing' && p.dbId);
    const now = new Date();
    const seen = new Set();
    const reminders = [];

    for (const plant of growing) {
      const dbPlant = PLANTS_DB.find(p => p.id === plant.dbId);
      if (!dbPlant?.succession || seen.has(dbPlant.id)) continue;

      // Find the most recent batch of this type
      const siblings = growing
        .filter(p => p.dbId === plant.dbId)
        .sort((a, b) => new Date(b.plantedAt || b.createdAt) - new Date(a.plantedAt || a.createdAt));
      const latest = siblings[0];

      const nextDate = this.successionNextDate(latest, dbPlant);
      if (!nextDate) continue;
      const daysUntil = Math.round((nextDate - now) / (1000 * 60 * 60 * 24));

      // Only surface if within 14 days or overdue (and within season window)
      const currentMonth = now.getMonth() + 1;
      const inSeason = currentMonth >= dbPlant.succession.seasonStart && currentMonth <= dbPlant.succession.seasonEnd + 1;
      if (inSeason && daysUntil <= 14) {
        seen.add(dbPlant.id);
        reminders.push({ plant: latest, dbPlant, nextDate, daysUntil,
          nextDateStr: nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) });
      }
    }
    return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  async confirmDeletePlant(id) {
    if (!confirm('Supprimer cette plante et toutes ses notes ? Cette action est irréversible.')) return;
    const plant = await db.getPlant(id);
    if (plant) {
      plant.status = 'removed';
      await db.updatePlant(plant);
    }
    this.navigate('plants');
  }
}

// ===== Bootstrap =====
const app = new PotagerApp();
document.addEventListener('DOMContentLoaded', () => app.init());
