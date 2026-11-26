// Space Words: build the word out of a bank of letters at the bottom of the screen.
//
// The bank holds exactly the letters for ALL the words in the round, pooled together and shuffled,
// so a child looking for the m in moon is looking past the letters that belong to star and rocket.
// That is the whole difficulty: not "which letter comes next" but "which of these is the one I
// need". Build every word and the bank empties, which is how you know you are finished.
//
// The letters are the sounds the words are read in, so oo, ar and ck are one tile each - the same
// pieces they tap in Join the Sounds and in the lesson. The word is never written down: the
// picture is there and the word is said, and the sounds have to come out of their own head.
App.register({
  id: 'space',
  name: 'Space Words',
  emoji: '🚀',
  color: '#5a4fcf',
  levels: ['Two words', 'Three words', 'Four words', 'Longer words', 'Build a planet'],

  create(stage, api) {
    const GOAL = 3;
    const L = api.level;

    const short = DATA.space.filter(w => w.c.length <= 4);
    const long = DATA.space.filter(w => w.c.length >= 5);
    const PLAN = [
      { from: () => short, count: 2 },
      { from: () => short, count: 3 },
      { from: () => short, count: 4 },
      { from: () => long, count: 2 },
      { from: () => long, count: 3 },
    ][L - 1];

    let words = [];       // the set being built
    let at = 0;           // which word we are on
    let slots = [];       // the tiles put down so far, by slot
    let round = 0;
    let locked = false;

    const targets = UI.el('div', { class: 'sp-targets' });
    const picture = UI.el('button', { class: 'sp-pic', 'aria-label': 'Say it again', onclick: () => sayWord() });
    const line = UI.el('div', { class: 'sp-word' });
    const bank = UI.el('div', { class: 'sp-bank' });
    stage.append(targets, picture, line, bank);

    const current = () => words[at];

    function next() {
      locked = true;      // opened again by drawWord, once the new word is on the screen
      at = 0;
      words = UI.shuffle(PLAN.from()).slice(0, PLAN.count);

      // the bank is every sound of every word in the set, together and shuffled
      const tiles = UI.shuffle(words.flatMap(w => w.c));
      bank.replaceChildren(...tiles.map((bit, i) => {
        const tile = UI.el('button', {
          class: `sp-tile pop-in${bit.length > 1 ? ' pair' : ''}`,
          style: `animation-delay:${0.04 + i * 0.03}s`, 'aria-label': bit,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(bit) }));
        tile.addEventListener('click', () => takeFromBank(tile, bit));
        return tile;
      }));

      targets.replaceChildren(...words.map((w, i) => UI.el('span', {
        class: `sp-target${i === 0 ? ' now' : ''}`, 'aria-label': w.w,
      }, UI.el('span', { class: 'emoji', text: w.e }))));

      drawWord();
      api.later(() => sayWord(true), 550);
    }

    // ---------- the word being built ----------
    function drawWord() {
      locked = false;
      const w = current();
      slots = w.c.map(() => null);
      picture.replaceChildren(UI.el('span', { class: 'emoji', text: w.e }));
      UI.replayClass(picture, 'pop-in');
      targets.querySelectorAll('.sp-target').forEach((t, i) => {
        t.classList.toggle('now', i === at);
        t.classList.toggle('done', i < at);
      });
      paint();
    }

    function paint() {
      line.replaceChildren(...slots.map((bit, i) => {
        const slot = UI.el('button', {
          class: `sp-slot${bit ? ' filled' : ''}${!bit && slots.slice(0, i).every(Boolean) ? ' next' : ''}`,
          'aria-label': bit ? `${bit}, tap to take it back` : 'empty',
        }, bit ? UI.el('span', { class: 'letter', text: UI.showLetter(bit) }) : null);
        if (bit) slot.addEventListener('click', () => putBack(i));
        return slot;
      }));
    }

    function sayWord(first) {
      const w = current();
      if (!w) return null;
      return Sound.say(first ? 'Build this word:' : 'The word is', 200, `${w.w}.`, 300, `${w.w}`);
    }

    // ---------- moving tiles ----------
    function takeFromBank(tile, bit) {
      if (locked || tile.disabled) return;
      const i = slots.findIndex(x => x === null);
      if (i < 0) return;
      tile.disabled = true;
      tile.classList.add('used');
      slots[i] = bit;
      Sound.sfx('tap');
      Sound.say({ sound: bit });
      paint();
      if (slots.every(Boolean)) api.later(check, 450);
    }

    function putBack(i) {
      if (locked || !slots[i]) return;
      const bit = slots[i];
      slots[i] = null;
      Sound.sfx('tap');
      const tile = [...bank.querySelectorAll('.sp-tile.used')].find(t => t.getAttribute('aria-label') === bit);
      if (tile) { tile.disabled = false; tile.classList.remove('used'); UI.replayClass(tile, 'pop-in'); }
      paint();
    }

    function check() {
      const w = current();
      if (!w || !slots.every(Boolean)) return;
      if (slots.join('') !== w.c.join('')) {
        Sound.sfx('wrong');
        UI.replayClass(line, 'shake');
        Sound.say('Not quite.', 250, 'Listen:', 200, ...w.c.flatMap(bit => [{ sound: bit }, 120]), 200, `${w.w}.`,
          250, 'Tap a letter to take it back.');
        return;
      }

      // right: read it out, keep it, move on
      line.querySelectorAll('.sp-slot').forEach(s => s.classList.add('right'));
      locked = true;      // hands off while it is read back
      Sound.sfx('correct');
      const spoken = Sound.say(...w.c.flatMap(bit => [{ sound: bit }, 120]), 200, `${w.w}!`,
        250, at + 1 < words.length ? UI.pick(['Next one.', 'Now this one.', 'Keep going.']) : UI.pick(UI.PRAISE));
      at++;
      if (at < words.length) {
        api.after(spoken, () => drawWord(), 900);
        return;
      }

      locked = true;
      round++;
      api.progress(round, GOAL);
      targets.querySelectorAll('.sp-target').forEach(t => t.classList.add('done'));
      UI.confetti();
      api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1400);
    }

    api.progress(0, GOAL);
    next();

    return { replay: () => sayWord() };
  },
});
