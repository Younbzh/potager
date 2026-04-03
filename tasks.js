// ===== Task Engine — Smart Garden Planner =====
const TaskEngine = (() => {
  const STORAGE_KEY = 'potager-tasks-checked';

  // ── Task type definitions ──────────────────────────────────────────────────
  const TASK_DEF = {
    acclimatation: { label: 'Acclimatation',        emoji: '🌤️', color: '#f4a261', border: '#e76f51' },
    repiquage:     { label: 'Repiquage en terre',   emoji: '🌱', color: '#52b788', border: '#2d6a4f' },
    recolte:       { label: 'Récolte',              emoji: '🧺', color: '#e9c46a', border: '#f4a261' },
  };

  // ── LocalStorage helpers ───────────────────────────────────────────────────
  function getChecked() {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  }

  function toggleChecked(id) {
    const s = getChecked();
    s.has(id) ? s.delete(id) : s.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
    const nowChecked = s.has(id);
    // Sync vers Firestore (fire & forget)
    if (typeof GardenSync !== 'undefined' && GardenSync.gardenId) {
      GardenSync.syncTaskToggle(id, nowChecked);
    }
    return nowChecked;
  }

  function isChecked(id) { return getChecked().has(id); }

  // ── Urgency score (0–50) ───────────────────────────────────────────────────
  function urgencyScore(daysUntil) {
    if (daysUntil < 0)   return 50; // overdue
    if (daysUntil === 0) return 50;
    if (daysUntil <= 3)  return 45;
    if (daysUntil <= 7)  return 35;
    if (daysUntil <= 14) return 25;
    if (daysUntil <= 21) return 15;
    if (daysUntil <= 30) return 8;
    return Math.max(0, 5 - Math.floor(daysUntil / 7));
  }

  // ── Weather score (0–30) ───────────────────────────────────────────────────
  function weatherScore(taskType, weatherData, timeline) {
    if (!weatherData) return 15; // neutral when offline
    const c = weatherData.current;
    const d0 = weatherData.days?.[0];
    const code = c.code;
    const wind = c.windSpeed || 0;
    const maxT = d0?.max ?? c.temp;
    const minT = d0?.min ?? c.temp;

    // Frost / min temp guard
    if (taskType !== 'recolte' && timeline?.minOutdoorTemp && minT < timeline.minOutdoorTemp) {
      return 0;
    }

    if (taskType === 'acclimatation') {
      if ([95,96,99].includes(code) || code >= 65) return 0;
      if (wind > 30) return 0;
      if ([2,3].includes(code)) return 28; // overcast — ideal diffuse light
      if ([51,53,55].includes(code)) return 25;
      if (code <= 1 && maxT >= 12 && maxT <= 22) return 30;
      if (code <= 1 && maxT > 22) return 18; // too hot for tender seedlings
      if (code <= 1 && maxT < 10) return 5;
      return 20;
    }

    if (taskType === 'repiquage') {
      if ([95,96,99].includes(code) || code >= 65) return 0;
      if ([2,3,45,48].includes(code)) return 30; // overcast = no transplant shock
      if ([51,53,55].includes(code)) return 30;
      if (code <= 1 && maxT >= 12 && maxT <= 22) return 25;
      if (code <= 1 && maxT > 22) return 10;
      if (wind > 30) return 5;
      return 20;
    }

    if (taskType === 'recolte') {
      if ([95,96,99].includes(code)) return 0;
      if (code >= 61) return 5;
      if (code <= 2 && maxT >= 15) return 30;
      if ([3,45,48].includes(code)) return 20;
      return 15;
    }

    return 15;
  }

  // ── Moon score (0–20) ─────────────────────────────────────────────────────
  function moonScore(biodynamicIdeal, taskType) {
    const today = new Date();
    const moonType = MoonCalc.getBiodynamicType(today);
    const ideal = biodynamicIdeal || 'fruit';

    if (moonType === ideal) return 20;
    // Complementary pairs
    const comp = { fruit: 'fleur', fleur: 'fruit', racine: 'feuille', feuille: 'racine' };
    if (moonType === comp[ideal]) return 10;
    return 5;
  }

  // ── Human-friendly notes ─────────────────────────────────────────────────
  function makeWeatherNote(taskType, weatherData, timeline) {
    if (!weatherData) return '🌐 Météo indisponible — vérifiez les conditions';
    const c = weatherData.current;
    const d0 = weatherData.days?.[0];
    const code = c.code;
    const minT = d0?.min ?? c.temp;

    if (taskType !== 'recolte' && timeline?.minOutdoorTemp && minT < timeline.minOutdoorTemp) {
      return `🥶 Nuits encore trop froides (${minT}°C) — attendez que le min nocturne dépasse ${timeline.minOutdoorTemp}°C`;
    }
    if ([95,96,99].includes(code)) return '⛈️ Orage prévu — reporter';
    if (code >= 65) return '🌧️ Fortes pluies prévues — reporter';
    if ([51,53,55].includes(code)) {
      if (taskType === 'repiquage') return '🌦️ Bruine — conditions parfaites pour repiquer';
      return '🌦️ Bruine légère — surveillez les jeunes plants';
    }
    if ([2,3].includes(code)) {
      if (taskType === 'repiquage' || taskType === 'acclimatation') return '☁️ Temps couvert — idéal, pas de choc solaire';
      return '☁️ Temps couvert';
    }
    if (code <= 1 && d0?.max > 22) return '☀️ Chaud — ombragez les jeunes plants quelques jours';
    if (code <= 1 && d0?.max < 10) return '🌡️ Températures basses — protégez si besoin';
    if (code <= 2) return '🌤️ Bonnes conditions';
    return '🌿 Vérifiez la météo avant d\'intervenir';
  }

  function makeMoonNote(biodynamicIdeal, plantName) {
    const today = new Date();
    const moonType = MoonCalc.getBiodynamicType(today);
    const bioLabel = MoonCalc.getBiodynamicLabel(moonType);
    const ideal = biodynamicIdeal || 'fruit';

    if (moonType === ideal) return `🌙 ${bioLabel.label} — parfait pour ${plantName}`;
    const comp = { fruit: 'fleur', fleur: 'fruit', racine: 'feuille', feuille: 'racine' };
    if (moonType === comp[ideal]) return `🌙 ${bioLabel.label} — acceptable`;
    return `🌙 ${bioLabel.label} — préférez un jour ${ideal}`;
  }

  // ── Compute milestones for one plant ─────────────────────────────────────
  function computeMilestones(plant, weatherData, now = new Date()) {
    const timeline = PLANT_TIMELINE[plant.dbId];
    if (!timeline) return [];

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sowDate = new Date(plant.plantedAt || plant.createdAt);
    sowDate.setHours(0,0,0,0);

    const dbPlant = PLANTS_DB.find(p => p.id === plant.dbId);
    const plantName = plant.customName || dbPlant?.name || plant.dbId;
    const plantEmoji = plant.customEmoji || dbPlant?.emoji || '🌱';
    const biodynamicIdeal = dbPlant?.biodynamic || timeline.biodynamicIdeal || 'fruit';

    const milestones = [];

    // Last frost for Saint-Thélo ~ April 15
    const lastFrost = new Date(today.getFullYear(), 3, 15);

    // ── Acclimatation ──
    if (timeline.plantType === 'indoor' && timeline.weekToHarden) {
      const hardenDate = new Date(sowDate);
      hardenDate.setDate(hardenDate.getDate() + timeline.weekToHarden * 7);
      const daysUntil = Math.round((hardenDate - today) / 86400000);

      if (daysUntil >= -7 && daysUntil <= 45) {
        const id = `acclimatation-${plant.id}`;
        milestones.push({
          id,
          plantId: plant.id,
          dbId: plant.dbId,
          plantEmoji,
          plantName,
          variety: plant.variety || '',
          quantity: plant.quantity || 1,
          location: plant.location || '',
          type: 'acclimatation',
          date: hardenDate,
          dateStr: hardenDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          daysUntil,
          urgency: urgencyScore(daysUntil),
          weatherScore: weatherScore('acclimatation', weatherData, timeline),
          moonScore: moonScore(biodynamicIdeal, 'acclimatation'),
          weatherNote: makeWeatherNote('acclimatation', weatherData, timeline),
          moonNote: makeMoonNote(biodynamicIdeal, plantName),
          checked: isChecked(id),
        });
      }
    }

    // ── Repiquage ──
    if (timeline.plantType === 'indoor' && timeline.weekToTransplant) {
      let transplantDate = new Date(sowDate);
      transplantDate.setDate(transplantDate.getDate() + timeline.weekToTransplant * 7);

      // Frost delay
      if (timeline.frostSensitive && transplantDate < lastFrost) {
        transplantDate = new Date(lastFrost);
      }

      // Temperature delay — if next 7 days forecast too cold, push 1 week
      if (timeline.minOutdoorTemp && weatherData?.days) {
        const avgMax = weatherData.days.slice(0,4).reduce((s,d) => s + (d.max||0), 0) / 4;
        if (avgMax < timeline.minOutdoorTemp && transplantDate <= new Date(today.getTime() + 14*86400000)) {
          transplantDate.setDate(transplantDate.getDate() + 7);
        }
      }

      const daysUntil = Math.round((transplantDate - today) / 86400000);

      // Skip if plant already transplanted (status beyond semis)
      const alreadyOut = ['croissance','floraison','fructification','recolte'].includes(plant.growthStatus);

      if (!alreadyOut && daysUntil >= -7 && daysUntil <= 60) {
        const id = `repiquage-${plant.id}`;
        milestones.push({
          id,
          plantId: plant.id,
          dbId: plant.dbId,
          plantEmoji,
          plantName,
          variety: plant.variety || '',
          quantity: plant.quantity || 1,
          location: plant.location || '',
          type: 'repiquage',
          date: transplantDate,
          dateStr: transplantDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          daysUntil,
          urgency: urgencyScore(daysUntil),
          weatherScore: weatherScore('repiquage', weatherData, timeline),
          moonScore: moonScore(biodynamicIdeal, 'repiquage'),
          weatherNote: makeWeatherNote('repiquage', weatherData, timeline),
          moonNote: makeMoonNote(biodynamicIdeal, plantName),
          checked: isChecked(id),
        });
      }
    }

    // ── Récolte ──
    if (timeline.harvestDaysMin) {
      const baseDate = (() => {
        if (timeline.plantType === 'indoor' && timeline.weekToTransplant) {
          let t = new Date(sowDate);
          t.setDate(t.getDate() + timeline.weekToTransplant * 7);
          if (timeline.frostSensitive && t < lastFrost) t = new Date(lastFrost);
          return t;
        }
        return sowDate;
      })();

      const harvestStart = new Date(baseDate);
      harvestStart.setDate(harvestStart.getDate() + timeline.harvestDaysMin);
      const harvestEnd = new Date(baseDate);
      harvestEnd.setDate(harvestEnd.getDate() + (timeline.harvestDaysMax || timeline.harvestDaysMin + 30));

      const daysUntilStart = Math.round((harvestStart - today) / 86400000);
      const inWindow = today >= harvestStart && today <= new Date(harvestEnd.getTime() + 14*86400000);

      const showTask = inWindow || (daysUntilStart > 0 && daysUntilStart <= 60);

      if (showTask) {
        const id = `recolte-${plant.id}-${harvestStart.toISOString().split('T')[0]}`;
        milestones.push({
          id,
          plantId: plant.id,
          dbId: plant.dbId,
          plantEmoji,
          plantName,
          variety: plant.variety || '',
          quantity: plant.quantity || 1,
          location: plant.location || '',
          type: 'recolte',
          date: harvestStart,
          dateEnd: harvestEnd,
          dateStr: harvestStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          dateEndStr: harvestEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          daysUntil: daysUntilStart,
          inWindow,
          urgency: inWindow ? 48 : urgencyScore(daysUntilStart),
          weatherScore: weatherScore('recolte', weatherData, timeline),
          moonScore: moonScore(biodynamicIdeal, 'recolte'),
          weatherNote: makeWeatherNote('recolte', weatherData, timeline),
          moonNote: makeMoonNote(biodynamicIdeal, plantName),
          checked: isChecked(id),
        });
      }
    }

    return milestones;
  }

  // ── Generate all tasks ────────────────────────────────────────────────────
  async function generateTasks(weatherData, now = new Date()) {
    const plants = await db.getPlants();
    const growing = plants.filter(p => p.status !== 'removed' && p.dbId && PLANT_TIMELINE[p.dbId]);

    const allTasks = [];
    for (const plant of growing) {
      const milestones = computeMilestones(plant, weatherData, now);
      allTasks.push(...milestones);
    }

    // Sort: unchecked first, then by total score desc
    return allTasks.sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      const sa = a.urgency * 0.5 + a.weatherScore * 0.3 + a.moonScore * 0.2;
      const sb = b.urgency * 0.5 + b.weatherScore * 0.3 + b.moonScore * 0.2;
      return sb - sa;
    });
  }

  // ── Timeline for plant detail view ────────────────────────────────────────
  function getPlantTimeline(plant, now = new Date()) {
    const timeline = PLANT_TIMELINE[plant.dbId];
    const sowDate = new Date(plant.plantedAt || plant.createdAt);
    sowDate.setHours(0,0,0,0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastFrost = new Date(today.getFullYear(), 3, 15);

    const fmt = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const rel = d => {
      const diff = Math.round((d - today) / 86400000);
      if (diff < -1) return `il y a ${Math.abs(diff)}j`;
      if (diff === -1) return 'hier';
      if (diff === 0) return 'aujourd\'hui';
      if (diff === 1) return 'demain';
      return `dans ${diff}j`;
    };
    const phase = d => {
      const diff = Math.round((d - today) / 86400000);
      if (diff < -3) return 'past';
      if (diff < 0) return 'overdue';
      if (diff === 0) return 'today';
      return 'future';
    };

    const steps = [
      {
        type: 'semis',
        emoji: '🌱',
        label: timeline?.plantType === 'bulb' ? 'Plantation' : 'Semis intérieur',
        date: sowDate,
        dateStr: fmt(sowDate),
        relStr: rel(sowDate),
        phase: phase(sowDate),
      }
    ];

    if (!timeline) return steps;

    if (timeline.plantType === 'indoor') {
      if (timeline.weekToHarden) {
        const d = new Date(sowDate);
        d.setDate(d.getDate() + timeline.weekToHarden * 7);
        steps.push({ type: 'acclimatation', emoji: '🌤️', label: 'Acclimatation', date: d, dateStr: fmt(d), relStr: rel(d), phase: phase(d) });
      }
      if (timeline.weekToTransplant) {
        let d = new Date(sowDate);
        d.setDate(d.getDate() + timeline.weekToTransplant * 7);
        if (timeline.frostSensitive && d < lastFrost) d = new Date(lastFrost);
        steps.push({ type: 'repiquage', emoji: '🌿', label: 'Repiquage', date: d, dateStr: fmt(d), relStr: rel(d), phase: phase(d) });
      }
    }

    if (timeline.harvestDaysMin) {
      const baseDate = (() => {
        if (timeline.plantType === 'indoor' && timeline.weekToTransplant) {
          let t = new Date(sowDate);
          t.setDate(t.getDate() + timeline.weekToTransplant * 7);
          if (timeline.frostSensitive && t < lastFrost) t = new Date(lastFrost);
          return t;
        }
        return sowDate;
      })();
      const hStart = new Date(baseDate);
      hStart.setDate(hStart.getDate() + timeline.harvestDaysMin);
      const hEnd = new Date(baseDate);
      hEnd.setDate(hEnd.getDate() + (timeline.harvestDaysMax || timeline.harvestDaysMin + 30));
      steps.push({
        type: 'recolte', emoji: '🧺', label: 'Récolte',
        date: hStart, dateStr: fmt(hStart), dateEndStr: fmt(hEnd),
        relStr: rel(hStart), phase: phase(hStart),
      });
    }

    return steps;
  }

  return { generateTasks, computeMilestones, getPlantTimeline, toggleChecked, isChecked, TASK_DEF };
})();
