// Days in Order: tap the days one after another to lay out the week.
App.register({
  id: 'order',
  name: 'Days in Order',
  emoji: '🗓️',
  color: '#00b4d8',
  levels: ['Three days', 'Five days', 'All seven days', 'Start on any day', 'Short names: Mon, Tue'],

  create(stage, api) {
    const L = api.level;
    const LEN = [3, 5, 7, 7, 7][L - 1];
    const GOAL = [5, 4, 3, 3, 3][L - 1]; // a whole week takes a while, so fewer rounds
    const anyStart = L >= 4;             // the week can begin on any day and wrap round
    const shortNames = L === 5;          // the cards say Mon, Tue, Wed …
    const days = DATA.days;
    const short = d => d.w.slice(0, 3);  // Monday -> Mon

    let round = 0;
    let order = [];  // the days in the order they must be tapped
    let pos = 0;
    let locked = false;
    let slots = [];
    let cards = [];

    const line = UI.el('div', { class: 'week-line' });
    const pool = UI.el('div', { class: 'day-pool' });
    stage.append(line, pool);

    function next() {
      locked = false;
      const start = anyStart ? UI.rand(7) : LEN === 7 ? 0 : UI.rand(7 - LEN + 1);
      order = Array.from({ length: LEN }, (_, i) => days[(start + i) % 7]);
      pos = anyStart ? 1 : 0; // from level 4 the first day is given, to show where the week starts

      line.className = `week-line${LEN > 5 ? ' long' : ''}`;
      slots = order.map((d, i) => UI.el('div', { class: `week-slot${i < pos ? ' filled' : ''}` },
        UI.el('span', { class: 'slot-no', text: String(i + 1) }),
        UI.el('span', { class: 'slot-day letter', text: i < pos ? short(d) : '' })));
      line.replaceChildren(...slots);

      const left = order.slice(pos);
      let shuffled = UI.shuffle(left);
      // never hand them the days already in order
      for (let tries = 0; tries < 10 && shuffled.every((d, i) => d === left[i]); tries++) shuffled = UI.shuffle(left);
      const colors = UI.shuffle(UI.COLORS);
      cards = shuffled.map((d, i) => {
        const card = UI.el('button', {
          class: 'pool-card pop-in',
          style: `--bc:${colors[i % colors.length]};animation-delay:${0.15 + i * 0.06}s`,
          'aria-label': d.w,
        }, UI.el('span', { class: 'letter', text: shortNames ? short(d) : d.w }));
        card.addEventListener('click', () => tap(card, d));
        return card;
      });
      pool.replaceChildren(...cards);

      markSlot();
      ask(true);
    }

    function markSlot() {
      slots.forEach((s, i) => s.classList.toggle('current', i === pos));
    }

    function ask(first) {
      if (anyStart && first) return Sound.say(`The week starts on ${order[0].w}.`, 250, 'What day comes next?');
      if (pos === 0) return Sound.say('Put the days in order!', 250, 'Which day comes first?');
      return Sound.say(`What comes after ${order[pos - 1].w}?`);
    }

    function tap(card, d) {
      if (locked || card.disabled) return;
      if (d !== order[pos]) {
        Sound.sfx('wrong');
        UI.replayClass(card, 'shake');
        Sound.say(`That's ${d.w}.`, 200,
          pos === 0 ? 'Which day comes first?' : `What comes after ${order[pos - 1].w}?`);
        return;
      }

      card.disabled = true;
      card.classList.add('used');
      Sound.sfx('correct');
      const slot = slots[pos];
      UI.flyTo(card, slot, () => {
        slot.querySelector('.slot-day').textContent = short(d);
        slot.classList.add('filled');
        UI.replayClass(slot, 'bounce');
      });
      pos++;
      markSlot();

      if (pos < order.length) {
        Sound.say(`${d.w}!`).then(done => { if (done && api.alive && !locked) ask(false); });
      } else {
        locked = true;
        round++;
        api.progress(round, GOAL);
        api.later(finish, 450);
      }
    }

    function finish() {
      const glow = i => slots.forEach((s, j) => s.classList.toggle('glow', i === j));
      const parts = order.flatMap((d, i) => [() => glow(i), d.w, 120]);
      parts.push(
        () => glow(-1),
        () => { Sound.sfx('correct'); UI.replayClass(line, 'bounce'); },
        250, order.length === 7 ? "That's the whole week!" : 'All in order!',
        200, UI.pick(UI.PRAISE)
      );
      api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1800);
    }

    api.progress(0, GOAL);
    next();

    return { replay: () => { if (!locked) ask(false); } };
  },
});
