// Catch the Cloud: a sound is given, and clouds drift past carrying little words. Catch the
// clouds whose word has that sound in it - at the start, at the end, or in the middle. The
// words are the two and three letter ones, so every cloud can be read.
App.register({
  id: 'cloud',
  name: 'Catch the Cloud',
  emoji: '☁️',
  color: '#5e60ce',
  levels: ['Starts with the sound', 'Ends with the sound', 'The sound in the middle', 'Pairs: sh ch th oo ee', 'Listen: the sound anywhere'],

  create(stage, api) {
    const L = api.level;
    const GOAL = 5;
    const CROSS = [[13, 16], [12, 15], [12, 15], [11, 14], [10, 13]][L - 1];   // seconds to cross
    const GAP = [1300, 1250, 1250, 1200, 1050][L - 1];
    const MAX = [4, 4, 4, 5, 5][L - 1];
    const listenOnly = L === 5;      // the sound is heard, not shown

    const chunksOf = w => (w.c || [...w.w]);
    const little = DATA.joins.map(w => ({ w, e: '', c: [...w] }));
    const pairWords = DATA.soundPairs.flatMap(g => g.words).map(w => ({ ...w, c: chunksOf(w) }));
    const threes = DATA.cvc.map(w => ({ ...w, c: [...w.w] }));
    const pool = L === 3 ? threes
      : L === 4 ? pairWords
        : L === 5 ? [...little, ...threes, ...pairWords]
          : [...little, ...threes];

    // where the sound has to be, for this level
    const where = (word, sound) => {
      if (L === 1) return word.c[0] === sound;
      if (L === 2) return word.c[word.c.length - 1] === sound;
      if (L === 3) return word.c[1] === sound;
      return word.c.includes(sound);
    };
    // said in an order that reads properly: "a word with oo in the middle", not "has in the middle oo"
    const asking = () => (L === 1 ? ['Find a word that starts with', { sound: target }]
      : L === 2 ? ['Find a word that ends with', { sound: target }]
        : L === 3 ? ['Find a word with', { sound: target }, 'in the middle']
          : ['Find a word with', { sound: target }, 'in it']);
    const because = word => (L === 1 ? [`${word} starts with`, { sound: target }]
      : L === 2 ? [`${word} ends with`, { sound: target }]
        : L === 3 ? [`${word} has`, { sound: target }, 'in the middle']
          : [`${word} has`, { sound: target }, 'in it']);

    // only sounds that really do turn up in enough words
    const sounds = [...new Set(pool.flatMap(w => w.c))]
      .filter(s => (L !== 4 || s.length > 1) && pool.filter(w => where(w, s)).length >= 2);

    const clouds = new Set();
    let target = null;
    let found = 0;
    let busy = false;
    let finished = false;
    let forceTarget = false;
    let raf = 0;
    let lastTime = 0;
    let spawnTimer = 300;

    const sky = UI.el('div', { class: 'cloud-sky' });
    const card = UI.el('button', { class: 'target-card cloud-target', 'aria-label': 'Hear it again', onclick: () => announce() });
    stage.append(sky, card);

    function drawCard(reveal) {
      card.replaceChildren(listenOnly && !reveal
        ? UI.el('span', { class: 'emoji keyword', text: '👂' })
        : UI.el('span', { class: 'letter', text: UI.showLetter(target) }));
      UI.replayClass(card, 'pop-in');
    }

    function announce() {
      if (!target) return;
      return Sound.say('Catch a cloud!', 250, ...asking(), 300, { sound: target });
    }

    function newTarget() {
      target = UI.pick(sounds.length > 1 ? sounds.filter(s => s !== target) : sounds);
      drawCard(false);
      if (![...clouds].some(c => !c.caught && where(c.word, target))) forceTarget = true;
      announce();
    }

    function spawn(word) {
      const w = sky.clientWidth;
      const h = sky.clientHeight;
      if (!w || !h) return;

      if (!word) {
        const showing = [...clouds].filter(c => !c.caught && where(c.word, target)).length;
        const chance = [0.6, 0.3, 0.1][Math.min(showing, 2)];
        const yes = pool.filter(x => where(x, target));
        const no = pool.filter(x => !where(x, target));
        word = (forceTarget || Math.random() < chance) && yes.length ? UI.pick(yes) : UI.pick(no.length ? no : pool);
      }
      if (where(word, target)) forceTarget = false;

      const size = Math.round(Math.max(118, Math.min(190, w / 2.4)));
      const top = card.offsetHeight + 24;
      const band = Math.max(size * 0.7, h - top - size * 0.8);
      // one cloud to a lane, so two words can never drift across each other
      const laneCount = Math.max(2, Math.min(4, Math.floor(band / (size * 0.62))));
      const laneHeight = band / laneCount;
      const taken = new Set([...clouds].filter(c => !c.caught).map(c => c.lane));
      const free = [...Array(laneCount).keys()].filter(i => !taken.has(i));
      if (!free.length) return;      // the sky is full: wait for one to drift off
      const lane = UI.pick(free);

      const toRight = Math.random() < 0.5;
      const fontSize = Math.round(size / (word.w.length * 0.52 + 1.4));
      const node = UI.el('button', {
        class: 'puff',
        style: `--size:${size}px;width:${size}px`,
        'aria-label': `Cloud, the word ${word.w}`,
      }, UI.el('span', { class: 'puff-body' },
        UI.el('span', { class: 'letter', style: `font-size:${fontSize}px`, text: UI.showLetter(word.w) })));

      const c = {
        node,
        word,
        size,
        lane,
        dir: toRight ? 1 : -1,
        x: toRight ? -size * 1.2 : w + size * 0.2,
        y: Math.round(top + lane * laneHeight + Math.random() * Math.max(0, laneHeight - size * 0.5)),
        speed: w / (CROSS[0] + Math.random() * (CROSS[1] - CROSS[0])),
        phase: Math.random() * Math.PI * 2,
        caught: false,
      };
      node.addEventListener('pointerdown', e => { e.preventDefault(); tap(c); });
      node.addEventListener('click', e => { if (e.detail === 0) tap(c); });   // keyboard
      place(c, performance.now());
      sky.append(node);
      clouds.add(c);
    }

    function place(c, t) {
      c.node.style.transform = `translate(${c.x}px, ${c.y + Math.sin(t / 1300 + c.phase) * 8}px)`;
    }

    function frame(t) {
      if (!api.alive) return;
      const dt = lastTime ? Math.min(0.05, (t - lastTime) / 1000) : 0;
      lastTime = t;
      spawnTimer -= dt * 1000;
      if (spawnTimer <= 0 && target && !finished && clouds.size < MAX) {
        spawn();
        spawnTimer = GAP + Math.random() * 400;
      }
      const w = sky.clientWidth;
      for (const c of clouds) {
        if (c.caught) continue;
        c.x += c.dir * c.speed * dt;
        place(c, t);
        if (c.x < -c.size * 1.4 || c.x > w + c.size * 0.4) {
          c.node.remove();
          clouds.delete(c);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    // a caught cloud rains itself out
    function burst(c) {
      c.caught = true;
      c.node.classList.add('caught');
      Sound.sfx('pop');
      const cx = c.x + c.size / 2;
      const cy = c.y + c.size * 0.3;
      for (let i = 0; i < 7; i++) {
        const drop = UI.el('span', {
          class: 'spark drop rain',
          style: `left:${cx + (i - 3) * 14}px;top:${cy}px;--dx:${(i - 3) * 5}px;--dy:${70 + Math.random() * 40}px`,
        });
        sky.append(drop);
        setTimeout(() => drop.remove(), 700);
      }
      setTimeout(() => { c.node.remove(); clouds.delete(c); }, 420);
    }

    function tap(c) {
      if (c.caught || !target) return;
      if (!where(c.word, target)) {
        Sound.sfx('wrong');
        UI.replayClass(c.node.firstChild, 'wobble');
        if (busy) return;
        Sound.say(`${c.word.w} has no`, { sound: target }, 250, 'in it.', 150, 'Listen:', { sound: target });
        return;
      }

      burst(c);
      if (busy || finished) return;
      busy = true;
      found++;
      api.progress(found, GOAL);
      Sound.sfx('correct');
      drawCard(true);
      const spoken = Sound.say(`${c.word.w}!`, 200, ...because(c.word.w), 250, UI.pick(UI.PRAISE));
      if (found >= GOAL) {
        finished = true;
        api.after(spoken, () => api.win(), 1400);
      } else {
        api.after(spoken, () => { busy = false; newTarget(); }, 1400);
      }
    }

    api.progress(0, GOAL);
    newTarget();
    spawn(UI.pick(pool.filter(x => where(x, target))));
    raf = requestAnimationFrame(frame);

    return {
      replay: announce,
      destroy() { cancelAnimationFrame(raf); },
    };
  },
});
