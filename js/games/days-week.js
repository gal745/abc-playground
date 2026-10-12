// Days of the Week: the "day" ending is already written, so children spell only the beginning.
App.register({
  id: 'days',
  name: 'Days of the Week',
  emoji: '📅',
  color: '#5e60ce',
  levels: ['Short days, with hints', 'All seven days, with hints', 'All seven days', 'Extra tricky letters', 'What day comes next?'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const ghosts = L <= 2;                  // faint letters show where each one goes
    const DECOYS = [0, 0, 0, 2, 1][L - 1];  // extra letters that don't belong
    const guessNext = L === 5;              // the day is not named: work it out from the day before
    const days = DATA.days;
    const list = L === 1 ? days.filter(d => d.pre.length <= 3) : days.slice();

    let queue = [];
    let round = 0;
    let item = null;
    let pos = 0;
    let locked = false;
    let revealed = true; // has the day been named yet?
    let misses = 0;
    let slots = [];
    let cells = [];      // the letter slots plus the "day" ending
    let tiles = [];
    let pips = [];

    const card = UI.el('button', { class: 'week-card', 'aria-label': 'Hear it again', onclick: () => replay() });
    const slotRow = UI.el('div', { class: 'slot-row day-word' });
    const tileRow = UI.el('div', { class: 'tile-row' });
    stage.append(card, slotRow, tileRow);

    const name = l => Sound.letterName(l);
    const upper = () => Settings.get('letterCase') === 'upper';
    // Day names start with a capital letter, whatever the letter setting says.
    const face = (l, i) => (i === 0 ? l.toUpperCase() : UI.showLetter(l));
    const tileFace = l => face(l, l === item.pre[0] ? 0 : 1);
    const dayBefore = d => days[(days.indexOf(d) + days.length - 1) % days.length];

    function drawWeek() {
      const target = days.indexOf(item);
      const prev = days.indexOf(dayBefore(item));
      pips = days.map((d, i) => {
        const yesterday = guessNext && i === prev;
        const text = ghosts ? d.w[0].toUpperCase() : yesterday ? '✓' : i === target ? '?' : '•';
        return UI.el('span', {
          class: `day-pip${i >= 5 ? ' weekend' : ''}${yesterday ? ' today' : ''}${i === target ? ' on' : ''}`,
          'aria-label': d.w,
          text,
        });
      });
      card.replaceChildren(
        UI.el('span', { class: 'week-pips' }, ...pips),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
    }

    function next() {
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      pos = 0;
      misses = 0;
      locked = false;
      revealed = !guessNext;

      drawWeek();
      UI.replayClass(card, 'pop-in');

      // Wednesday needs nine letter boxes, so the row shrinks as the day gets longer.
      const units = item.pre.length + 2; // the "day" ending is about two boxes wide
      slotRow.className = `slot-row day-word${units >= 8 ? ' tight' : units >= 6 ? ' mid' : ''}`;
      tileRow.className = `tile-row${item.pre.length + DECOYS > 5 ? ' long' : ''}`;

      slots = [...item.pre].map((l, i) => UI.el('div', { class: 'slot' },
        ghosts ? UI.el('span', { class: 'letter ghost', text: face(l, i) }) : null));
      const ending = UI.el('div', { class: 'slot filled day-end' },
        UI.el('span', { class: 'letter', text: upper() ? 'DAY' : 'day' }));
      cells = [...slots, ending];
      slotRow.replaceChildren(...cells);

      const extra = UI.shuffle(DATA.letters.filter(l => !item.pre.includes(l))).slice(0, DECOYS);
      const letters = [...item.pre, ...extra];
      let order = UI.shuffle(letters);
      for (let tries = 0; tries < 10 && order.join('').startsWith(item.pre); tries++) order = UI.shuffle(letters);
      const colors = UI.shuffle(UI.COLORS);
      tiles = order.map((l, i) => {
        const tile = UI.el('button', { class: 'tile pop-in', style: `--bc:${colors[i % colors.length]};animation-delay:${0.15 + i * 0.07}s`, 'aria-label': `Letter ${l}` },
          UI.el('span', { class: 'letter', text: tileFace(l) }));
        tile.addEventListener('click', () => tapTile(tile, l));
        return tile;
      });
      tileRow.replaceChildren(...tiles);

      markSlot();
      const intro = round === 0 ? 'The end says day. You find the letters that come first!' : null;
      if (revealed) {
        Sound.say(`${item.w}!`, 250, intro, intro ? 300 : null,
          `Let's spell ${item.w}.`, 250, `Find the letter ${name(item.pre[0])}.`);
      } else {
        Sound.say(`Which day comes after ${dayBefore(item).w}?`, 300, 'Spell it!');
      }
    }

    function reveal() {
      revealed = true;
      const pip = pips[days.indexOf(item)];
      pip.textContent = item.w[0].toUpperCase();
      UI.replayClass(pip, 'bounce');
    }

    function markSlot() {
      slots.forEach((s, i) => s.classList.toggle('current', i === pos));
    }

    function replay() {
      if (locked || !item) return;
      if (!revealed) Sound.say(`Which day comes after ${dayBefore(item).w}?`, 300, 'Spell it!');
      else Sound.say(`${item.w}.`, 250, `Find the letter ${name(item.pre[pos])}.`);
    }

    function tapTile(tile, l) {
      if (locked || tile.classList.contains('used') || tile.disabled) return;
      const need = item.pre[pos];
      if (l !== need) {
        Sound.sfx('wrong');
        UI.replayClass(tile, 'shake');
        misses++;
        if (!revealed && misses >= 2) {
          reveal();
          Sound.say('Let me help!', 200, `After ${dayBefore(item).w} comes ${item.w}.`, 250, `Find the letter ${name(need)}.`);
        } else if (!revealed) {
          Sound.say(`Oops! That's ${name(l)}.`, 200, 'Think which day comes next, and try again!');
        } else {
          Sound.say(`Oops! That's ${name(l)}.`, 200, `Can you find ${name(need)}?`);
        }
        return;
      }

      const at = pos;
      const slot = slots[at];
      tile.classList.add('used');
      Sound.sfx('correct');
      UI.flyTo(tile, slot, () => {
        slot.replaceChildren(UI.el('span', { class: 'letter', text: face(l, at) }));
        slot.classList.add('filled');
        UI.replayClass(slot, 'bounce');
      });
      pos++;
      markSlot();

      if (pos < item.pre.length) {
        Sound.say(name(l), 250, revealed ? `Now find ${name(item.pre[pos])}.` : 'What comes next?');
      } else {
        locked = true;
        if (!revealed) reveal();
        tiles.forEach(t => { if (!t.classList.contains('used')) { t.disabled = true; t.classList.add('wrong'); } });
        api.later(spellOut, 500);
      }
    }

    function spellOut() {
      round++;
      api.progress(round, GOAL);
      const pip = pips[days.indexOf(item)];
      pip.textContent = item.w[0].toUpperCase();
      pip.classList.add('won');

      const glow = i => cells.forEach((c, j) => c.classList.toggle('glow', i === j));
      const parts = [];
      [...item.pre].forEach((l, i) => parts.push(() => glow(i), name(l), 150));
      parts.push(
        () => glow(slots.length), 'day', 200,
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
