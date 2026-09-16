// Balloon Pop: hear a letter, pop the balloons that show it.
App.register({
  id: 'balloons',
  name: 'Balloon Pop',
  emoji: '🎈',
  color: '#ff6b6b',
  levels: ['Letters with pictures', 'Faster, tricky letters', 'Listen for the sound'],

  create(stage, api) {
    const L = api.level;
    const GOAL = [5, 6, 7][L - 1];
    const CROSS = [[8, 11], [6, 8], [5.5, 7.5]][L - 1]; // seconds for a balloon to float up
    const GAP = [1300, 1000, 900][L - 1];               // ms between new balloons
    const MAX = [5, 7, 8][L - 1];
    const listenOnly = L === 3;

    const letters = UI.activeLetters();
    const balloons = new Set();
    let target = null;
    let found = 0;
    let busy = false;
    let finished = false;
    let forceTarget = false;
    let raf = 0;
    let lastTime = 0;
    let spawnTimer = 400;
    let recentLanes = [];

    const sky = UI.el('div', { class: 'balloon-sky' });
    const card = UI.el('button', { class: 'target-card', 'aria-label': 'Hear it again', onclick: () => announce() });
    stage.append(sky, card);

    const keyword = l => (DATA.words[l] || [])[0];

    function announce() {
      if (!target) return;
      if (listenOnly) {
        return Sound.say('Listen carefully!', 150, 'Pop the balloons that say', { sound: target }, 300, { sound: target });
      }
      const kw = keyword(target);
      return Sound.say(`Can you pop the letter ${Sound.letterName(target)}?`, 200, { sound: target }, L === 1 && kw ? `like ${kw.w}!` : null);
    }

    function drawCard(reveal) {
      const kw = keyword(target);
      if (listenOnly && !reveal) {
        card.replaceChildren(UI.el('span', { class: 'emoji keyword', text: '👂' }), UI.el('span', { class: 'emoji keyword', text: '🔊' }));
      } else {
        card.replaceChildren(
          UI.el('span', { class: 'letter', text: UI.showLetter(target) }),
          L === 1 && kw ? UI.el('span', { class: 'emoji keyword', text: kw.e }) : null
        );
      }
      UI.replayClass(card, 'pop-in');
    }

    function newTarget() {
      const options = letters.length > 1 ? letters.filter(l => l !== target) : letters;
      target = UI.pick(options);
      drawCard(false);
      if (![...balloons].some(b => !b.popped && b.letter === target)) forceTarget = true;
      announce();
    }

    // later levels mix in letters that look alike (b / d / p ...)
    function pickDistractor() {
      const tricky = (DATA.lookAlikes[target] || '').split('');
      if (L >= 2 && tricky.length && Math.random() < 0.5) return UI.pick(tricky);
      return UI.pick(UI.distractors(target, 3, letters));
    }

    function spawn(startY, letter) {
      const w = sky.clientWidth;
      const h = sky.clientHeight;
      if (!w || !h) return;
      const size = Math.round(Math.max(76, Math.min(124, w / 6)));
      const height = Math.round(size * 1.2);
      const laneCount = Math.max(3, Math.floor(w / (size * 1.2)));
      const blocked = recentLanes.slice(-Math.min(2, laneCount - 1));
      const lane = UI.pick([...Array(laneCount).keys()].filter(i => !blocked.includes(i)));
      recentLanes = [...recentLanes, lane].slice(-3);

      if (!letter) {
        const showing = [...balloons].filter(b => !b.popped && b.letter === target).length;
        const chance = [0.6, 0.25, 0.08][Math.min(showing, 2)];
        letter = forceTarget || Math.random() < chance ? target : pickDistractor();
      }
      if (letter === target) forceTarget = false;

      const color = UI.pick(UI.BALLOON_COLORS);
      const node = UI.el('button', {
        class: 'balloon',
        style: `--bc:${color};--size:${size}px;width:${size}px;height:${height}px`,
        'aria-label': `Balloon, letter ${letter}`,
      }, UI.el('span', { class: 'balloon-body' }, UI.el('span', { class: 'letter', text: UI.showLetter(letter) })));

      const laneWidth = w / laneCount;
      const b = {
        node, letter, color, size, height,
        x: lane * laneWidth + (laneWidth - size) / 2,
        y: startY != null ? startY : h + 10,
        speed: h / (CROSS[0] + Math.random() * (CROSS[1] - CROSS[0])),
        phase: Math.random() * Math.PI * 2,
        popped: false,
      };
      node.addEventListener('pointerdown', e => { e.preventDefault(); tap(b); });
      node.addEventListener('click', e => { if (e.detail === 0) tap(b); }); // keyboard
      place(b, performance.now());
      sky.append(node);
      balloons.add(b);
    }

    function place(b, t) {
      b.node.style.transform = `translate(${b.x + Math.sin(t / 900 + b.phase) * 8}px, ${b.y}px)`;
    }

    function frame(t) {
      if (!api.alive) return;
      const dt = lastTime ? Math.min(0.05, (t - lastTime) / 1000) : 0;
      lastTime = t;
      spawnTimer -= dt * 1000;
      if (spawnTimer <= 0 && target && !finished && balloons.size < MAX) {
        spawn();
        spawnTimer = GAP + Math.random() * 500;
      }
      for (const b of balloons) {
        if (b.popped) continue;
        b.y -= b.speed * dt;
        place(b, t);
        if (b.y < -b.height - 80) {
          b.node.remove();
          balloons.delete(b);
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function pop(b) {
      b.popped = true;
      b.node.classList.add('popped');
      Sound.sfx('pop');
      const cx = b.x + b.size / 2;
      const cy = b.y + b.height / 2;
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const dist = 50 + Math.random() * 40;
        const spark = UI.el('span', {
          class: 'spark',
          style: `left:${cx}px;top:${cy}px;--bc:${b.color};--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px`,
        });
        sky.append(spark);
        setTimeout(() => spark.remove(), 600);
      }
      setTimeout(() => { b.node.remove(); balloons.delete(b); }, 380);
    }

    function tap(b) {
      if (b.popped || !target) return;
      if (b.letter === target) {
        pop(b);
        if (busy || finished) return;
        busy = true;
        found++;
        api.progress(found, GOAL);
        Sound.sfx('correct');
        if (listenOnly) drawCard(true);
        const spoken = Sound.say(UI.pick(UI.PRAISE), 100, { sound: target });
        if (found >= GOAL) {
          finished = true;
          api.after(spoken, () => api.win(), 1200);
        } else {
          api.after(spoken, () => { busy = false; newTarget(); }, 1200);
        }
      } else {
        Sound.sfx('wrong');
        UI.replayClass(b.node.firstChild, 'wobble');
        if (busy) return;
        if (listenOnly) Sound.say('Oops! That one says', { sound: b.letter }, 250, 'Listen...', { sound: target });
        else Sound.say(`Oops! That's ${Sound.letterName(b.letter)}.`, 150, `Can you find ${Sound.letterName(target)}?`);
      }
    }

    api.progress(0, GOAL);
    newTarget();
    const h = sky.clientHeight;
    spawn(h * 0.5, target);
    spawn(h * 0.8, pickDistractor());
    spawn(h * 0.25, pickDistractor());
    raf = requestAnimationFrame(frame);

    return {
      replay: announce,
      destroy() { cancelAnimationFrame(raf); },
    };
  },
});
