// Build a Word: tap the letters in sound order, then blend them into a word.
App.register({
  id: 'build',
  name: 'Build a Word',
  emoji: '🧱',
  color: '#2a9d8f',

  create(stage, api) {
    const GOAL = 5;
    const active = UI.activeLetters();
    let list = DATA.cvc.filter(x => [...x.w].every(l => active.includes(l)));
    if (list.length < 3) list = DATA.cvc.filter(x => active.includes(x.w[0]));
    if (list.length < 3) list = DATA.cvc.slice();

    let queue = [];
    let round = 0;
    let item = null;
    let pos = 0;
    let locked = false;
    let slots = [];

    const pic = UI.el('button', { class: 'picture-card', 'aria-label': 'Hear it again', onclick: () => replay() });
    const slotRow = UI.el('div', { class: 'slot-row' });
    const tileRow = UI.el('div', { class: 'tile-row' });
    stage.append(pic, slotRow, tileRow);

    function next() {
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      pos = 0;
      locked = false;

      pic.replaceChildren(
        UI.el('span', { class: 'emoji picture', text: item.e }),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
      UI.replayClass(pic, 'pop-in');

      slotRow.classList.remove('together');
      slots = [...item.w].map(() => UI.el('div', { class: 'slot' }));
      slotRow.replaceChildren(...slots);

      // shuffle the letters, but never leave them already in the right order
      const letters = [...item.w];
      let order = UI.shuffle(letters);
      for (let tries = 0; tries < 10 && order.join('') === item.w; tries++) order = UI.shuffle(letters);
      const colors = UI.shuffle(UI.COLORS);
      tileRow.replaceChildren(...order.map((l, i) => {
        const tile = UI.el('button', { class: 'tile pop-in', style: `--bc:${colors[i]};animation-delay:${0.15 + i * 0.08}s`, 'aria-label': `Letter ${l}` },
          UI.el('span', { class: 'letter', text: l }));
        tile.addEventListener('click', () => tapTile(tile, l));
        return tile;
      }));

      markSlot();
      Sound.say(`${item.w}!`, 250, `Let's build ${item.w}!`, 300, 'Can you find the letter that says', { sound: item.w[0] });
    }

    function markSlot() {
      slots.forEach((s, i) => s.classList.toggle('current', i === pos));
    }

    function replay() {
      if (locked || !item) return;
      Sound.say(`${item.w}.`, 250, pos === 0 ? 'Find the letter that says' : 'Now find', { sound: item.w[pos] });
    }

    function tapTile(tile, l) {
      if (locked || tile.classList.contains('used')) return;
      const need = item.w[pos];
      if (l !== need) {
        Sound.sfx('wrong');
        UI.replayClass(tile, 'shake');
        Sound.say('Oops! That says', { sound: l }, 250, 'Can you find', { sound: need });
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
        Sound.say({ sound: l }, 300, 'Now find', { sound: item.w[pos] });
      } else {
        locked = true;
        api.later(blend, 500);
      }
    }

    function blend() {
      round++;
      api.progress(round, GOAL);
      const glow = i => slots.forEach((s, j) => s.classList.toggle('glow', i === j));
      const parts = [];
      [...item.w].forEach((l, i) => parts.push(() => glow(i), { sound: l }, 250));
      parts.push(
        () => glow(-1), 150,
        () => slotRow.classList.add('together'), 350,
        `${item.w}!`,
        () => { Sound.sfx('correct'); UI.replayClass(pic, 'bounce'); },
        250, UI.pick(UI.PRAISE)
      );
      api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1800);
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
