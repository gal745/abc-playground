// Sound Pairs: some sounds take two letters. Say each sound, then push them together.
App.register({
  id: 'pairs',
  name: 'Sound Pairs',
  emoji: '🤝',
  color: '#1b7f79',
  levels: ['sh, ch and th', 'oo and ee', 'All five pairs', 'Find it from three', 'More pairs: ck, ng, ai'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const PICS = [0, 0, 2, 3, 2][L - 1]; // how many pictures to choose between
    const groups = L === 1 ? DATA.soundPairs.filter(g => 'sh ch th'.includes(g.p))
      : L === 2 ? DATA.soundPairs.filter(g => 'oo ee'.includes(g.p))
        : L === 5 ? DATA.morePairs : DATA.soundPairs;
    const list = groups.flatMap(g => g.words.map(w => ({ ...w, p: g.p })));

    let queue = [];
    let round = 0;
    let item = null;
    let pos = 0;
    let locked = false;
    let cards = [];
    let picks = [];

    const pic = UI.el('div', { class: 'picture-card join-pic' });
    const row = UI.el('div', { class: 'join-row' });
    const joinBtn = UI.el('button', { class: 'join-btn', hidden: 'hidden' },
      UI.el('span', { class: 'emoji', text: '🤝' }), ' Push them together!');
    const choices = UI.el('div', { class: 'choices' });
    stage.append(pic, row, joinBtn, choices);
    joinBtn.addEventListener('click', join);

    function showPicture(reveal) {
      pic.replaceChildren(UI.el('span', { class: 'emoji picture', text: reveal ? item.e : '❓' }));
    }

    function next() {
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      pos = 0;
      locked = false;

      showPicture(false);
      row.className = `join-row${item.c.length > 3 ? ' long' : ''}`;
      joinBtn.hidden = true;
      choices.replaceChildren();

      const colors = UI.shuffle(UI.COLORS);
      cards = item.c.map((bit, i) => {
        const isPair = bit.length > 1;
        const card = UI.el('button', {
          class: `letter-card${isPair ? ' pair-card' : ''} pop-in`,
          style: `--bc:${isPair ? 'var(--c)' : colors[i % colors.length]};animation-delay:${0.1 + i * 0.1}s`,
          'aria-label': isPair ? `${bit}, one sound` : `Letter ${bit}`,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(bit) }),
        isPair ? UI.el('span', { class: 'pair-note', text: 'one sound' }) : null);
        card.addEventListener('click', () => tapBit(i, card, bit));
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
        return Sound.say('Some sounds take two letters!', 300, 'Tap each one, then push them together.');
      }
      if (pos === 0) return Sound.say('Tap the first sound.');
      return Sound.say('And the next one.');
    }

    function replay() {
      if (locked || !item) return;
      if (pos >= item.c.length) Sound.say('Now push them together!');
      else Sound.say('Tap the one that says', { sound: item.c[pos] });
    }

    function tapBit(i, card, bit) {
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
      if (pos < item.c.length) {
        Sound.say({ sound: bit });
      } else {
        joinBtn.hidden = false;
        UI.replayClass(joinBtn, 'pop-in');
        Sound.say({ sound: bit }, 300, 'Now push them together!');
      }
    }

    function join() {
      if (locked || pos < item.c.length) return;
      locked = true;
      markCard();
      joinBtn.hidden = true;
      Sound.sfx('pop');
      row.classList.add('together');

      // one spoken sequence: the sounds, then the word
      const parts = [];
      item.c.forEach((bit, i) => parts.push(() => glow(i), { sound: bit }, 90));
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
      // wrong pictures from the same pair where possible, so the word has to be read
      const others = list.filter(w => w.w !== item.w);
      const near = UI.shuffle(others.filter(w => w.p === item.p));
      const rest = UI.shuffle(others.filter(w => w.p !== item.p));
      const opts = UI.shuffle([item, ...near.concat(rest).slice(0, PICS - 1)]);

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
