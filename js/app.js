// Screens, navigation, levels, rewards and the grown-ups corner.
const App = (() => {
  const LEVELS = 3;
  const games = [];
  let current = null;   // { g, level, token, inst }
  let levelGame = null; // game shown on the level screen
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function register(game) { games.push(game); }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  }

  // ---- levels & progress ----
  const completed = g => Math.max(0, Math.min(LEVELS, Number((Settings.get('progress') || {})[g.id]) || 0));
  const isOpen = (g, level) => !!Settings.get('unlockAll') || level <= completed(g) + 1;

  function renderHome() {
    $('gameGrid').replaceChildren(...games.map((g, i) => {
      const done = completed(g);
      return UI.el('button', {
        class: 'game-tile',
        style: `--c:${g.color};--d:${i * 0.07}s`,
        'aria-label': `${g.name}, ${done} of ${LEVELS} levels finished`,
        onclick: () => { Sound.sfx('tap'); openLevels(g); },
      },
      UI.el('span', { class: 'tile-icon' }, UI.el('span', { class: 'emoji', text: g.emoji })),
      UI.el('span', { class: 'tile-name', text: g.name }),
      UI.el('span', { class: 'tile-pips', 'aria-hidden': 'true' },
        ...Array.from({ length: LEVELS }, (_, n) => UI.el('span', { class: `pip${n < done ? ' on' : ''}` }))));
    }));
    $('starTotal').textContent = Settings.get('stars');
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
    $('levelGrid').replaceChildren(...Array.from({ length: LEVELS }, (_, i) => {
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
      UI.el('span', { class: 'level-stars emoji', text: '⭐'.repeat(n) }),
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
    const unlockedNext = level < LEVELS && level > before && !Settings.get('unlockAll');
    const allDone = level === LEVELS;

    const praise = UI.pick(['Great job!', 'Amazing!', 'You did it!', 'Super star!', 'Fantastic!', 'Hooray!']);
    $('praise').textContent = praise;
    $('bigStar').textContent = allDone ? '🏆' : '🌟';
    const note = unlockedNext ? `🔓 Level ${level + 1} is open!` : allDone ? 'All 3 levels done!' : '';
    $('celebrateNote').textContent = note;
    $('celebrateNote').hidden = !note;
    $('celebrateStars').textContent = stars;
    $('nextBtn').hidden = level >= LEVELS;
    $('celebrate').hidden = false;
    Sound.sfx('win');
    UI.confetti();
    Sound.say(
      praise, 200, 'You got a shiny star!',
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
    renderHome();
  }

  function renderSettings() {
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

  function init() {
    const titleColors = ['#ff5c5c', '#f77f00', '#ffc300', '#43aa8b', '#4d96ff', '#9b5de5', '#f15bb5'];
    let n = 0;
    $('title').replaceChildren(...'ABC Playground'.split(' ').map(word => UI.el('span', { class: 'word' },
      ...[...word].map(ch => UI.el('span', { style: `--c:${titleColors[n % titleColors.length]};--d:${n++ * -0.18}s` }, ch)))));

    renderHome();
    setupGrownupsButton();

    $('homeBtn').onclick = () => { Sound.sfx('tap'); goHome(); };
    $('levelsHome').onclick = () => { Sound.sfx('tap'); goHome(); };
    $('replayBtn').onclick = () => {
      Sound.unlock();
      if (current && current.inst && current.inst.replay) current.inst.replay();
    };
    $('nextBtn').onclick = () => { if (current && current.level < LEVELS) openGame(current.g, current.level + 1); };
    $('againBtn').onclick = () => { if (current) openGame(current.g, current.level); };
    $('celebrateHome').onclick = goHome;
    $('settingsClose').onclick = closeSettings;
    $('settingsDone').onclick = closeSettings;
    $('settings').addEventListener('click', e => { if (e.target.id === 'settings') closeSettings(); });
    $('voiceSelect').onchange = e => { Settings.set('voice', e.target.value); testVoice(); };
    $('voiceTest').onclick = testVoice;
    $('resetStars').onclick = () => {
      if (confirm('Set stars back to 0 and lock levels 2 and 3 again?')) {
        Settings.set('stars', 0);
        Settings.set('progress', {});
        renderSettings();
      }
    };
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('settings').hidden) closeSettings();
    });
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true, capture: true });
    Sound.onVoices(() => { if (!$('settings').hidden) fillVoices(); });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { register };
})();
