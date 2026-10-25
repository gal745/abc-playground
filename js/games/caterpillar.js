// Caterpillar Words: the caterpillar's body is the word. Wake each letter in turn, hear its
// sound, and when the last one is awake the body squeezes together and the word hatches.
App.register({
  id: 'bug',
  name: 'Caterpillar Words',
  emoji: '🐛',
  color: '#52b788',
  levels: ['Two letters', 'Three letters: animals', 'Three letters', 'Which animal is it?', 'Four letters'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const PICS = L === 4 ? 3 : 0;   // pictures to choose between once the word is made
    const animals = DATA.cvc.filter(w => DATA.animals.includes(w.w));
    const list = L === 1 ? DATA.joins.map(w => ({ w, e: '' }))
      : L === 2 ? animals
        : L === 5 ? DATA.cvcc : DATA.cvc;

    let queue = [];
    let round = 0;
    let item = null;
    let pos = 0;
    let locked = false;
    let segs = [];
    let picks = [];

    const pic = UI.el('div', { class: 'picture-card bug-pic' });
    const head = UI.el('span', { class: 'bug-head emoji', text: '🐛' });
    const body = UI.el('div', { class: 'bug-body' });
    const row = UI.el('div', { class: 'bug-row' }, head, body);
    const choices = UI.el('div', { class: 'choices' });
    stage.append(pic, row, choices);

    function showPicture(reveal) {
      pic.hidden = L === 1; // the little words have nothing to draw
      pic.replaceChildren(UI.el('span', { class: 'emoji picture', text: reveal ? item.e : '❓' }));
    }

    function next() {
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      pos = 0;
      locked = false;

      showPicture(false);
      head.textContent = '🐛';
      body.className = 'bug-body';
      choices.replaceChildren();

      const colors = UI.shuffle(UI.COLORS);
      segs = [...item.w].map((l, i) => {
        const seg = UI.el('button', {
          class: 'bug-seg pop-in',
          style: `--bc:${colors[i % colors.length]};animation-delay:${0.1 + i * 0.09}s`,
          'aria-label': `Letter ${l}`,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(l) }));
        seg.addEventListener('click', () => tapSeg(i, seg, l));
        return seg;
      });
      body.replaceChildren(...segs);
      markSeg();
      ask();
    }

    function markSeg() {
      segs.forEach((s, i) => s.classList.toggle('current', i === pos && !locked));
    }

    function ask() {
      if (round === 0 && pos === 0) {
        return Sound.say('Wake up the caterpillar!', 300, 'Tap each letter and say its sound.');
      }
      return Sound.say(pos === 0 ? 'Start at the head.' : 'And the next one.');
    }

    function replay() {
      if (locked || !item) return;
      if (pos >= item.w.length) Sound.say(`${item.w}!`);
      else Sound.say('Tap the letter that says', { sound: item.w[pos] });
    }

    function tapSeg(i, seg, l) {
      if (locked) return;
      if (i !== pos) {
        Sound.sfx('wrong');
        UI.replayClass(seg, 'shake');
        UI.replayClass(segs[pos], 'bounce');
        Sound.say(pos === 0 ? 'Start at the head!' : 'This one is next!');
        return;
      }
      Sound.sfx('tap');
      seg.classList.add('awake');
      pos++;
      markSeg();
      if (pos < item.w.length) {
        Sound.say({ sound: l });
      } else {
        locked = true;
        api.later(hatch, 450);
      }
    }

    // the body closes up and the word comes out in one go
    function hatch() {
      body.classList.add('together');
      Sound.sfx('pop');
      const glow = i => segs.forEach((s, j) => s.classList.toggle('glow', i === j));
      const parts = [];
      [...item.w].forEach((l, i) => parts.push(() => glow(i), { sound: l }, 90));
      parts.push(() => glow(-1), 200, `${item.w}!`,
        () => { Sound.sfx('correct'); UI.replayClass(row, 'bounce'); });

      if (PICS) {
        api.after(Sound.say(...parts), askPicture, 900);
      } else {
        parts.push(() => { showPicture(true); head.textContent = '🦋'; }, 250, UI.pick(UI.PRAISE));
        round++;
        api.progress(round, GOAL);
        api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1500);
      }
    }

    function askPicture() {
      const others = UI.shuffle(list.filter(w => w.w !== item.w));
      const opts = UI.shuffle([item, ...others.slice(0, PICS - 1)]);
      picks = opts.map((w, i) => {
        const btn = UI.el('button', { class: 'pic-btn pop-in', style: `animation-delay:${0.1 + i * 0.08}s`, 'aria-label': w.w },
          UI.el('span', { class: 'emoji', text: w.e }));
        btn.addEventListener('click', () => choosePicture(btn, w));
        return btn;
      });
      choices.replaceChildren(...picks);
      Sound.say(`Which one is the ${item.w}?`);
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
      head.textContent = '🦋';
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
