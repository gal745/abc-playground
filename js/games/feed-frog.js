// Feed the Frog: Feed the Dino, but the food is a sentence. Flies drift past carrying words,
// and the frog only wants them in the right order, so the sentence is built one word at a time.
App.register({
  id: 'frog',
  name: 'Feed the Frog',
  emoji: '🐸',
  color: '#2a9d8f',
  levels: ['3 flies', '4 flies', 'Said once: 4 flies', '5 flies', '5 flies, quick'],

  create(stage, api) {
    const L = api.level;
    const GOAL = 3;                                                    // sentences per level
    const MAX = [3, 4, 4, 5, 5][L - 1];                                // flies on screen
    const CROSS = [[11, 14], [10, 13], [10, 13], [9, 12], [7, 10]][L - 1];  // seconds to cross
    const GAP = [900, 850, 850, 750, 650][L - 1];
    const sayEachTime = L <= 2;   // later on the sentence is said once, then it is up to them
    const showAll = L <= 4;       // the sentence sits there in faint letters: this is reading,
                                  // not remembering. The last level shows the next word only.

    const queue = UI.shuffle(DATA.sentences);
    const otherWords = [...DATA.cvc, ...DATA.soundPairs.flatMap(g => g.words)]
      .map(w => w.w).filter(w => w.length <= 4);

    const flies = new Set();
    let sentence = '';
    let words = [];
    let slots = [];
    let pos = 0;
    let round = 0;
    let locked = false;
    let forceNext = false;
    let raf = 0;
    let lastTime = 0;
    let spawnTimer = 300;
    let recentLanes = [];

    const line = UI.el('div', { class: 'frog-line' });
    const sky = UI.el('div', { class: 'fly-sky' });
    const frogBody = UI.el('span', { class: 'frog-body emoji', text: '🐸' });
    const frog = UI.el('button', { class: 'frog', 'aria-label': 'Hear the sentence again', onclick: () => replay() }, frogBody);
    const pics = UI.el('div', { class: 'frog-pics' });
    stage.append(line, sky, pics, frog);

    function nextSentence() {
      if (!queue.length) queue.push(...UI.shuffle(DATA.sentences));
      sentence = queue.pop();
      words = sentence.split(' ');
      pos = 0;
      locked = false;
      forceNext = true;
      flies.forEach(f => f.node.remove());
      flies.clear();
      pics.replaceChildren();

      slots = words.map((w, i) => UI.el('span', {
        class: 'frog-slot pop-in',
        style: `animation-delay:${0.05 + i * 0.06}s`,
      }, showAll ? ghostWord(w) : null));
      line.replaceChildren(...slots);
      markNext();
      ask();
    }

    const ghostWord = w => UI.el('span', { class: 'letter ghost', text: UI.showLetter(w) });

    // which word to catch next: the slot waiting for it says so, faintly
    function markNext() {
      slots.forEach((slot, i) => {
        slot.classList.toggle('next', i === pos);
        if (showAll || slot.classList.contains('filled')) return;
        slot.replaceChildren(i === pos ? ghostWord(words[i]) : null);
      });
    }

    function ask() {
      return Sound.say("I'm hungry for a sentence!", 250, sentence, 350, 'Catch the words in order.');
    }

    function replay() {
      if (locked || !sentence) return;
      if (sayEachTime || pos === 0) return ask();
      return Sound.say(sentence, 300, 'I want', `${words[pos]}`, 'next.');
    }

    // which word the next fly carries: often the one we need, otherwise a later word from the
    // sentence (so the order has to be read, not guessed) or one from the word lists
    function flyWord() {
      if (forceNext) { forceNext = false; return words[pos]; }
      const showing = [...flies].filter(f => !f.caught && f.word === words[pos]).length;
      const chance = [0.55, 0.25, 0.08][Math.min(showing, 2)];
      if (Math.random() < chance) return words[pos];
      const later = words.slice(pos + 1);
      const others = UI.shuffle(otherWords).slice(0, 3);
      return UI.pick([...later, ...later, ...others]);
    }

    function spawn(word) {
      const w = sky.clientWidth;
      const h = sky.clientHeight;
      if (!w || !h) return;
      const text = word || flyWord();
      const size = Math.round(Math.max(72, Math.min(132, w / 3.4)));
      // the open sky: under the sentence, above the frog
      const top = line.offsetHeight + 18;
      const band = Math.max(size, h - top - frog.offsetHeight * 0.55 - size * 0.5);
      const laneCount = Math.max(2, Math.min(4, Math.floor(band / (size * 0.75))));
      const laneHeight = band / laneCount;
      const blocked = recentLanes.slice(-Math.min(1, laneCount - 1));
      const lane = UI.pick([...Array(laneCount).keys()].filter(i => !blocked.includes(i)));
      recentLanes = [...recentLanes, lane].slice(-2);

      const toRight = Math.random() < 0.5;
      const node = UI.el('button', {
        class: `fly${toRight ? '' : ' back'}`,
        style: `--size:${size}px`,
        'aria-label': `Fly, the word ${text}`,
      },
        UI.el('span', { class: 'wing left' }),
        UI.el('span', { class: 'wing right' }),
        UI.el('span', { class: 'fly-body' }, UI.el('span', { class: 'letter', text: UI.showLetter(text) })));

      const f = {
        node,
        word: text,
        size,
        dir: toRight ? 1 : -1,
        x: toRight ? -size * 1.4 : w + size * 0.4,
        y: Math.round(top + lane * laneHeight + Math.random() * laneHeight * 0.45),
        speed: w / (CROSS[0] + Math.random() * (CROSS[1] - CROSS[0])),
        phase: Math.random() * Math.PI * 2,
        caught: false,
      };
      node.addEventListener('pointerdown', e => { e.preventDefault(); tap(f); });
      node.addEventListener('click', e => { if (e.detail === 0) tap(f); });  // keyboard
      place(f, performance.now());
      sky.append(node);
      flies.add(f);
    }

    function place(f, t) {
      f.node.style.transform = `translate(${f.x}px, ${f.y + Math.sin(t / 500 + f.phase) * 7}px)`;
    }

    function frame(t) {
      if (!api.alive) return;
      const dt = lastTime ? Math.min(0.05, (t - lastTime) / 1000) : 0;
      lastTime = t;
      spawnTimer -= dt * 1000;
      if (spawnTimer <= 0 && !locked && flies.size < MAX) {
        spawn();
        spawnTimer = GAP + Math.random() * 400;
      }
      const w = sky.clientWidth;
      let haveNext = false;
      for (const f of flies) {
        if (f.caught) continue;
        f.x += f.dir * f.speed * dt;
        place(f, t);
        if (f.x < -f.size * 1.6 || f.x > w + f.size * 0.6) {
          f.node.remove();
          flies.delete(f);
        } else if (f.word === words[pos]) {
          haveNext = true;
        }
      }
      // never leave a child with nothing to catch
      if (!haveNext && !locked) forceNext = true;
      raf = requestAnimationFrame(frame);
    }

    function tap(f) {
      if (f.caught || locked || !words.length) return;

      if (f.word !== words[pos]) {
        Sound.sfx('wrong');
        UI.replayClass(f.node, 'wobble');
        UI.replayClass(frogBody, 'wobble');
        if (words.includes(f.word)) Sound.say('Not yet!', 250, 'I want', words[pos], 'next.');
        else Sound.say(`Yuck! That says ${f.word}.`, 250, 'I want', words[pos]);
        return;
      }

      f.caught = true;
      Sound.sfx('correct');
      UI.flyTo(f.node, frogBody, () => { UI.replayClass(frogBody, 'chomp'); Sound.sfx('pop'); });
      f.node.classList.add('eaten');
      api.later(() => { f.node.remove(); flies.delete(f); }, 450);

      slots[pos].replaceChildren(UI.el('span', { class: 'letter', text: UI.showLetter(f.word) }));
      slots[pos].classList.add('filled');
      pos++;
      forceNext = true;
      markNext();

      if (pos < words.length) {
        // always name the next word, so nobody has to hold the sentence in their head
        Sound.say(`${f.word}.`, 200, 'Now', `${words[pos]}.`);
        return;
      }

      // the whole sentence is made: show what it says and read it back
      locked = true;
      round++;
      api.progress(round, GOAL);
      flies.forEach(x => x.node.classList.add('away'));
      pics.replaceChildren(...words.filter(w => DATA.pics[w]).map((w, i) =>
        UI.el('span', { class: 'emoji frog-pic pop-in', style: `animation-delay:${0.1 + i * 0.12}s`, text: DATA.pics[w] })));
      const spoken = Sound.say('Yum yum!', 250, ...words.flatMap(w => [w, 80]), 250, `${sentence}!`,
        250, UI.pick(UI.PRAISE));
      api.after(spoken, () => (round >= GOAL ? api.win() : nextSentence()), 2000);
    }

    api.progress(0, GOAL);
    nextSentence();
    spawn(words[0]);
    raf = requestAnimationFrame(frame);

    return {
      replay,
      destroy() { cancelAnimationFrame(raf); },
    };
  },
});
