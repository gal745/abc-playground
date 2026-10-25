// Screens, navigation, players, levels, rewards and the grown-ups corner.
const App = (() => {
  const levelsOf = g => g.levels.length;
  const games = [];
  let current = null;   // { g, level, token, inst }
  let levelGame = null; // game shown on the level screen
  let newAvatar = null; // avatar picked in the add-player form
  let addingFromSettings = false;
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function register(game) { games.push(game); }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  }

  // ---- players ----
  function renderPlayers() {
    const list = Settings.players();
    $('playerGrid').replaceChildren(
      ...list.map((p, i) => UI.el('button', {
        class: 'player-card',
        style: `--c:${p.color};--d:${i * 0.07}s`,
        'aria-label': `Play as ${p.name}`,
        onclick: () => choosePlayer(p),
      },
      UI.el('span', { class: 'player-avatar emoji', text: p.avatar }),
      UI.el('span', { class: 'player-name', text: p.name }),
      UI.el('span', { class: 'player-stars' }, UI.el('span', { class: 'emoji', text: '⭐' }), ` ${p.data.stars}`))),
      UI.el('button', {
        class: 'player-card add',
        style: `--d:${list.length * 0.07}s`,
        'aria-label': 'Add a player',
        onclick: () => openAddPlayer(false),
      },
      UI.el('span', { class: 'player-avatar emoji', text: '➕' }),
      UI.el('span', { class: 'player-name', text: 'Add player' }))
    );
  }

  function showPlayers(speak) {
    closeGame();
    $('celebrate').hidden = true;
    renderPlayers();
    show('players');
    if (speak) Sound.say(Settings.players().length ? "Who's playing today?" : 'Tap the plus to add a player!');
  }

  function choosePlayer(p) {
    Sound.unlock();
    Sound.sfx('tap');
    Settings.select(p.id);
    goHome();
    Sound.say(`Hello ${p.name}!`, 150, 'Pick a game!');
  }

  function openAddPlayer(fromSettings) {
    Sound.stop();
    addingFromSettings = fromSettings;
    const used = new Set(Settings.players().map(p => p.avatar));
    newAvatar = Settings.AVATARS.find(a => !used.has(a)) || Settings.AVATARS[0];
    $('playerName').value = '';
    renderAvatarChoices();
    $('addPlayer').hidden = false;
    setTimeout(() => $('playerName').focus(), 50);
  }

  function renderAvatarChoices() {
    $('avatarChoices').replaceChildren(...Settings.AVATARS.map(a => UI.el('button', {
      type: 'button',
      class: `avatar-choice emoji${a === newAvatar ? ' on' : ''}`,
      'aria-pressed': a === newAvatar,
      onclick: () => { newAvatar = a; renderAvatarChoices(); },
    }, a)));
  }

  function saveNewPlayer(e) {
    e.preventDefault();
    const input = $('playerName');
    const name = input.value.trim();
    if (!name) {
      UI.replayClass(input, 'shake');
      input.focus();
      return;
    }
    const p = Settings.addPlayer(name, newAvatar);
    $('addPlayer').hidden = true;
    if (addingFromSettings) renderSettings();
    else choosePlayer(p);
  }

  function renderPlayerChip() {
    const p = Settings.player();
    if (!p) return;
    const chip = $('playerChip');
    chip.style.setProperty('--c', p.color);
    chip.setAttribute('aria-label', `${p.name}, ${p.data.stars} stars. Tap to change player`);
    chip.replaceChildren(
      UI.el('span', { class: 'chip-avatar emoji', text: p.avatar }),
      UI.el('span', { class: 'chip-name', text: p.name }),
      UI.el('span', { class: 'chip-stars' }, UI.el('span', { class: 'emoji', text: '⭐' }), ` ${p.data.stars}`)
    );
  }

  // ---- levels & progress ----
  const completed = g => Math.max(0, Math.min(levelsOf(g), Number((Settings.get('progress') || {})[g.id]) || 0));
  const isOpen = (g, level) => !!Settings.get('unlockAll') || level <= completed(g) + 1;

  function renderHome() {
    $('gameGrid').replaceChildren(...games.map((g, i) => {
      const done = completed(g);
      return UI.el('button', {
        class: 'game-tile',
        style: `--c:${g.color};--d:${i * 0.07}s`,
        'aria-label': `${g.name}, ${done} of ${levelsOf(g)} levels finished`,
        onclick: () => { Sound.sfx('tap'); openLevels(g); },
      },
      UI.el('span', { class: 'tile-icon' }, UI.el('span', { class: 'emoji', text: g.emoji })),
      UI.el('span', { class: 'tile-name', text: g.name }),
      UI.el('span', { class: 'tile-pips', 'aria-hidden': 'true' },
        ...Array.from({ length: levelsOf(g) }, (_, n) => UI.el('span', { class: `pip${n < done ? ' on' : ''}` }))));
    }));
    renderPlayerChip();
  }

  function openLevels(g) {
    Sound.unlock();
    closeGame();
    levelGame = g;
    $('celebrate').hidden = true;
    $('levels').style.setProperty('--c', g.color);
    $('levelsTitle').replaceChildren(UI.el('span', { class: 'emoji', text: g.emoji }), ` ${g.name}`);
    renderLevels();
    show('levels');
    Sound.say(`${g.name}!`, 200, 'Pick a level.');
  }

  function renderLevels() {
    const g = levelGame;
    const done = completed(g);
    $('levelGrid').replaceChildren(...Array.from({ length: levelsOf(g) }, (_, i) => {
      const n = i + 1;
      const open = isOpen(g, n);
      const finished = n <= done;
      const isNext = open && !finished && n === done + 1;
      const card = UI.el('button', {
        class: `level-card${open ? '' : ' locked'}${finished ? ' done' : ''}${isNext ? ' next' : ''}`,
        style: `--d:${i * 0.08}s`,
        'aria-label': `Level ${n}${open ? '' : ', locked'}${finished ? ', finished' : ''}`,
      },
      UI.el('span', { class: 'level-num', text: String(n) }),
      UI.el('span', { class: `level-stars emoji${n > 5 ? ' many' : ''}`, style: `--stars:${n}`, text: '⭐'.repeat(n) }),
      UI.el('span', { class: 'level-desc', text: g.levels[i] }),
      !open ? UI.el('span', { class: 'level-badge emoji', text: '🔒' })
        : finished ? UI.el('span', { class: 'level-badge emoji', text: '🏅' }) : null);
      card.addEventListener('click', () => {
        if (!isOpen(g, n)) {
          Sound.sfx('wrong');
          UI.replayClass(card, 'shake');
          Sound.say(`Finish level ${n - 1} first!`);
          return;
        }
        Sound.sfx('tap');
        openGame(g, n);
      });
      return card;
    }));
  }

  // ---- games ----
  function openGame(g, level) {
    Sound.unlock();
    closeGame();
    $('celebrate').hidden = true;
    $('game').style.setProperty('--c', g.color);
    $('levelBadge').textContent = level;
    show('game');
    const stage = $('stage');
    stage.className = `stage stage-${g.id} level-${level}`;
    stage.replaceChildren();
    $('progress').replaceChildren();

    const token = { alive: true, timers: [], won: false };
    const api = {
      level,
      get alive() { return token.alive; },
      later(fn, ms) { token.timers.push(setTimeout(() => token.alive && fn(), ms)); },
      // run fn once `promise` settles and at least `minMs` has passed
      after(promise, fn, minMs = 900) {
        Promise.all([promise, wait(minMs)]).then(() => token.alive && fn());
      },
      progress: setProgress,
      win() {
        if (!token.alive || token.won) return;
        token.won = true;
        celebrate();
      },
    };
    current = { g, level, token, inst: null };
    try {
      current.inst = g.create(stage, api) || {};
    } catch (err) {
      console.error(err);
    }
  }

  function closeGame() {
    if (!current) return;
    current.token.alive = false;
    current.token.timers.forEach(clearTimeout);
    try { current.inst && current.inst.destroy && current.inst.destroy(); } catch (err) { console.error(err); }
    current = null;
    Sound.stop();
  }

  function goHome() {
    if (!Settings.player()) { showPlayers(false); return; }
    closeGame();
    $('celebrate').hidden = true;
    $('stage').replaceChildren();
    show('home');
    renderHome();
  }

  function setProgress(done, total) {
    const bar = $('progress');
    if (bar.children.length !== total) {
      bar.replaceChildren(...Array.from({ length: total }, () => UI.el('span', { class: 'dot emoji', text: '⭐' })));
    }
    [...bar.children].forEach((dot, i) => {
      const on = i < done;
      if (on && !dot.classList.contains('on')) {
        dot.classList.add('on');
        UI.replayClass(dot, 'pop');
      } else if (!on) {
        dot.classList.remove('on');
      }
    });
  }

  function celebrate() {
    const { g, level } = current;
    const stars = Settings.get('stars') + 1;
    Settings.set('stars', stars);

    const before = completed(g);
    if (level > before) Settings.set('progress', { ...(Settings.get('progress') || {}), [g.id]: level });
    const unlockedNext = level < levelsOf(g) && level > before && !Settings.get('unlockAll');
    const allDone = level === levelsOf(g);

    const praise = UI.pick(['Great job!', 'Amazing!', 'You did it!', 'Super star!', 'Fantastic!', 'Hooray!']);
    const p = Settings.player();
    $('praise').textContent = praise;
    $('bigStar').textContent = allDone ? '🏆' : '🌟';
    const note = unlockedNext ? `🔓 Level ${level + 1} is open!` : allDone ? `All ${levelsOf(g)} levels done!` : '';
    $('celebrateNote').textContent = note;
    $('celebrateNote').hidden = !note;
    $('celebrateStars').textContent = stars;
    $('nextBtn').hidden = level >= levelsOf(g);
    $('celebrate').hidden = false;
    Sound.sfx('win');
    UI.confetti();
    Sound.say(
      p ? `${praise} Well done, ${p.name}!` : praise, 200, 'You got a shiny star!',
      unlockedNext ? 300 : null, unlockedNext ? `Level ${level + 1} is open!` : null,
      allDone ? 300 : null, allDone ? `You finished every level of ${g.name}! Wow!` : null
    );
  }

  // ---- grown-ups corner ----
  function openSettings() {
    Sound.stop();
    renderSettings();
    $('settings').hidden = false;
    $('settingsPanel').scrollTop = 0;
    $('settingsClose').focus();
  }

  function closeSettings() {
    $('settings').hidden = true;
    goHome();
  }

  function renderPlayerList() {
    const currentId = (Settings.player() || {}).id;
    $('playerList').replaceChildren(...Settings.players().map(p => {
      const copy = UI.el('button', { class: 'icon-btn', title: `Copy ${p.name}'s personal link`, 'aria-label': `Copy ${p.name}'s personal link` }, UI.el('span', { class: 'emoji', text: '🔗' }));
      copy.addEventListener('click', () => copyPlayerLink(p, copy));
      const remove = UI.el('button', { class: 'icon-btn', title: `Remove ${p.name}`, 'aria-label': `Remove ${p.name}` }, UI.el('span', { class: 'emoji', text: '🗑️' }));
      remove.addEventListener('click', () => {
        if (!confirm(`Remove ${p.name}? Their stars and levels on this device will be deleted.`)) return;
        Settings.removePlayer(p.id);
        renderSettings();
      });
      return UI.el('div', { class: `player-row${p.id === currentId ? ' current' : ''}` },
        UI.el('span', { class: 'emoji row-avatar', text: p.avatar }),
        UI.el('span', { class: 'row-name', text: p.name }),
        UI.el('span', { class: 'row-stars', text: `⭐ ${p.data.stars}` }),
        copy, remove);
    }));
  }

  function copyPlayerLink(p, btn) {
    const url = new URL(location.href);
    url.hash = '';
    url.search = `?player=${encodeURIComponent(p.name)}&avatar=${encodeURIComponent(p.avatar)}`;
    const link = url.toString();
    const done = () => {
      btn.replaceChildren(UI.el('span', { class: 'emoji', text: '✅' }));
      $('linkNote').textContent = `Copied ${p.name}'s link. Paste it into a message to their family.`;
      $('linkNote').hidden = false;
      setTimeout(() => btn.replaceChildren(UI.el('span', { class: 'emoji', text: '🔗' })), 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done, () => prompt('Copy this link:', link));
    } else {
      prompt('Copy this link:', link);
    }
  }

  function renderSettings() {
    renderPlayerList();
    $('linkNote').hidden = true;
    const p = Settings.player();
    $('playerSettings').hidden = !p;
    if (!p) return;
    $('settingsFor').textContent = p.name;
    $('resetStars').textContent = `Reset ${p.name}'s stars & levels`;

    const chosen = new Set(Settings.get('letters'));
    const matches = list => list.length === chosen.size && list.every(l => chosen.has(l));

    $('presets').replaceChildren(...DATA.sets.map(s => UI.el('button', {
      class: `preset${matches(s.letters) ? ' on' : ''}`,
      onclick: () => { Settings.set('letters', s.letters.slice()); renderSettings(); },
    }, s.label)));

    $('letterChips').replaceChildren(...DATA.letters.map(l => UI.el('button', {
      class: `chip${chosen.has(l) ? ' on' : ''}`,
      'aria-pressed': chosen.has(l),
      'aria-label': `Letter ${l}`,
      onclick: e => toggleLetter(l, e.currentTarget),
    }, l)));

    segment('accentSeg', 'accent', () => { Settings.set('voice', ''); testVoice(); });
    segment('caseSeg', 'letterCase');
    segment('unlockSeg', 'unlockAll');
    segment('rateSeg', 'rate');
    $('settingsStars').textContent = Settings.get('stars');
    fillVoices();
  }

  function toggleLetter(l, btn) {
    const set = new Set(Settings.get('letters'));
    if (set.has(l)) {
      if (set.size <= 1) { UI.replayClass(btn, 'shake'); return; }
      set.delete(l);
    } else {
      set.add(l);
    }
    Settings.set('letters', DATA.letters.filter(x => set.has(x)));
    renderSettings();
  }

  function segment(id, key, onChange) {
    $(id).querySelectorAll('button').forEach(b => {
      const v = isNaN(b.dataset.v) ? b.dataset.v : Number(b.dataset.v);
      b.classList.toggle('on', Settings.get(key) === v);
      b.onclick = () => {
        Settings.set(key, v);
        if (onChange) onChange(v);
        renderSettings();
      };
    });
  }

  function fillVoices() {
    const select = $('voiceSelect');
    const list = Sound.voicesFor();
    const chosen = Settings.get('voice');
    const label = v => v.name.replace(/^Microsoft\s+/, '').replace(/\s+Online \(Natural\)/, ' (natural)').replace(/\s*-\s*English.*$/, '');
    select.replaceChildren(
      UI.el('option', { value: '' }, 'Best voice (automatic)'),
      ...list.map(v => UI.el('option', { value: v.voiceURI }, label(v)))
    );
    select.value = list.some(v => v.voiceURI === chosen) ? chosen : '';
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
    $('voiceTip').hidden = mobile || Sound.hasNaturalVoice();
  }

  function testVoice() {
    Sound.unlock();
    Sound.say("Hello! Let's play together!", 200, `The letter ${Sound.letterName('m')} says`, { sound: 'm' }, 150, 'like moon!');
  }

  function setupGrownupsButton() {
    const btn = $('grownups');
    const tip = $('holdTip');
    let timer = null;
    let tipTimer = null;
    const cancel = () => {
      if (timer) {
        tip.hidden = false;
        clearTimeout(tipTimer);
        tipTimer = setTimeout(() => { tip.hidden = true; }, 2200);
      }
      clearTimeout(timer);
      timer = null;
      btn.classList.remove('holding');
    };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.classList.add('holding');
      tip.hidden = true;
      timer = setTimeout(() => { timer = null; btn.classList.remove('holding'); openSettings(); }, 1000);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, cancel));
    btn.addEventListener('contextmenu', e => e.preventDefault());
    btn.addEventListener('click', e => { if (e.detail === 0) openSettings(); }); // keyboard
  }

  // A personal link (?player=Name&avatar=🦁) sets up that child on this device and opens their games.
  function playerFromLink() {
    const params = new URLSearchParams(location.search);
    const name = (params.get('player') || '').trim().slice(0, 20);
    if (!name) return null;
    let p = Settings.players().find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!p) p = Settings.addPlayer(name, params.get('avatar'));
    history.replaceState(null, '', location.pathname);
    return p;
  }

  function init() {
    const titleColors = ['#ff5c5c', '#f77f00', '#ffc300', '#43aa8b', '#4d96ff', '#9b5de5', '#f15bb5'];
    let n = 0;
    $('title').replaceChildren(...'ABC Playground'.split(' ').map(word => UI.el('span', { class: 'word' },
      ...[...word].map(ch => UI.el('span', { style: `--c:${titleColors[n % titleColors.length]};--d:${n++ * -0.18}s` }, ch)))));

    setupGrownupsButton();

    $('playerChip').onclick = () => { Sound.sfx('tap'); Sound.unlock(); showPlayers(true); };
    $('homeBtn').onclick = () => { Sound.sfx('tap'); goHome(); };
    $('levelsHome').onclick = () => { Sound.sfx('tap'); goHome(); };
    $('replayBtn').onclick = () => {
      Sound.unlock();
      if (current && current.inst && current.inst.replay) current.inst.replay();
    };
    $('nextBtn').onclick = () => { if (current && current.level < levelsOf(current.g)) openGame(current.g, current.level + 1); };
    $('againBtn').onclick = () => { if (current) openGame(current.g, current.level); };
    $('celebrateHome').onclick = goHome;
    $('settingsClose').onclick = closeSettings;
    $('settingsDone').onclick = closeSettings;
    $('settings').addEventListener('click', e => { if (e.target.id === 'settings') closeSettings(); });
    $('settingsAddPlayer').onclick = () => openAddPlayer(true);
    $('addPlayerForm').addEventListener('submit', saveNewPlayer);
    $('addPlayerCancel').onclick = () => { $('addPlayer').hidden = true; };
    $('voiceSelect').onchange = e => { Settings.set('voice', e.target.value); testVoice(); };
    $('voiceTest').onclick = testVoice;
    $('resetStars').onclick = () => {
      const p = Settings.player();
      if (p && confirm(`Set ${p.name}'s stars back to 0 and lock the levels again?`)) {
        Settings.set('stars', 0);
        Settings.set('progress', {});
        renderSettings();
      }
    };
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!$('addPlayer').hidden) $('addPlayer').hidden = true;
      else if (!$('settings').hidden) closeSettings();
    });
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true, capture: true });
    Sound.onVoices(() => { if (!$('settings').hidden) fillVoices(); });

    const invited = playerFromLink();
    if (invited) {
      Settings.select(invited.id);
      goHome();
    } else {
      showPlayers(false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { register };
})();
