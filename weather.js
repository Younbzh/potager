// ===== Weather Module — Saint-Thélo 22460 =====
// Uses Open-Meteo (free, no API key, CORS-friendly)
const Weather = (() => {
  const LAT = 48.26, LON = -2.81;
  const CACHE_KEY = 'weather-cache';
  const TTL = 30 * 60 * 1000; // 30 min

  // WMO weather code → { emoji, label }
  const WMO = {
    0:  { emoji: '☀️',  label: 'Ensoleillé' },
    1:  { emoji: '🌤️', label: 'Peu nuageux' },
    2:  { emoji: '⛅',  label: 'Partiellement nuageux' },
    3:  { emoji: '☁️',  label: 'Couvert' },
    45: { emoji: '🌫️', label: 'Brouillard' },
    48: { emoji: '🌫️', label: 'Brouillard givrant' },
    51: { emoji: '🌦️', label: 'Bruine légère' },
    53: { emoji: '🌦️', label: 'Bruine modérée' },
    55: { emoji: '🌧️', label: 'Bruine dense' },
    61: { emoji: '🌧️', label: 'Pluie légère' },
    63: { emoji: '🌧️', label: 'Pluie modérée' },
    65: { emoji: '🌧️', label: 'Pluie forte' },
    71: { emoji: '🌨️', label: 'Neige légère' },
    73: { emoji: '🌨️', label: 'Neige modérée' },
    75: { emoji: '❄️',  label: 'Neige forte' },
    80: { emoji: '🌦️', label: 'Averses légères' },
    81: { emoji: '🌧️', label: 'Averses modérées' },
    82: { emoji: '⛈️', label: 'Averses violentes' },
    85: { emoji: '🌨️', label: 'Averses de neige' },
    95: { emoji: '⛈️', label: 'Orage' },
    96: { emoji: '⛈️', label: 'Orage avec grêle' },
    99: { emoji: '⛈️', label: 'Orage violent' },
  };

  function getWmo(code) {
    return WMO[code] || { emoji: '🌡️', label: `Code ${code}` };
  }

  function getGardenAdvice(weatherCode, tempMax, windSpeed) {
    if ([95, 96, 99].includes(weatherCode)) return '⛈️ Orage prévu — n\'allez pas au jardin.';
    if ([65, 82].includes(weatherCode) || weatherCode >= 80) return '🌧️ Fortes pluies — pas de semis en pleine terre.';
    if ([61, 63, 80, 81].includes(weatherCode)) return '🌧️ Pluie — arrosage inutile aujourd\'hui.';
    if ([51, 53, 55].includes(weatherCode)) return '🌦️ Bruine — journée idéale pour repiquer les jeunes plants.';
    if (windSpeed > 40) return '💨 Vent fort — évitez les traitements foliaires.';
    if (weatherCode <= 1 && tempMax >= 25) return '☀️ Belle journée — arrosez le soir pour éviter l\'évaporation.';
    if (weatherCode <= 1 && tempMax < 8) return '❄️ Températures basses — protégez les semis fragiles.';
    if (weatherCode <= 2) return '🌤️ Bonnes conditions — jardinage recommandé !';
    if ([3, 45, 48].includes(weatherCode)) return '☁️ Temps couvert — parfait pour transplanter.';
    return '🌱 Vérifiez l\'humidité du sol avant d\'arroser.';
  }

  async function fetchFresh() {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum` +
      `&timezone=Europe%2FParis&forecast_days=4`;

    const res = await window.fetch(url);
    if (!res.ok) throw new Error('Open-Meteo ' + res.status);
    const data = await res.json();

    const cur = data.current;
    const daily = data.daily;

    return {
      ts: Date.now(),
      current: {
        temp: Math.round(cur.temperature_2m),
        humidity: Math.round(cur.relative_humidity_2m),
        windSpeed: Math.round(cur.wind_speed_10m),
        code: cur.weather_code,
        ...getWmo(cur.weather_code)
      },
      days: daily.time.map((t, i) => ({
        date: t,
        max: Math.round(daily.temperature_2m_max[i]),
        min: Math.round(daily.temperature_2m_min[i]),
        code: daily.weather_code[i],
        precip: Math.round(daily.precipitation_sum[i] * 10) / 10,
        ...getWmo(daily.weather_code[i])
      }))
    };
  }

  async function fetch() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.ts < TTL) return data;
      }
      const fresh = await fetchFresh();
      localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      return fresh;
    } catch (e) {
      // Return cached (even stale) on network error
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) return { ...JSON.parse(cached), stale: true };
      } catch (_) {}
      return null;
    }
  }

  function render(data) {
    if (!data) {
      return `<div class="weather-widget">
        <div class="weather-error">🌐 Météo indisponible hors-ligne</div>
      </div>`;
    }

    const { current, days, stale } = data;
    const advice = getGardenAdvice(current.code, days[0]?.max ?? current.temp, current.windSpeed);

    const daysHTML = days.slice(0, 4).map(d => {
      const dateObj = new Date(d.date + 'T12:00:00');
      const label = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
      return `
        <div class="weather-day">
          <div class="weather-day-label">${label.charAt(0).toUpperCase() + label.slice(1)}</div>
          <span class="weather-day-emoji">${d.emoji}</span>
          <div class="weather-day-temp">${d.max}°/${d.min}°</div>
          ${d.precip > 0 ? `<div class="weather-day-rain">💧${d.precip}mm</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="weather-widget">
        <div class="weather-current">
          <span class="weather-main-emoji">${current.emoji}</span>
          <div class="weather-main-info">
            <div class="weather-temp">${current.temp}°C</div>
            <div class="weather-label">${current.label}</div>
            <div class="weather-detail">💧 ${current.humidity}% · 💨 ${current.windSpeed} km/h${stale ? ' · hors-ligne' : ''}</div>
          </div>
        </div>
        <div class="weather-forecast">${daysHTML}</div>
        <div class="weather-advice"><p>${advice}</p></div>
      </div>
    `;
  }

  return { fetch, render };
})();
