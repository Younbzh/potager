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
    await db.init();
    this.setupNav();
    this.navigate('home');
    this.registerSW();
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

    const navViews = ['home', 'plants', 'calendar', 'moon'];
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
      case 'calendar': this.renderHeader(header, 'Calendrier', false); main.innerHTML = this.viewCalendar(); break;
      case 'moon':     this.renderHeader(header, 'Lune & Biodynamie', false); main.innerHTML = this.viewMoon(); break;
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

    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    return `
      <p class="home-greeting">Bonjour 👋</p>
      <p class="home-date">${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>

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
    `;
  }

  plantCardHTML(plant) {
    const dbPlant = PLANTS_DB.find(p => p.id === plant.dbId);
    const emoji = plant.customEmoji || (dbPlant ? dbPlant.emoji : '🌱');
    const name = plant.customName || (dbPlant ? dbPlant.name : 'Plante');
    const cat = plant.category || (dbPlant ? dbPlant.category : '');
    const catColor = CATEGORIES[cat] ? CATEGORIES[cat].color : '#52b788';
    const date = new Date(plant.plantedAt || plant.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    return `
      <div class="plant-card" data-plant-id="${plant.id}">
        <div class="plant-card-cat" style="background:${catColor}"></div>
        <span class="plant-card-emoji">${emoji}</span>
        <div class="plant-card-name">${name}</div>
        <div class="plant-card-variety">${plant.variety || '—'}</div>
        <div class="plant-card-date">🗓 ${date}</div>
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
      <button class="fab" id="fab-add-plant">+</button>
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

    const ficheHTML = dbPlant ? this.ficheHTML(dbPlant, plant) : `
      <div class="card">
        <p style="color:var(--text-mid)">${plant.description || 'Aucune description.'}</p>
      </div>
    `;

    return `
      <div class="plant-hero">
        <span class="plant-hero-emoji">${emoji}</span>
        <div class="plant-hero-name">${name}</div>
        ${plant.variety ? `<div class="plant-hero-variety">${plant.variety}</div>` : ''}
        <div class="plant-hero-date">Planté le ${date}</div>
        ${plant.location ? `<div class="plant-hero-date">📍 ${plant.location}</div>` : ''}
      </div>

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

      <button class="fab" id="fab-add-note" title="Ajouter une note">+</button>
    `;
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
    return `
      <div style="padding-bottom:16px">
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
      on('home-add-plant', 'click', () => this.navigate('add-plant'));
      // Reminder clicks → plant detail
      document.querySelectorAll('#reminders-list .reminder-item').forEach(item => {
        item.addEventListener('click', () => this.navigate('plant-detail', { id: parseInt(item.dataset.plantId) }));
      });
    }

    if (view === 'plants') {
      on('btn-koko-catalog', 'click', () => this.showCatalogModal());
      on('fab-add-plant', 'click', () => this.navigate('add-plant'));
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

        let plantData;

        if (this.isCustomPlant) {
          const customName = $('custom-name')?.value.trim();
          if (!customName) { alert('Veuillez saisir un nom pour la plante.'); return; }
          plantData = {
            dbId: null,
            customName,
            customEmoji: $('custom-emoji')?.value.trim() || '🌿',
            category: $('custom-cat')?.value || 'legume-feuille',
            description: $('custom-desc')?.value.trim(),
            variety, plantedAt, location
          };
        } else {
          if (!this.selectedDbPlant) { alert('Veuillez sélectionner une plante.'); return; }
          plantData = { dbId: this.selectedDbPlant.id, variety, plantedAt, location };
        }

        const plantId = await db.addPlant(plantData);
        if (noteText) await db.addNote(plantId, noteText, 'note');
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
        this.activeTab = 'recoltes';
        this.navigate('plant-detail', { id: plantId });
      });
    }
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
