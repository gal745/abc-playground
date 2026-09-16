// Grown-up settings, remembered on this device.
const Settings = (() => {
  const KEY = 'abc-playground-v1';
  const lang = (navigator.language || '').toLowerCase();
  const defaults = {
    accent: lang.startsWith('en-us') ? 'us' : /^en-(au|nz)/.test(lang) ? 'au' : 'gb',
    letters: DATA.letters.slice(),
    letterCase: 'lower',
    voice: '',
    rate: 'normal',
    matchPairs: 4,
    stars: 0,
  };

  let state = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === 'object') state = { ...defaults, ...saved };
  } catch (e) { /* storage unavailable: use defaults */ }
  if (!Array.isArray(state.letters) || !state.letters.length) state.letters = defaults.letters.slice();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  return {
    get: key => state[key],
    set(key, value) { state[key] = value; save(); },
  };
})();
