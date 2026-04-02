// ===== Badge & Gamification System =====
const BadgeSystem = (() => {
  const STORAGE_KEY = 'potager-badges';
  const STREAK_KEY  = 'potager-streak';

  const BADGES = [
    { id: 'first-plant',   emoji: '🌱', label: 'Premier pas',       desc: 'Ajouter sa première plante',     rarity: 'bronze',  test: s => s.totalPlants >= 1   },
    { id: 'five-plants',   emoji: '🌿', label: 'Petit potager',      desc: '5 plantes dans le jardin',       rarity: 'bronze',  test: s => s.totalPlants >= 5   },
    { id: 'ten-plants',    emoji: '🥦', label: 'Vrai jardinier',     desc: '10 plantes cultivées',           rarity: 'silver',  test: s => s.totalPlants >= 10  },
    { id: 'twenty-plants', emoji: '🏡', label: 'Potager abondant',   desc: '20 plantes ou plus',             rarity: 'gold',    test: s => s.totalPlants >= 20  },
    { id: 'first-note',    emoji: '📝', label: 'Observateur',        desc: 'Écrire sa première note',        rarity: 'bronze',  test: s => s.notes >= 1         },
    { id: 'ten-notes',     emoji: '📓', label: 'Journaliste',        desc: '10 notes de suivi',              rarity: 'silver',  test: s => s.notes >= 10        },
    { id: 'first-harvest', emoji: '🧺', label: 'Première récolte',   desc: 'Enregistrer sa 1ère récolte',    rarity: 'bronze',  test: s => s.harvests >= 1      },
    { id: 'five-harvests', emoji: '🥕', label: 'Bon rendement',      desc: '5 récoltes enregistrées',        rarity: 'silver',  test: s => s.harvests >= 5      },
    { id: 'companion',     emoji: '🌸', label: 'Plantes compagnes',  desc: 'Ajouter une fleur compagne',     rarity: 'silver',  test: s => s.hasCompanion       },
    { id: 'three-zones',   emoji: '🗺️', label: 'Explorateur',        desc: 'Plantes dans 3 zones ou plus',   rarity: 'silver',  test: s => s.zones >= 3         },
    { id: 'diversity',     emoji: '🌈', label: 'Biodiversité',       desc: '5 catégories de plantes',        rarity: 'gold',    test: s => s.categories >= 5    },
    { id: 'streak-7',      emoji: '🔥', label: 'Jardinier assidu',   desc: '7 jours d\'affilée dans l\'app', rarity: 'gold',    test: s => s.streak >= 7        },
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Returns array of newly-unlocked badge objects
  async function check(stats) {
    const earned = load();
    const newlyUnlocked = [];

    for (const badge of BADGES) {
      if (!earned[badge.id] && badge.test(stats)) {
        earned[badge.id] = { unlockedAt: new Date().toISOString() };
        newlyUnlocked.push(badge);
      }
    }

    if (newlyUnlocked.length) save(earned);
    return newlyUnlocked;
  }

  function getAll() {
    const earned = load();
    return BADGES.map(b => ({ ...b, unlocked: !!earned[b.id], unlockedAt: earned[b.id]?.unlockedAt }));
  }

  // Returns current streak count (days)
  function trackStreak() {
    try {
      const today = new Date().toDateString();
      const raw = JSON.parse(localStorage.getItem(STREAK_KEY) || '{"lastDay":null,"count":0}');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (raw.lastDay === today) return raw.count;
      if (raw.lastDay === yesterday.toDateString()) {
        const updated = { lastDay: today, count: raw.count + 1 };
        localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
        return updated.count;
      }
      // Streak broken (or first time)
      const updated = { lastDay: today, count: 1 };
      localStorage.setItem(STREAK_KEY, JSON.stringify(updated));
      return 1;
    } catch { return 0; }
  }

  function showToast(badge) {
    const toast = document.createElement('div');
    toast.className = `badge-toast badge-toast-${badge.rarity}`;
    toast.innerHTML = `
      <span class="badge-toast-emoji">${badge.emoji}</span>
      <div class="badge-toast-body">
        <div class="badge-toast-title">Badge débloqué !</div>
        <div class="badge-toast-label">${badge.label}</div>
        <div class="badge-toast-desc">${badge.desc}</div>
      </div>
    `;
    document.body.appendChild(toast);
    // Animate out after 3.5s
    setTimeout(() => toast.classList.add('badge-toast-out'), 3200);
    setTimeout(() => toast.remove(), 3800);
  }

  return { check, getAll, trackStreak, showToast };
})();
