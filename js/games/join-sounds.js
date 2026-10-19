// Join the Sounds: say each letter, then push them together and the word comes out.
App.register({
  id: 'join',
  name: 'Join the Sounds',
  emoji: '🧲',
  color: '#7209b7',
  levels: ['Two letters: a + t', 'Three letters: c + a + t', 'Three letters, find the picture', 'Find it from three', 'Four letters: f + r + o + g'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const PICS = [0, 0, 2, 3, 3][L - 1]; // how many pictures to choose between
    const VOWELS = ['a', 'e', 'i', 'o', 'u'];
    const list = L === 1 ? DATA.joins.map(w => ({ w, e: '' }))
      : L === 5 ? DATA.cvcc : DATA.cvc;

    let queue = [];
    let round = 0;
    let item = null;
    let pos = 0;      // the next letter to tap
    let locked = false;
    let cards = [];
    let picks = [];

    const pic = UI.el('div', { class: 'picture-card join-pic' });
    const row = UI.el('div', { class: 'join-row' });
    const joinBtn = UI.el('button', { class: 'join-btn', hidden: 'hidden' },
      UI.el('span', { class: 'emoji', text: '🧲' }), ' Push them together!');
    const choices = UI.el('div', { class: 'choices' });
    stage.append(pic, row, joinBtn, choices);
    joinBtn.addEventListener('click', join);

    const vowelOf = w => [...w].find(l => VOWELS.includes(l));

    function showPicture(reveal) {
      pic.hidden = L === 1; // the little words have no picture
      pic.replaceChildren(UI.el('span', { class: 'emoji picture', text: reveal ? item.e : '❓' }));
    }

    function next() {
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      pos = 0;
      locked = false;

      showPicture(false);
      row.className = 'join-row';
      joinBtn.hidden = true;
      choices.replaceChildren();

      const colors = UI.shuffle(UI.COLORS);
      cards = [...item.w].map((l, i) => {
        const card = UI.el('button', {
          class: 'letter-card pop-in',
          style: `--bc:${colors[i % colors.length]};animation-delay:${0.1 + i * 0.1}s`,
          'aria-label': `Letter ${l}`,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(l) }));
        card.addEventListener('click', () => tapLetter(i, card, l));
        return card;
      });
      row.replaceChildren(...cards);
      markCard();
      ask();
    }

    function markCard() {
      cards.forEach((c, i) => c.classList.toggle('current', i === pos && !locked));
    }

    function ask() {
      if (round === 0 && pos === 0) {
        return Sound.say('Tap each letter to hear its sound.', 300, 'Then push them together!');
      }
      if (pos === 0) return Sound.say('Tap the first letter.');
      return Sound.say('And the next one.');
    }

    function replay() {
      if (locked || !item) return;
      if (pos >= item.w.length) Sound.say('Now push them together!');
      else Sound.say({ sound: item.w[pos] }, 250, 'Tap the letter that says', { sound: item.w[pos] });
    }

    function tapLetter(i, card, l) {
      if (locked) return;
      if (i !== pos) {
        Sound.sfx('wrong');
        UI.replayClass(card, 'shake');
        UI.replayClass(cards[pos], 'bounce');
        Sound.say(pos === 0 ? 'Start with this one!' : 'This one comes next!');
        return;
      }
      Sound.sfx('tap');
      card.classList.add('done');
      pos++;
      markCard();
      if (pos < item.w.length) {
        Sound.say({ sound: l });
      } else {
        joinBtn.hidden = false;
        UI.replayClass(joinBtn, 'pop-in');
        Sound.say({ sound: l }, 300, 'Now push them together!');
      }
    }

    function join() {
      if (locked || pos < item.w.length) return;
      locked = true;
      markCard();
      joinBtn.hidden = true;
      Sound.sfx('pop');
      row.classList.add('together');

      // The sounds run into each other, then the whole word. This has to stay one spoken
      // sequence: starting another one would cut the blend off part way through.
      const parts = [];
      [...item.w].forEach((l, i) => parts.push(() => glow(i), { sound: l }, 90));
      parts.push(() => glow(-1), 200, `${item.w}!`, () => { Sound.sfx('correct'); UI.replayClass(row, 'bounce'); });

      if (PICS) {
        api.after(Sound.say(...parts), askPicture, 900);
      } else {
        parts.push(() => showPicture(true), 250, UI.pick(UI.PRAISE));
        round++;
        api.progress(round, GOAL);
        api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1500);
      }
    }

    function glow(i) {
      cards.forEach((c, j) => c.classList.toggle('glow', i === j));
    }

    function askPicture() {
      // wrong pictures that look or sound close, so the word has to be read
      const others = list.filter(w => w.w !== item.w);
      const near = UI.shuffle(others.filter(w => vowelOf(w.w) === vowelOf(item.w) || w.w[0] === item.w[0]));
      const rest = UI.shuffle(others.filter(w => !near.includes(w)));
      const opts = UI.shuffle([item, ...near.concat(rest).slice(0, PICS - 1)]);

      choices.className = `choices${opts.length >= 4 ? ' count-4' : ''}`;
      picks = opts.map((w, i) => {
        const btn = UI.el('button', {
          class: 'pic-btn pop-in',
          style: `animation-delay:${0.1 + i * 0.08}s`,
          'aria-label': w.w,
        }, UI.el('span', { class: 'emoji', text: w.e }));
        btn.addEventListener('click', () => choosePicture(btn, w));
        return btn;
      });
      choices.replaceChildren(...picks);
      Sound.say(`Which one is ${item.w}?`);
    }

    function choosePicture(btn, w) {
      if (btn.disabled) return;
      if (w.w !== item.w) {
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.say(`That's a ${w.w}.`, 200, `Find the ${item.w}.`);
        return;
      }

      Sound.sfx('correct');
      btn.classList.add('right');
      picks.forEach(b => { b.disabled = true; if (b !== btn) b.classList.add('wrong'); });
      showPicture(true);
      round++;
      api.progress(round, GOAL);
      const spoken = Sound.say(`Yes! ${item.w}!`, 250, UI.pick(UI.PRAISE));
      api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1500);
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
