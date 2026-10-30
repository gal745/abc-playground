// Change a Sound: the caterpillar says a word. Change ONE sound and it says a different one -
// cat to hat, cap to cup, shop to chop. The new word is only ever heard, never written, so the
// child has to work out which sound is different and which letter makes it. Five changes and
// the caterpillar turns into a butterfly.
App.register({
  id: 'bug',
  name: 'Change a Sound',
  emoji: '🐛',
  color: '#52b788',
  levels: ['Change the first sound', 'Change the last sound', 'Change the middle sound', 'Which sound changes?', 'Pairs: which sound changes?'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const CHOICES = [2, 3, 3, 4, 4][L - 1];
    const findIt = L >= 4;     // nothing is marked: they have to spot the sound that changes

    const chunksOf = w => (w.c || [...w.w]);
    const source = L === 5
      ? [...DATA.soundPairs.flatMap(g => g.words), ...DATA.cvc, ...DATA.cvcc]
      : DATA.cvc;
    const pool = source.map(w => ({ w: w.w, e: w.e, c: chunksOf(w) }));

    // two words are neighbours when exactly one sound is different
    function diffAt(a, b) {
      if (a.c.length !== b.c.length) return -1;
      let at = -1;
      for (let i = 0; i < a.c.length; i++) {
        if (a.c[i] !== b.c[i]) {
          if (at >= 0) return -1;
          at = i;
        }
      }
      return at;
    }

    function wanted(word, at) {
      if (at < 0) return false;
      if (L === 1) return at === 0;
      if (L === 2) return at === word.c.length - 1;
      if (L === 3) return at === 1;
      return true;
    }

    const neighbours = word => pool.filter(x => x.w !== word.w && x.e !== word.e && wanted(word, diffAt(word, x)));
    const hasPair = w => w.c.some(bit => bit.length > 1);
    const canStart = pool.filter(w => neighbours(w).length);
    // the last level is about the pairs, so it starts - and stays - on words that have one
    const starts = L === 5 && canStart.some(hasPair) ? canStart.filter(hasPair) : canStart;

    let word = null;
    let before = null;   // where we just came from, so it never changes straight back
    let target = null;
    let at = 0;
    let round = 0;
    let locked = true;
    let picking = false;   // the segment is chosen, now for the letter
    let segs = [];

    const pic = UI.el('div', { class: 'picture-card bug-pic' });
    const head = UI.el('span', { class: 'bug-head emoji', text: '🐛' });
    const body = UI.el('div', { class: 'bug-body' });
    const row = UI.el('button', { class: 'bug-row', 'aria-label': 'Hear it again', onclick: () => replay() }, head, body);
    const choices = UI.el('div', { class: `choices swap-row${CHOICES >= 4 ? ' count-4' : ''}` });
    stage.append(pic, row, choices);

    function showPic(w) {
      pic.replaceChildren(UI.el('span', { class: 'emoji picture', text: w.e }));
      UI.replayClass(pic, 'pop-in');
    }

    function drawBody() {
      const colors = UI.shuffle(UI.COLORS);
      segs = word.c.map((bit, i) => {
        const seg = UI.el('button', {
          class: `bug-seg awake${bit.length > 1 ? ' pair' : ''}`,
          style: `--bc:${colors[i % colors.length]}`,
          'aria-label': `The sound ${bit}`,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(bit) }));
        seg.addEventListener('click', e => { e.stopPropagation(); tapSeg(i, seg, bit); });
        return seg;
      });
      body.replaceChildren(...segs);
    }

    function newWord() {
      word = UI.pick(starts.filter(w => !word || w.w !== word.w));
      before = null;
      drawBody();
      showPic(word);
    }

    function nextChange(fresh, tries = 0) {
      picking = false;
      choices.replaceChildren();
      const options = neighbours(word);
      if (!options.length) {           // this word is a dead end: a new caterpillar comes along
        newWord();
        return nextChange(true, tries + 1);
      }
      let onwards = options.filter(x => !before || x.w !== before.w);
      if (!onwards.length) onwards = options;
      const withPair = L === 5 ? onwards.filter(hasPair) : [];
      // the pairs level is allowed to step off a pair (shed to bed teaches sh against b),
      // but it does not wander away: once there is no pair in sight, a new caterpillar comes
      if (L === 5 && !withPair.length && !hasPair(word) && tries < 3) {
        newWord();
        return nextChange(true, tries + 1);
      }
      target = UI.pick(withPair.length ? withPair : onwards);
      at = diffAt(word, target);
      locked = false;

      segs.forEach((s, i) => s.classList.toggle('current', !findIt && i === at));
      if (!findIt) openChoices();
      return ask(fresh);
    }

    function ask(fresh) {
      return Sound.say(
        fresh ? 'Here comes another caterpillar!' : null, fresh ? 250 : null,
        `It says ${word.w}.`, 300, `Now make it say ${target.w}!`,
        findIt ? 250 : null, findIt ? 'Which sound has to change?' : null);
    }

    function replay() {
      if (locked) return;
      Sound.say(`It says ${word.w}.`, 300, `Make it say ${target.w}.`);
    }

    function tapSeg(i, seg, bit) {
      if (locked || !findIt || picking) return;
      if (i !== at) {
        Sound.sfx('wrong');
        UI.replayClass(seg, 'shake');
        Sound.say({ sound: bit }, 200, `stays the same in ${target.w}.`, 250, 'Try another one.');
        return;
      }
      Sound.sfx('tap');
      seg.classList.add('current');
      openChoices();
      Sound.say('Yes!', 200, 'Which sound goes there?');
    }

    // the letters that could sit in that place: the right one, and ones that are really used
    // at the same spot in other words, so the wrong answers are never silly
    function openChoices() {
      picking = true;
      const right = target.c[at];
      const others = [...new Set(pool.filter(x => x.c.length === word.c.length).map(x => x.c[at]))]
        .filter(b => b !== right && b !== word.c[at]);
      const bits = UI.shuffle([right, ...UI.shuffle(others).slice(0, CHOICES - 1)]);
      const colors = UI.shuffle(UI.COLORS);
      choices.replaceChildren(...bits.map((bit, i) => {
        const btn = UI.el('button', {
          class: `letter-btn swap-btn pop-in${bit.length > 1 ? ' pair' : ''}`,
          style: `--bc:${colors[i % colors.length]};animation-delay:${0.08 + i * 0.07}s`,
          'aria-label': `The sound ${bit}`,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(bit) }));
        btn.addEventListener('click', () => choose(btn, bit));
        return btn;
      }));
    }

    function choose(btn, bit) {
      if (locked || btn.disabled) return;
      if (bit !== target.c[at]) {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        Sound.say('That one says', { sound: bit }, 250, `I want ${target.w}.`, 200, 'Listen:', { sound: target.c[at] });
        return;
      }

      locked = true;
      Sound.sfx('correct');
      choices.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const seg = segs[at];
      UI.flyTo(btn, seg, () => {
        seg.replaceChildren(UI.el('span', { class: 'letter', text: UI.showLetter(bit) }));
        seg.classList.toggle('pair', bit.length > 1);
        seg.classList.remove('current');
        UI.replayClass(seg, 'bounce');
        choices.replaceChildren();
      });

      before = word;
      word = target;
      round++;
      api.progress(round, GOAL);

      // read the new word back, sound by sound, so the change is heard as well as seen
      const glow = i => segs.forEach((s, j) => s.classList.toggle('glow', i === j));
      const parts = [450, () => showPic(word)];
      word.c.forEach((x, i) => parts.push(() => glow(i), { sound: x }, 110));
      parts.push(() => glow(-1), 150, `${word.w}!`, 250, UI.pick(UI.PRAISE));

      if (round >= GOAL) {
        parts.push(300, () => {
          body.classList.add('together');
          head.textContent = '🦋';
          UI.replayClass(row, 'bounce');
          Sound.sfx('pop');
        }, 400, 'Look! A butterfly!');
        api.after(Sound.say(...parts), () => api.win(), 2200);
      } else {
        api.after(Sound.say(...parts), () => nextChange(false), 1800);
      }
    }

    api.progress(0, GOAL);
    newWord();
    nextChange(false);

    return { replay };
  },
});
