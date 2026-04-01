// Moon phase calculations for garden biodynamic calendar
const MoonCalc = {
  SYNODIC_PERIOD: 29.53058867,
  // Reference new moon: January 6, 2000 18:14 UTC
  REFERENCE: new Date('2000-01-06T18:14:00Z'),

  // Returns moon age in days (0 = new moon, ~14.77 = full moon)
  getPhase(date = new Date()) {
    const diff = (date - this.REFERENCE) / (1000 * 60 * 60 * 24);
    return ((diff % this.SYNODIC_PERIOD) + this.SYNODIC_PERIOD) % this.SYNODIC_PERIOD;
  },

  // Returns illumination fraction 0-1
  getIllumination(phase) {
    return (1 - Math.cos((phase / this.SYNODIC_PERIOD) * 2 * Math.PI)) / 2;
  },

  getPhaseName(phase) {
    const f = phase / this.SYNODIC_PERIOD;
    if (f < 0.03 || f > 0.97) return 'Nouvelle Lune';
    if (f < 0.22) return 'Croissant';
    if (f < 0.28) return 'Premier Quartier';
    if (f < 0.47) return 'Gibbeuse Croissante';
    if (f < 0.53) return 'Pleine Lune';
    if (f < 0.72) return 'Gibbeuse Décroissante';
    if (f < 0.78) return 'Dernier Quartier';
    return 'Dernier Croissant';
  },

  getPhaseEmoji(phase) {
    const index = Math.round((phase / this.SYNODIC_PERIOD) * 8) % 8;
    return ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][index];
  },

  isWaxing(phase) {
    return phase < this.SYNODIC_PERIOD / 2;
  },

  // Simplified biodynamic type based on tropical zodiac approximation
  // Moon traverses zodiac in ~27.32 days (sidereal period)
  getBiodynamicType(date = new Date()) {
    // Reference position: Moon in Aries on Jan 1, 2000
    const SIDEREAL = 27.32166;
    const REF = new Date('2000-01-01T00:00:00Z');
    const days = (date - REF) / (1000 * 60 * 60 * 24);
    const pos = ((days % SIDEREAL) + SIDEREAL) % SIDEREAL;
    const signIndex = Math.floor((pos / SIDEREAL) * 12);

    // Fire(fruit), Earth(racine), Air(fleur), Water(feuille)
    const types = ['fruit', 'racine', 'fleur', 'feuille',
                   'fruit', 'racine', 'fleur', 'feuille',
                   'fruit', 'racine', 'fleur', 'feuille'];
    return types[signIndex % 12];
  },

  getBiodynamicLabel(type) {
    return {
      fruit:  { label: 'Jour Fruit', emoji: '🍅', color: '#e76f51', advice: 'Idéal pour planter tomates, courgettes, haricots, poivrons. Excellent moment pour la récolte des fruits et légumes-fruits.' },
      racine: { label: 'Jour Racine', emoji: '🥕', color: '#e9a62a', advice: 'Parfait pour carottes, radis, betteraves, pommes de terre, oignons. La sève est concentrée dans les racines.' },
      fleur:  { label: 'Jour Fleur', emoji: '🌸', color: '#c77dff', advice: 'Favorable aux fleurs, aromatiques et aux boutures. Bon moment pour tailler les rosiers et les arbres fruitiers.' },
      feuille:{ label: 'Jour Feuille', emoji: '🥬', color: '#52b788', advice: 'Propice aux salades, épinards, choux, herbes aromatiques. La sève monte dans les feuilles — idéal pour les légumes-feuilles.' }
    }[type];
  },

  getPhaseAdvice(phase) {
    const f = phase / this.SYNODIC_PERIOD;
    if (f < 0.03 || f > 0.97) return 'Nouvelle lune : jour de repos pour le potager. Idéal pour préparer le sol et planifier.';
    if (f < 0.22) return 'Lune croissante : la sève monte vers les parties aériennes. Favorise la croissance et les semis.';
    if (f < 0.28) return 'Premier quartier : bonne énergie pour les plantations et les greffes.';
    if (f < 0.47) return 'Gibbeuse croissante : forte vitalité. Excellent pour semer et planter.';
    if (f < 0.53) return 'Pleine lune : pic d\'énergie maximale. Parfait pour la récolte et les conserves.';
    if (f < 0.72) return 'Gibbeuse décroissante : la sève descend. Favorise l\'enracinement et les plantations de vivaces.';
    if (f < 0.78) return 'Dernier quartier : bon moment pour désherber, tailler et faire le compost.';
    return 'Dernier croissant : période de purge. Idéal pour traiter contre les parasites.';
  },

  // Returns next 4 key moon phases from a given date
  getNextPhases(date = new Date()) {
    const phase = this.getPhase(date);
    const targets = [
      { frac: 0, name: 'Nouvelle Lune', emoji: '🌑' },
      { frac: 0.25, name: 'Premier Quartier', emoji: '🌓' },
      { frac: 0.5, name: 'Pleine Lune', emoji: '🌕' },
      { frac: 0.75, name: 'Dernier Quartier', emoji: '🌗' }
    ];

    return targets.map(t => {
      let targetDays = t.frac * this.SYNODIC_PERIOD;
      let diff = targetDays - phase;
      if (diff <= 0.5) diff += this.SYNODIC_PERIOD;
      const nextDate = new Date(date.getTime() + diff * 24 * 60 * 60 * 1000);
      return {
        name: t.name,
        emoji: t.emoji,
        date: nextDate,
        daysUntil: Math.round(diff),
        dateStr: nextDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  },

  // Returns array of {day, phase, emoji, type} for each day of a month
  getMonthData(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const phase = this.getPhase(date);
      result.push({
        day: d,
        date,
        phase,
        emoji: this.getPhaseEmoji(phase),
        phaseName: this.getPhaseName(phase),
        type: this.getBiodynamicType(date),
        illumination: this.getIllumination(phase)
      });
    }
    return result;
  },

  // CSS box-shadow for moon display based on phase
  getMoonCSS(phase) {
    const frac = phase / this.SYNODIC_PERIOD;
    const size = 130; // px
    if (frac < 0.02 || frac > 0.98) {
      return { boxShadow: `inset 0 0 0 ${size}px rgba(10,30,15,0.92)`, borderRadius: '50%' };
    }
    if (Math.abs(frac - 0.5) < 0.02) {
      return { boxShadow: 'none', borderRadius: '50%' };
    }
    const shadowColor = 'rgba(10, 30, 15, 0.9)';
    if (frac < 0.5) {
      // Waxing: shadow on left, light on right
      const offset = size * (1 - frac * 4);
      const spread = -size * Math.abs(0.25 - frac) * 2;
      return {
        boxShadow: `inset ${Math.max(-size, offset)}px 0 0 ${Math.max(-size/2, spread)}px ${shadowColor}`,
        borderRadius: '50%'
      };
    } else {
      // Waning: shadow on right, light on left
      const offset = -size * (1 - (1 - frac) * 4);
      const spread = -size * Math.abs(0.75 - frac) * 2;
      return {
        boxShadow: `inset ${Math.min(size, offset)}px 0 0 ${Math.max(-size/2, spread)}px ${shadowColor}`,
        borderRadius: '50%'
      };
    }
  }
};
