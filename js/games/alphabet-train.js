// Alphabet Train: fill in the missing letters of the alphabet.
App.register({
  id: 'train',
  name: 'Alphabet Train',
  emoji: '🚂',
  color: '#e63946',
  levels: ['What comes next?', 'Missing in the middle', 'Two missing letters', 'Capital letters', 'Three missing letters'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const LEN = [4, 5, 5, 5, 6][L - 1];
    const MISSING = [1, 1, 2, 1, 3][L - 1];
    const CHOICES = [2, 3, 3, 3, 4][L - 1];
    const upper = L === 4;
    const A = DATA.letters;

    let round = 0;
    let seq = [];
    let gaps = [];
    let pos = 0;
    let locked = false;
    let cars = [];

    const train = UI.el('div', { class: 'train' });
    const choices = UI.el('div', { class: `choices${CHOICES >= 4 ? ' count-4' : ''}` });
    stage.append(train, choices);

    const faceOf = l => (upper ? l.toUpperCase() : UI.showLetter(l));
    const name = l => Sound.letterName(l);

    function next() {
      locked = false;
      pos = 0;
      const start = UI.rand(A.length - LEN + 1);
      seq = A.slice(start, start + LEN);
      const spots = [...Array(LEN).keys()];
      if (L === 1) gaps = [LEN - 1];
      else gaps = UI.sample(L === 2 ? spots.slice(1, -1) : spots, MISSING).sort((a, b) => a - b);

      cars = seq.map((l, i) => UI.el('div', {
        class: `car${gaps.includes(i) ? ' gap' : ''}`,
        style: `--bc:${UI.COLORS[i % UI.COLORS.length]}`,
      }, UI.el('span', { class: 'letter', text: gaps.includes(i) ? '?' : faceOf(l) })));
      train.classList.remove('leave');
      train.replaceChildren(UI.el('span', { class: 'engine emoji', text: '🚂' }), ...cars);
      UI.replayClass(train, 'arrive');
      markCurrent();

      // the missing letters plus nearby letters that aren't on the train
      const missing = gaps.map(i => seq[i]);
      const anchor = A.indexOf(seq[gaps[0]]);
      const nearby = UI.shuffle(A.filter(l => !seq.includes(l) && Math.abs(A.indexOf(l) - anchor) <= 4));
      const others = UI.shuffle(A.filter(l => !seq.includes(l) && !nearby.includes(l)));
      const opts = [...missing, ...nearby, ...others].slice(0, CHOICES);
      const colors = UI.shuffle(UI.COLORS);
      choices.replaceChildren(...UI.shuffle(opts).map((l, i) => {
        const btn = UI.el('button', {
          class: 'letter-btn pop-in',
          style: `--bc:${colors[i % colors.length]};animation-delay:${0.3 + i * 0.07}s`,
          'aria-label': `Letter ${l}`,
        }, UI.el('span', { class: 'letter', text: faceOf(l) }));
        btn.addEventListener('click', () => choose(btn, l));
        return btn;
      }));
      ask();
    }

    function markCurrent() {
      cars.forEach((c, i) => c.classList.toggle('current', i === gaps[pos]));
    }

    function ask() {
      const g = gaps[pos];
      const before = seq.slice(0, g).flatMap(l => [`${name(l)},`, 100]);
      const afterLetter = g + 1 < seq.length && !gaps.slice(pos).includes(g + 1) ? seq[g + 1] : null;
      return Sound.say(
        ...before, 250,
        afterLetter ? `something, ${name(afterLetter)}.` : null, 250,
        afterLetter ? 'Which letter goes in the gap?' : 'Which letter comes next?'
      );
    }

    function choose(btn, l) {
      if (locked || btn.disabled) return;
      const g = gaps[pos];
      if (l !== seq[g]) {
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        Sound.say(`That's ${name(l)}.`, 200, 'Try again!');
        return;
      }
      btn.disabled = true;
      btn.classList.add('used');
      Sound.sfx('correct');
      const car = cars[g];
      UI.flyTo(btn, car, () => {
        car.replaceChildren(UI.el('span', { class: 'letter', text: faceOf(l) }));
        car.classList.remove('gap');
        UI.replayClass(car, 'bounce');
      });
      pos++;
      markCurrent();
      if (pos < gaps.length) {
        Sound.say(`${name(l)}!`).then(done => { if (done && api.alive && !locked) ask(); });
      } else {
        locked = true;
        round++;
        api.progress(round, GOAL);
        api.later(finish, 450);
      }
    }

    function finish() {
      const glow = i => cars.forEach((c, j) => c.classList.toggle('glow', i === j));
      const parts = seq.flatMap((l, i) => [() => glow(i), name(l), 60]);
      parts.push(
        () => glow(-1),
        () => { Sound.sfx('correct'); train.classList.add('leave'); },
        'Choo choo!', 200, UI.pick(UI.PRAISE)
      );
      api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1800);
    }

    api.progress(0, GOAL);
    next();

    return { replay: () => { if (!locked) ask(); } };
  },
});
