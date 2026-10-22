// Finish the Word: a word is missing its sound pair. Which two letters belong there?
App.register({
  id: 'finish',
  name: 'Finish the Word',
  emoji: '🧩',
  color: '#3d5a80',
  levels: ['Two pairs to choose', 'Three pairs', 'All five pairs', 'More pairs: ck, ng, ai', 'Listen, no picture'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const CHOICES = [2, 3, 5, 4, 5][L - 1];
    const hidePic = L === 5;
    const groups = L === 4 ? DATA.morePairs : DATA.soundPairs;
    const pairs = groups.map(g => g.p);
    const list = groups.flatMap(g => g.words.map(w => ({ ...w, p: g.p })));

    let queue = [];
    let round = 0;
    let item = null;
    let at = 0; // which chunk is missing
    let locked = false;
    let slots = [];
    let buttons = [];

    const pic = UI.el('button', { class: 'picture-card', 'aria-label': 'Hear it again', onclick: () => replay() });
    const slotRow = UI.el('div', { class: 'slot-row word-slots' });
    const choices = UI.el('div', { class: 'choices pair-choices' });
    stage.append(pic, slotRow, choices);

    const stretch = () => item.c.flatMap(bit => [{ sound: bit }, 150]);

    function showPicture(reveal) {
      pic.replaceChildren(
        UI.el('span', { class: 'emoji picture', text: hidePic && !reveal ? '👂' : item.e }),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
    }

    function next() {
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      // blank this word's own pair: sheep is sh-ee-p, and in the "ee" group it is ee that goes
      at = item.c.findIndex(bit => bit === item.p);
      locked = false;

      showPicture(false);
      UI.replayClass(pic, 'pop-in');

      slotRow.className = `slot-row word-slots${item.c.length > 3 ? ' long' : ''}`;
      slots = item.c.map((bit, i) => UI.el('div', {
        class: `slot${bit.length > 1 ? ' pair-slot' : ''} ${i === at ? 'current' : 'filled'}`,
      }, i === at ? null : UI.el('span', { class: 'letter', text: UI.showLetter(bit) })));
      slotRow.replaceChildren(...slots);

      const others = UI.shuffle(pairs.filter(p => p !== item.p)).slice(0, CHOICES - 1);
      const opts = UI.shuffle([item.p, ...others]);
      const colors = UI.shuffle(UI.COLORS);
      buttons = opts.map((p, i) => {
        const btn = UI.el('button', {
          class: 'letter-btn pair-btn pop-in',
          style: `--bc:${colors[i % colors.length]};animation-delay:${0.2 + i * 0.07}s`,
          'aria-label': p,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(p) }));
        btn.addEventListener('click', () => choose(btn, p));
        return btn;
      });
      choices.replaceChildren(...buttons);
      ask();
    }

    function ask(slow) {
      const say = slow || L <= 2;
      return Sound.say(`${item.w}!`, 250, say ? 'Listen:' : null, say ? stretch() : null, say ? 150 : null,
        'Which two letters are missing?');
    }

    function replay() {
      if (!locked && item) ask(true);
    }

    function choose(btn, p) {
      if (locked || btn.disabled) return;
      if (p !== item.p) {
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.say('That says', 100, { sound: p }, 250, 'Listen again:', stretch(), 150, `${item.w}!`);
        return;
      }

      locked = true;
      Sound.sfx('correct');
      buttons.forEach(b => { b.disabled = true; if (b !== btn) b.classList.add('wrong'); });
      btn.classList.add('used');
      const slot = slots[at];
      UI.flyTo(btn, slot, () => {
        slot.replaceChildren(UI.el('span', { class: 'letter', text: UI.showLetter(p) }));
        slot.classList.remove('current');
        slot.classList.add('filled');
        UI.replayClass(slot, 'bounce');
      });
      if (hidePic) { showPicture(true); UI.replayClass(pic, 'bounce'); }

      round++;
      api.progress(round, GOAL);
      api.later(blend, 550);
    }

    function blend() {
      const glow = i => slots.forEach((s, j) => s.classList.toggle('glow', i === j));
      const parts = [];
      item.c.forEach((bit, i) => parts.push(() => glow(i), { sound: bit }, 150));
      parts.push(
        () => glow(-1), 150,
        () => slotRow.classList.add('together'), 300,
        `${item.w}!`,
        () => { Sound.sfx('correct'); UI.replayClass(pic, 'bounce'); },
        250, UI.pick(UI.PRAISE)
      );
      api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1700);
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
