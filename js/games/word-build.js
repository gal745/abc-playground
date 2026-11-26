// Build a word out of a bank of letters: Space Words, Fill the Zoo, Fill the Fridge.
//
// All three are the same game and so they are made in one place, from one maker. The bank at the
// bottom holds every sound of EVERY word in the set at once, jumbled together, so finding the m
// for moon means looking past the letters that belong to star and rocket. That is the difficulty:
// not "which letter comes next" but "which of these is the one I need". Build the last word and
// the bank is empty, which is how a child knows they have finished.
//
// The letters are the sounds the words are read in - oo, ar, ck, sh and ng are one tile each - and
// the word is never written down. The picture is there and the word is said; the spelling has to
// come out of their own head. A letter put down can be tapped to take it back, so there is no way
// to get stuck.
//
// Space shows the whole set from the start, like a plan of the trip. The zoo and the fridge start
// empty and fill up as each word is built, which is the point of them.
(() => {
  function make({ id, name, emoji, color, holder, reveal, levels, words, lead }) {
    App.register({
      id,
      name,
      emoji,
      color,
      levels: levels.map(l => l.name),

      create(stage, api) {
        const GOAL = 3;
        const plan = levels[api.level - 1];
        const all = words();

        let set = [];
        let at = 0;
        let slots = [];
        let round = 0;
        let locked = false;

        const pens = UI.el('div', { class: `wb-holder ${holder}` });
        const picture = UI.el('button', { class: 'wb-pic', 'aria-label': 'Say it again', onclick: () => sayWord() });
        const line = UI.el('div', { class: 'wb-word' });
        const bank = UI.el('div', { class: 'wb-bank' });
        stage.append(pens, picture, line, bank);

        const current = () => set[at];

        function next() {
          locked = true;             // opened again by drawWord, once the new word is up
          at = 0;
          const pool = all.filter(plan.pick);
          set = UI.shuffle(pool).slice(0, Math.min(plan.count, pool.length));

          const tiles = UI.shuffle(set.flatMap(w => w.c));
          bank.replaceChildren(...tiles.map((bit, i) => {
            const tile = UI.el('button', {
              class: `wb-tile pop-in${bit.length > 1 ? ' pair' : ''}`,
              style: `animation-delay:${0.04 + i * 0.03}s`, 'aria-label': bit,
            }, UI.el('span', { class: 'letter', text: UI.showLetter(bit) }));
            tile.addEventListener('click', () => takeFromBank(tile, bit));
            return tile;
          }));

          pens.replaceChildren(...set.map((w, i) => UI.el('span', {
            class: `wb-pen${i === 0 ? ' now' : ''}`, 'aria-label': reveal ? w.w : 'empty',
          }, reveal ? UI.el('span', { class: 'emoji', text: w.e }) : null)));

          drawWord();
          api.later(() => sayWord(true), 550);
        }

        function drawWord() {
          locked = false;
          const w = current();
          slots = w.c.map(() => null);
          picture.replaceChildren(UI.el('span', { class: 'emoji', text: w.e }));
          UI.replayClass(picture, 'pop-in');
          [...pens.children].forEach((pen, i) => {
            pen.classList.toggle('now', i === at);
            pen.classList.toggle('done', i < at);
          });
          paint();
        }

        function paint() {
          line.replaceChildren(...slots.map((bit, i) => {
            const slot = UI.el('button', {
              class: `wb-slot${bit ? ' filled' : ''}${!bit && slots.slice(0, i).every(Boolean) ? ' next' : ''}`,
              'aria-label': bit ? `${bit}, tap to take it back` : 'empty',
            }, bit ? UI.el('span', { class: 'letter', text: UI.showLetter(bit) }) : null);
            if (bit) slot.addEventListener('click', () => putBack(i));
            return slot;
          }));
        }

        function sayWord(first) {
          const w = current();
          if (!w) return null;
          return Sound.say(first ? lead : 'The word is', 200, `${w.w}.`, 300, `${w.w}`);
        }

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
          const tile = [...bank.querySelectorAll('.wb-tile.used')].find(t => t.getAttribute('aria-label') === bit);
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

          line.querySelectorAll('.wb-slot').forEach(s => s.classList.add('right'));
          locked = true;
          Sound.sfx('correct');
          // into the pen, onto the shelf, up into the sky
          const pen = pens.children[at];
          if (pen) {
            pen.replaceChildren(UI.el('span', { class: 'emoji pop-in', text: w.e }));
            pen.classList.add('done');
            pen.setAttribute('aria-label', w.w);
          }
          const spoken = Sound.say(...w.c.flatMap(bit => [{ sound: bit }, 120]), 200, `${w.w}!`,
            250, at + 1 < set.length ? UI.pick(['Next one.', 'Now this one.', 'Keep going.']) : UI.pick(UI.PRAISE));
          at++;
          if (at < set.length) {
            api.after(spoken, () => drawWord(), 900);
            return;
          }

          round++;
          api.progress(round, GOAL);
          UI.confetti();
          api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1400);
        }

        api.progress(0, GOAL);
        next();

        return { replay: () => sayWord() };
      },
    });
  }

  const upTo = n => w => w.w.length <= n;
  const between = (a, b) => w => w.w.length >= a && w.w.length <= b;

  make({
    id: 'space',
    name: 'Space Words',
    emoji: '🚀',
    color: '#5a4fcf',
    holder: 'sky',
    reveal: true,
    lead: 'Build this word:',
    words: () => DATA.space,
    levels: [
      { name: 'Two words', pick: w => w.c.length <= 4, count: 2 },
      { name: 'Three words', pick: w => w.c.length <= 4, count: 3 },
      { name: 'Four words', pick: w => w.c.length <= 4, count: 4 },
      { name: 'Longer words', pick: w => w.c.length >= 5, count: 2 },
      { name: 'Build a planet', pick: w => w.c.length >= 5, count: 3 },
    ],
  });

  make({
    id: 'zoo',
    name: 'Fill the Zoo',
    emoji: '🦁',
    color: '#2a9d8f',
    holder: 'zoo',
    reveal: false,
    lead: 'Who is this? Write the name:',
    words: () => DATA.zoo,
    levels: [
      { name: 'Two animals', pick: upTo(3), count: 2 },
      { name: 'Three animals', pick: upTo(3), count: 3 },
      { name: 'Four-letter animals', pick: between(3, 4), count: 3 },
      { name: 'Bigger animals', pick: between(4, 5), count: 3 },
      { name: 'A full zoo', pick: between(4, 5), count: 4 },
    ],
  });

  make({
    id: 'fridge',
    name: 'Fill the Fridge',
    emoji: '🧊',
    color: '#4895ef',
    holder: 'fridge',
    reveal: false,
    lead: 'What is this? Write the name:',
    words: () => DATA.fridge,
    levels: [
      { name: 'Two things to eat', pick: upTo(4), count: 2 },
      { name: 'Three things', pick: upTo(4), count: 3 },
      { name: 'Five-letter food', pick: between(5, 5), count: 3 },
      { name: 'Longer food', pick: w => w.w.length >= 7, count: 2 },
      { name: 'A full fridge', pick: w => w.w.length >= 7, count: 3 },
    ],
  });
})();
