// Word Bubbles: Balloon Pop grown up. The bubbles carry whole words, so each one has to be
// read before it is popped. The word is never written on the card - only heard, or shown as
// a picture - or the game would be matching shapes instead of reading.
App.register({
  id: 'bubbles',
  name: 'Word Bubbles',
  emoji: '🫧',
  color: '#4d96ff',
  levels: ['Two-letter words', 'Three-letter words', 'Pair words: sh ch th oo ee', 'Read it: find the picture', 'All the words, and quick'],

  create(stage, api) {
    const L = api.level;
    const GOAL = 5;
    const RISE = [[13, 16], [12, 15], [12, 15], [11, 14], [9, 12]][L - 1];  // seconds to float up
    const GAP = [1500, 1400, 1400, 1300, 1100][L - 1];                      // ms between bubbles
    const MAX = [4, 4, 4, 5, 5][L - 1];
    const readOnly = L >= 4;      // the word is not said: the picture is the only clue

    const little = DATA.joins.map(w => ({ w, e: '' }));
    const pairWords = DATA.soundPairs.flatMap(g => g.words);
    const pool = L === 1 ? little
      : L === 2 ? DATA.cvc
        : L === 3 ? pairWords
          : DATA.cvc.concat(pairWords);

    const bubbles = new Set();
    let target = null;
    let near = [];
    let found = 0;
    let busy = false;
    let finished = false;
    let forceTarget = false;
    let raf = 0;
    let lastTime = 0;
    let spawnTimer = 400;
    let recentLanes = [];

    const sky = UI.el('div', { class: 'bubble-sky' });
    const card = UI.el('button', { class: 'target-card word-target', 'aria-label': 'Hear it again', onclick: () => announce() });
    stage.append(sky, card);

    const bitsOf = w => w.c || [...w.w];

    // wrong answers that look as much like the word as possible, so the letters have to be read
    function lookAlike(t, n) {
      const same = w => [...w.w].filter((ch, i) => t.w[i] === ch).length;
      return UI.shuffle(pool.filter(w => w.w !== t.w && (!t.e || w.e !== t.e)))
        .sort((a, b) => (b.w.length === t.w.length) - (a.w.length === t.w.length) || same(b) - same(a))
        .slice(0, n);
    }

    function drawCard(reveal) {
      card.replaceChildren(...[
        UI.el('span', { class: 'emoji keyword', text: target.e || '👂' }),
        reveal ? UI.el('span', { class: 'letter', text: UI.showLetter(target.w) }) : null,
      ].filter(Boolean));
      UI.replayClass(card, 'pop-in');
    }

    function announce() {
      if (!target) return;
      if (readOnly) return Sound.say('Read the bubbles!', 250, 'Pop the word that matches the picture.');
      return Sound.say(`Pop the word ${target.w}!`, 350, `${target.w}`);
    }

    function newTarget() {
      const options = pool.filter(w => !target || w.w !== target.w);
      target = UI.pick(options);
      near = lookAlike(target, 5);
      drawCard(false);
      if (![...bubbles].some(b => !b.popped && b.word.w === target.w)) forceTarget = true;
      announce();
    }

    function spawn(startY, word) {
      const w = sky.clientWidth;
      const h = sky.clientHeight;
      if (!w || !h) return;
      const size = Math.round(Math.max(104, Math.min(168, w / 2.9)));
      const laneCount = Math.max(2, Math.floor(w / (size * 1.05)));
      const blocked = recentLanes.slice(-Math.min(2, laneCount - 1));
      const lane = UI.pick([...Array(laneCount).keys()].filter(i => !blocked.includes(i)));
      recentLanes = [...recentLanes, lane].slice(-3);

      if (!word) {
        const showing = [...bubbles].filter(b => !b.popped && b.word.w === target.w).length;
        const chance = [0.6, 0.3, 0.1][Math.min(showing, 2)];
        word = forceTarget || Math.random() < chance ? target : UI.pick(near.length ? near : pool);
      }
      if (word.w === target.w) forceTarget = false;

      const shown = UI.showLetter(word.w);
      const fontSize = Math.round(size / (word.w.length * 0.62 + 0.9));
      const node = UI.el('button', {
        class: 'bubble',
        style: `--size:${size}px;width:${size}px;height:${size}px`,
        'aria-label': `Bubble, the word ${word.w}`,
      }, UI.el('span', { class: 'bubble-body' },
        UI.el('span', { class: 'letter', style: `font-size:${fontSize}px`, text: shown })));

      const laneWidth = w / laneCount;
      const b = {
        node,
        word,
        size,
        x: lane * laneWidth + (laneWidth - size) / 2,
        y: startY != null ? startY : h + 10,
        speed: h / (RISE[0] + Math.random() * (RISE[1] - RISE[0])),
        phase: Math.random() * Math.PI * 2,
        popped: false,
      };
      node.addEventListener('pointerdown', e => { e.preventDefault(); tap(b); });
      node.addEventListener('click', e => { if (e.detail === 0) tap(b); });  // keyboard
      place(b, performance.now());
      sky.append(node);
      bubbles.add(b);
    }

    function place(b, t) {
      b.node.style.transform = `translate(${b.x + Math.sin(t / 1100 + b.phase) * 10}px, ${b.y}px)`;
    }

    function frame(t) {
      if (!api.alive) return;
      const dt = lastTime ? Math.min(0.05, (t - lastTime) / 1000) : 0;
      lastTime = t;
      spawnTimer -= dt * 1000;
      if (spawnTimer <= 0 && target && !finished && bubbles.size < MAX) {
        spawn();
        spawnTimer = GAP + Math.random() * 500;
      }
      for (const b of bubbles) {
        if (b.popped) continue;
        b.y -= b.speed * dt;
        place(b, t);
        if (b.y < -b.size - 80) {
          b.node.remove();
          bubbles.delete(b);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function pop(b) {
      b.popped = true;
      b.node.classList.add('popped');
      Sound.sfx('pop');
      const cx = b.x + b.size / 2;
      const cy = b.y + b.size / 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 45 + Math.random() * 35;
        const drop = UI.el('span', {
          class: 'spark drop',
          style: `left:${cx}px;top:${cy}px;--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px`,
        });
        sky.append(drop);
        setTimeout(() => drop.remove(), 600);
      }
      setTimeout(() => { b.node.remove(); bubbles.delete(b); }, 380);
    }

    function tap(b) {
      if (b.popped || !target) return;
      if (b.word.w !== target.w) {
        Sound.sfx('wrong');
        UI.replayClass(b.node.firstChild, 'wobble');
        if (busy) return;
        Sound.say(`That one says ${b.word.w}.`, 250,
          readOnly ? 'Look at the picture again.' : `I want ${target.w}.`);
        return;
      }
      pop(b);
      if (busy || finished) return;
      busy = true;
      found++;
      api.progress(found, GOAL);
      Sound.sfx('correct');
      drawCard(true);   // now the word can be seen, next to its picture
      // the reward teaches: the sounds, then the word, in one breath
      const spoken = Sound.say(UI.pick(UI.PRAISE), 150,
        ...bitsOf(target).flatMap(bit => [{ sound: bit }, 100]), 120, `${target.w}!`);
      if (found >= GOAL) {
        finished = true;
        api.after(spoken, () => api.win(), 1300);
      } else {
        api.after(spoken, () => { busy = false; newTarget(); }, 1300);
      }
    }

    api.progress(0, GOAL);
    newTarget();
    const h = sky.clientHeight;
    spawn(h * 0.5, target);
    spawn(h * 0.85, UI.pick(near));
    raf = requestAnimationFrame(frame);

    return {
      replay: announce,
      destroy() { cancelAnimationFrame(raf); },
    };
  },
});
