// Players and settings, remembered on this device.
// Voice settings are shared; stars, levels and letter settings belong to each player.
const Settings = (() => {
  const KEY = 'abc-playground-v2';
  const OLD_KEY = 'abc-playground-v1';
  const AVATARS = ['🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐰', '🐻', '🐨', '🦄', '🐙', '🐧'];
  const COLORS = ['#ff6b6b', '#4d96ff', '#9b5de5', '#f15bb5', '#2a9d8f', '#f77f00'];
  const PLAYER_KEYS = ['letters', 'letterCase', 'unlockAll', 'progress', 'stars'];

  const globalDefaults = {
    accent: 'gb',       // British everywhere, whatever language the device is set to
    accentChosen: false, // ...until a grown-up picks a different one
    voice: '',
    rate: 'normal',
    spellings: {}, // letter -> how a grown-up wants the voice to say its sound
  };
  const playerDefaults = () => ({
    letters: DATA.letters.slice(),
    letterCase: 'lower',
    unlockAll: 0,
    progress: {}, // game id -> highest level finished
    stars: 0,
  });

  let state = { global: { ...globalDefaults }, players: [], current: null };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && typeof saved === 'object') {
        state.global = { ...globalDefaults, ...(saved.global || {}) };
        state.players = Array.isArray(saved.players) ? saved.players : [];
        state.current = saved.current || null;
        return;
      }
      // keep voice choices from the version before players existed
      const old = JSON.parse(localStorage.getItem(OLD_KEY));
      if (old && typeof old === 'object') {
        for (const k of Object.keys(globalDefaults)) if (old[k] != null) state.global[k] = old[k];
      }
    } catch (e) { /* storage unavailable: use defaults */ }
  }

  function clean() {
    // Devices used before the games settled on British had an accent picked from the device's
    // own language. Put those back to British; a deliberate choice is kept.
    if (!state.global.accentChosen) state.global.accent = globalDefaults.accent;
    state.players = state.players
      .filter(p => p && typeof p === 'object' && p.id && typeof p.name === 'string')
      .map((p, i) => {
        const data = { ...playerDefaults(), ...(p.data || {}) };
        if (!Array.isArray(data.letters) || !data.letters.length) data.letters = DATA.letters.slice();
        if (!data.progress || typeof data.progress !== 'object') data.progress = {};
        return { id: p.id, name: p.name.slice(0, 20), avatar: p.avatar || AVATARS[i % AVATARS.length], color: p.color || COLORS[i % COLORS.length], data };
      });
    if (!state.players.some(p => p.id === state.current)) state.current = null;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  load();
  clean();

  const player = () => state.players.find(p => p.id === state.current) || null;

  return {
    AVATARS,
    get(key) {
      if (PLAYER_KEYS.includes(key)) {
        const p = player();
        return p ? p.data[key] : playerDefaults()[key];
      }
      return state.global[key];
    },
    set(key, value) {
      if (PLAYER_KEYS.includes(key)) {
        const p = player();
        if (!p) return;
        p.data[key] = value;
      } else {
        state.global[key] = value;
        if (key === 'accent') state.global.accentChosen = true;
      }
      save();
    },
    players: () => state.players.slice(),
    player,
    select(id) {
      state.current = state.players.some(p => p.id === id) ? id : null;
      save();
    },
    addPlayer(name, avatar) {
      const used = new Set(state.players.map(p => p.avatar));
      const p = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: String(name).trim().slice(0, 20),
        avatar: AVATARS.includes(avatar) ? avatar : (AVATARS.find(a => !used.has(a)) || AVATARS[0]),
        color: COLORS[state.players.length % COLORS.length],
        data: playerDefaults(),
      };
      state.players.push(p);
      save();
      return p;
    },
    removePlayer(id) {
      state.players = state.players.filter(p => p.id !== id);
      if (state.current === id) state.current = null;
      save();
    },
  };
})();
