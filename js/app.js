// Screens, navigation, rewards and the grown-ups corner.
const App = (() => {
  const games = [];
  let current = null; // { g, token, inst }
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function register(game) { games.push(game); }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  }

  function renderHome() {
    $('gameGrid').replaceChildren(...games.map((g, i) => UI.el('button', {
      class: 'game-tile',
      style: `--c:${g.color};--d:${i * 0.07}s`,
      'aria-label': g.name,
      onclick: () => { Sound.sfx('tap'); openGame(g); },
    },
    UI.el('span', { class: 'tile-icon' }, UI.el('span', { class: 'emoji', text: g.emoji })),
    UI.el('span', { class: 'tile-name', text: g.name }))));
    $('starTotal').textContent = Settings.get('stars');
  }

  // ---- games ----
  function openGame(g) {
    Sound.unlock();
    closeGame();
    $('celebrate').hidden = true;
    $('game').style.setProperty('--c', g.color);
    show('game');
    const stage = $('stage');
    stage.className = `stage stage-${g.id}`;
    stage.replaceChildren();
    $('progress').replaceChildren();

    const token = { alive: true, timers: [], won: false };
    const api = {
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
    current = { g, token, inst: null };
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
    const stars = Settings.get('stars') + 1;
    Settings.set('stars', stars);
    const praise = UI.pick(['Great job!', 'Amazing!', 'You did it!', 'Super star!', 'Fantastic!', 'Hooray!']);
    $('praise').textContent = praise;
    $('celebrateStars').textContent = stars;
    $('celebrate').hidden = false;
    Sound.sfx('win');
    UI.confetti();
    Sound.say(praise, 200, 'You got a shiny star!');
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
    segment('rateSeg', 'rate');
    segment('pairsSeg', 'matchPairs');
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
    $('replayBtn').onclick = () => {
      Sound.unlock();
      if (current && current.inst && current.inst.replay) current.inst.replay();
    };
    $('againBtn').onclick = () => { if (current) openGame(current.g); };
    $('celebrateHome').onclick = goHome;
    $('settingsClose').onclick = closeSettings;
    $('settingsDone').onclick = closeSettings;
    $('settings').addEventListener('click', e => { if (e.target.id === 'settings') closeSettings(); });
    $('voiceSelect').onchange = e => { Settings.set('voice', e.target.value); testVoice(); };
    $('voiceTest').onclick = testVoice;
    $('resetStars').onclick = () => {
      if (confirm('Set the star count back to 0?')) { Settings.set('stars', 0); renderSettings(); }
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
