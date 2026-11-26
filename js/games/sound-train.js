// Sound Train: the train only takes words that have a certain pair in them - every word with sh,
// or every word with oo. The packing games ask for the sound a word STARTS with; this one asks for
// a sound hiding anywhere inside it, which is the harder half of the job and the one the lesson
// is on. Two carriages to find, not one, because one right answer can be a lucky guess.
App.register({
  id: 'soundtrain',   // Alphabet Train already owns 'train'
  name: 'Sound Train',
  emoji: '🚂',
  color: '#9b5de5',
  levels: ['sh, ch and th', 'oo and ee', 'All six pairs', 'Listen for the pair', 'More pairs: ng, ai, ar, or'],

  create(stage, api) {
    const GOAL = 4;
    const L = api.level;
    const SIZE = [4, 4, 5, 5, 6][L - 1];
    const NEED = 2;
    const listen = L === 4;

    // which pairs this level is about, and the words that carry each one
    const every = [...DATA.soundPairs, ...DATA.morePairs];
    const groups = {};
    every.forEach(g => { groups[g.p] = g.words; });
    const SETS = [['sh', 'ch', 'th'], ['oo', 'ee'], ['sh', 'ch', 'th', 'oo', 'ee', 'ck'],
      ['sh', 'ch', 'th', 'oo', 'ee', 'ck'], ['ng', 'ai', 'ar', 'or']][L - 1];
    const here = SETS.filter(p => (groups[p] || []).length >= NEED);

    let want = null;
    let left = 0;
    let round = 0;
    let locked = false;
    let first = true;

    const engineCar = UI.el('span', { class: 'emoji st-engine', text: '🚂' });
    const sign = UI.el('span', { class: 'st-sign' });
    const engine = UI.el('button', { class: 'st-top', 'aria-label': 'Say it again', onclick: () => replay() }, engineCar, sign);
    const loaded = UI.el('div', { class: 'st-loaded' });
    const cars = UI.el('div', { class: 'st-cars' });
    stage.append(engine, loaded, cars);

    function next() {
      locked = false;
      left = NEED;
      loaded.replaceChildren();
      want = UI.pick(here.length > 1 ? here.filter(p => p !== want) : here);

      const mine = UI.shuffle(groups[want]).slice(0, NEED);

      // Only the wanted pair may turn up more than once on the board. A word can carry two pairs -
      // chick is ch AND ck - so it is not enough to keep the wanted pair out of the others: every
      // word left behind has to avoid every pair already on the board, or there are two answers
      // that both look right and the child who picks the other one was not wrong.
      const pairsOf = w => w.c.filter(c => c.length > 1);
      const taken = new Set(mine.flatMap(pairsOf));
      const others = [];
      for (const w of UI.shuffle(every.flatMap(g => g.words))) {
        if (others.length >= SIZE - NEED) break;
        if (mine.includes(w) || others.includes(w)) continue;
        const ps = pairsOf(w);
        if (!ps.length || ps.some(c => taken.has(c))) continue;
        ps.forEach(c => taken.add(c));
        others.push(w);
      }
      const items = UI.shuffle([...mine, ...others]);

      sign.replaceChildren(listen
        ? UI.el('span', { class: 'emoji', text: '👂' })
        : UI.el('span', { class: 'letter st-pair', text: UI.showLetter(want) }));
      UI.replayClass(engine, 'pop-in');

      cars.className = `st-cars size-${items.length}`;
      cars.replaceChildren(...items.map((w, i) => {
        const car = UI.el('button', {
          class: 'st-car pop-in', style: `animation-delay:${0.06 + i * 0.07}s`, 'aria-label': w.w,
        },
          UI.el('span', { class: 'emoji', text: w.e }),
          UI.el('span', { class: 'letter', text: UI.showLetter(w.w) }));
        car.addEventListener('click', () => tap(car, w));
        return car;
      }));
      if (first) { first = false; api.later(ask, 550); } else ask();
    }

    function ask() {
      if (!want) return null;
      return Sound.say(round === 0 ? 'All aboard!' : UI.pick(['Next train.', 'Again!', 'Here we go.']),
        250, 'Find two words with', 150, { sound: want }, 350, { sound: want }, 300, 'in them.');
    }

    function replay() {
      if (want) ask();
    }

    function tap(car, w) {
      if (locked || car.disabled) return;

      if (!w.c.includes(want)) {
        Sound.sfx('wrong');
        UI.replayClass(car, 'shake');
        UI.replayClass(engineCar, 'wobble');
        Sound.say(`${w.w}.`, 200, 'No', { sound: want }, 250, 'in that one.', 300, 'We want', { sound: want });
        return;
      }

      car.disabled = true;
      car.classList.add('aboard');
      Sound.sfx('correct');
      left--;
      UI.flyTo(car, engineCar, () => {
        UI.replayClass(engineCar, 'bounce');
        Sound.sfx('pop');
        loaded.append(UI.el('span', { class: 'st-chip pop-in' },
          UI.el('span', { class: 'emoji', text: w.e }),
          UI.el('span', { class: 'letter' }, ...w.c.map(bit => UI.el('span', {
            class: bit === want ? 'is-pair' : '', text: UI.showLetter(bit),
          })))));
      });

      if (left > 0) {
        Sound.say(`${w.w}!`, 200, ...w.c.flatMap(bit => [{ sound: bit }, 110]), 150, 'One more!');
        return;
      }

      locked = true;
      round++;
      api.progress(round, GOAL);
      const spoken = Sound.say(`${w.w}!`, 250, 'Both with', { sound: want }, 300, UI.pick(UI.PRAISE));
      api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1500);
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
