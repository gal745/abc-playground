// Middle Sound: hear a word and tap the vowel hiding in the middle of it.
App.register({
  id: 'middle',
  name: 'Middle Sound',
  emoji: '🎯',
  color: '#b5179e',
  levels: ['Two letters to choose', 'Three letters', 'All five vowels', 'Longer words', 'Listen, no picture'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const CHOICES = [2, 3, 5, 5, 5][L - 1];
    const longWords = L === 4;
    const hidePic = L === 5;
    const VOWELS = ['a', 'e', 'i', 'o', 'u'];
    const source = longWords ? DATA.cvcc : DATA.cvc;
    const list = source.filter(x => [...x.w].filter(l => VOWELS.includes(l)).length === 1);

    let queue = [];
    let round = 0;
    let item = null;
    let at = 0; // where the vowel sits in the word
    let locked = false;
    let slots = [];
    let buttons = [];

    const pic = UI.el('button', { class: 'picture-card', 'aria-label': 'Hear it again', onclick: () => replay() });
    const slotRow = UI.el('div', { class: 'slot-row' });
    const choices = UI.el('div', { class: 'choices' });
    stage.append(pic, slotRow, choices);

    // the word said slowly, one sound at a time
    const stretch = () => [...item.w].flatMap(l => [{ sound: l }, 150]);

    function showPicture(reveal) {
      pic.replaceChildren(
        UI.el('span', { class: 'emoji picture', text: hidePic && !reveal ? '👂' : item.e }),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
    }

    function next() {
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      at = [...item.w].findIndex(l => VOWELS.includes(l));
      locked = false;

      showPicture(false);
      UI.replayClass(pic, 'pop-in');

      slotRow.className = `slot-row${item.w.length > 3 ? ' long' : ''}`;
      slots = [...item.w].map((l, i) => UI.el('div', { class: `slot ${i === at ? 'current' : 'filled'}` },
        i === at ? null : UI.el('span', { class: 'letter', text: UI.showLetter(l) })));
      slotRow.replaceChildren(...slots);

      const others = UI.shuffle(VOWELS.filter(v => v !== item.w[at])).slice(0, CHOICES - 1);
      const opts = UI.shuffle([item.w[at], ...others]);
      const colors = UI.shuffle(UI.COLORS);
      choices.className = `choices${opts.length >= 5 ? ' count-5' : opts.length >= 4 ? ' count-4' : ''}`;
      buttons = opts.map((v, i) => {
        const btn = UI.el('button', {
          class: 'letter-btn pop-in',
          style: `--bc:${colors[i % colors.length]};animation-delay:${0.2 + i * 0.07}s`,
          'aria-label': `Letter ${v}`,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(v) }));
        btn.addEventListener('click', () => choose(btn, v));
        return btn;
      });
      choices.replaceChildren(...buttons);
      ask();
    }

    // the early levels say the word slowly straight away; later on that is only help after a miss
    function ask(slow) {
      const say = slow || L <= 3;
      return Sound.say(`${item.w}!`, 250, say ? 'Listen:' : null, say ? stretch() : null, say ? 150 : null,
        'Which letter is in the middle?');
    }

    function replay() {
      if (!locked && item) ask(true);
    }

    function choose(btn, v) {
      if (locked || btn.disabled) return;
      if (v !== item.w[at]) {
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        Sound.say('That says', 100, { sound: v }, 250, 'Listen again:', stretch(), 150, `${item.w}!`);
        return;
      }

      locked = true;
      Sound.sfx('correct');
      btn.disabled = true;
      btn.classList.add('used');
      buttons.forEach(b => { b.disabled = true; if (b !== btn) b.classList.add('wrong'); });
      const slot = slots[at];
      UI.flyTo(btn, slot, () => {
        slot.replaceChildren(UI.el('span', { class: 'letter', text: UI.showLetter(v) }));
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
      [...item.w].forEach((l, i) => parts.push(() => glow(i), { sound: l }, 150));
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
