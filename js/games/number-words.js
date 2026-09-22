// Number Words: count the pictures, then spell the number word from a bank of jumbled letters.
App.register({
  id: 'numbers',
  name: 'Number Words',
  emoji: '🔢',
  color: '#f77f00',
  levels: ['1 to 5, with letter hints', '1 to 10', '1 to 10, extra letters'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const ghosts = L === 1;            // faint letters show where each one goes
    const DECOYS = L === 3 ? 2 : 0;    // extra letters that don't belong
    const WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const THINGS = ['🍎', '🐞', '⭐', '🎈', '🐟', '🍓', '🚗', '🐤', '🌸', '🧁'];
    const list = WORDS.slice(0, L === 1 ? 5 : 10).map((w, i) => ({ w, n: i + 1 }));

    let queue = [];
    let round = 0;
    let item = null;
    let pos = 0;
    let locked = false;
    let slots = [];
    let tiles = [];

    const card = UI.el('button', { class: 'number-card', 'aria-label': 'Hear it again', onclick: () => replay() });
    const slotRow = UI.el('div', { class: 'slot-row' });
    const tileRow = UI.el('div', { class: 'tile-row' });
    stage.append(card, slotRow, tileRow);

    const name = l => Sound.letterName(l);

    function next() {
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      pos = 0;
      locked = false;

      const thing = UI.pick(THINGS);
      card.replaceChildren(
        UI.el('span', { class: 'number-digit', text: String(item.n) }),
        UI.el('span', { class: 'things emoji', style: `grid-template-columns:repeat(${Math.min(item.n, 5)}, 1fr)` },
          ...Array.from({ length: item.n }, () => UI.el('span', { text: thing }))),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
      UI.replayClass(card, 'pop-in');

      const long = item.w.length + DECOYS > 5 || item.w.length > 4;
      slotRow.className = `slot-row${long ? ' long' : ''}`;
      tileRow.className = `tile-row${long ? ' long' : ''}`;
      slots = [...item.w].map(l => UI.el('div', { class: 'slot' }, ghosts ? UI.el('span', { class: 'letter ghost', text: l }) : null));
      slotRow.replaceChildren(...slots);

      const extra = UI.shuffle(DATA.letters.filter(l => !item.w.includes(l))).slice(0, DECOYS);
      const letters = [...item.w, ...extra];
      let order = UI.shuffle(letters);
      for (let tries = 0; tries < 10 && order.join('').startsWith(item.w); tries++) order = UI.shuffle(letters);
      const colors = UI.shuffle(UI.COLORS);
      tiles = order.map((l, i) => {
        const tile = UI.el('button', { class: 'tile pop-in', style: `--bc:${colors[i % colors.length]};animation-delay:${0.15 + i * 0.07}s`, 'aria-label': `Letter ${l}` },
          UI.el('span', { class: 'letter', text: l }));
        tile.addEventListener('click', () => tapTile(tile, l));
        return tile;
      });
      tileRow.replaceChildren(...tiles);

      markSlot();
      Sound.say(`${item.w}!`, 250, `Let's spell ${item.w}.`, 250, `Find the letter ${name(item.w[0])}.`);
    }

    function markSlot() {
      slots.forEach((s, i) => s.classList.toggle('current', i === pos));
    }

    function replay() {
      if (locked || !item) return;
      Sound.say(`${item.w}.`, 250, `Find the letter ${name(item.w[pos])}.`);
    }

    function tapTile(tile, l) {
      if (locked || tile.classList.contains('used') || tile.disabled) return;
      const need = item.w[pos];
      if (l !== need) {
        Sound.sfx('wrong');
        UI.replayClass(tile, 'shake');
        Sound.say(`Oops! That's ${name(l)}.`, 200, `Can you find ${name(need)}?`);
        return;
      }

      const slot = slots[pos];
      tile.classList.add('used');
      Sound.sfx('correct');
      UI.flyTo(tile, slot, () => {
        slot.replaceChildren(UI.el('span', { class: 'letter', text: l }));
        slot.classList.add('filled');
        UI.replayClass(slot, 'bounce');
      });
      pos++;
      markSlot();

      if (pos < item.w.length) {
        Sound.say(name(l), 250, `Now find ${name(item.w[pos])}.`);
      } else {
        locked = true;
        tiles.forEach(t => { if (!t.classList.contains('used')) { t.disabled = true; t.classList.add('wrong'); } });
        api.later(spellOut, 500);
      }
    }

    function spellOut() {
      round++;
      api.progress(round, GOAL);
      const glow = i => slots.forEach((s, j) => s.classList.toggle('glow', i === j));
      const parts = [];
      [...item.w].forEach((l, i) => parts.push(() => glow(i), name(l), 150));
      parts.push(
        () => glow(-1), 250,
        () => slotRow.classList.add('together'), 300,
        `${item.w}!`,
        () => { Sound.sfx('correct'); UI.replayClass(card, 'bounce'); },
        250, UI.pick(UI.PRAISE)
      );
      api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1800);
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
