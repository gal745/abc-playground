// Feed the Dragon: the dino's big brother. The sounds are pairs now, and at the end the
// dragon asks for a word that has to be read rather than a sound to listen for.
App.register({
  id: 'dragon',
  name: 'Feed the Dragon',
  emoji: '🐉',
  color: '#c1121f',
  levels: ['Starts with sh, ch or th', 'Find the sound in the word', 'Ends with the sound', 'Read the word', 'Read the word: four'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const CHOICES = [3, 4, 3, 3, 4][L - 1];
    const readWord = L >= 4;

    const all = DATA.soundPairs.concat(DATA.morePairs).flatMap(g => g.words.map(w => ({ ...w, p: g.p })));
    const startsWith = w => w.c[0] === w.p;
    const endsWith = w => w.c[w.c.length - 1] === w.p;
    const list = L === 1 ? all.filter(w => ['sh', 'ch', 'th'].includes(w.p) && startsWith(w))
      : L === 2 ? all.filter(w => DATA.soundPairs.some(g => g.p === w.p))
        : L === 3 ? all.filter(endsWith)
          : all;
    const pairs = [...new Set(list.map(w => w.p))];

    let round = 0;
    let target = null;   // the pair being asked for, or the word to read
    let locked = false;

    const body = UI.el('span', { class: 'dino-body emoji', text: '🐉' });
    const bubble = UI.el('span', { class: 'dino-bubble' });
    const dragon = UI.el('button', { class: 'dino', 'aria-label': 'Hear it again', onclick: () => replay() }, body, bubble);
    const choices = UI.el('div', { class: `choices${CHOICES >= 4 ? ' count-4' : ''}` });
    // the word it just ate, written out, so every round ends by seeing the whole word
    const shownWord = UI.el('div', { class: 'dragon-word' });
    stage.append(dragon, shownWord, choices);

    function next() {
      locked = false;
      shownWord.replaceChildren();
      shownWord.classList.remove('shown');
      let foods;

      if (readWord) {
        // the dragon names a word; the choices are written, so it has to be read
        const pick = UI.pick(list.filter(w => !target || w.w !== target.w));
        target = pick;
        const near = UI.shuffle(list.filter(w => w.w !== pick.w && w.p === pick.p));
        const rest = UI.shuffle(list.filter(w => w.w !== pick.w && w.p !== pick.p));
        foods = UI.shuffle([pick, ...near.concat(rest).slice(0, CHOICES - 1)]);
        bubble.replaceChildren(UI.el('span', { class: 'emoji', text: '🍽️' }));
      } else {
        const p = UI.pick(pairs.filter(x => x !== (target && target.p)));
        const good = UI.pick(list.filter(w => w.p === p));
        target = { p, w: good.w };
        const bad = UI.shuffle(list.filter(w => w.p !== p));
        foods = UI.shuffle([good, ...bad.slice(0, CHOICES - 1)]);
        bubble.replaceChildren(UI.el('span', { class: 'letter', text: UI.showLetter(p) }));
      }
      UI.replayClass(dragon, 'pop-in');

      choices.replaceChildren(...foods.map((f, i) => {
        const btn = readWord
          ? UI.el('button', { class: 'word-btn pop-in', style: `--bc:${UI.COLORS[i % UI.COLORS.length]};animation-delay:${0.1 + i * 0.07}s`, 'aria-label': f.w },
            UI.el('span', { class: 'letter', text: UI.showLetter(f.w) }))
          : UI.el('button', { class: 'pic-btn pop-in', style: `animation-delay:${0.1 + i * 0.07}s`, 'aria-label': f.w },
            UI.el('span', { class: 'emoji', text: f.e }));
        btn.addEventListener('click', () => choose(btn, f));
        return btn;
      }));
      choices.className = `choices${CHOICES >= 4 ? ' count-4' : ''}${readWord ? ' word-row' : ''}`;
      ask();
    }

    function ask() {
      if (readWord) return Sound.say("I'm hungry!", 200, `Feed me the ${target.w}!`, 300, `Which word says ${target.w}?`);
      const where = L === 3 ? 'ends with' : L === 2 ? 'has the sound' : 'starts with';
      return Sound.say("I'm hungry!", 200, `Feed me something that ${where}`, { sound: target.p }, 300, { sound: target.p });
    }

    function replay() {
      if (!locked && target) ask();
    }

    function right(f) {
      return readWord ? f.w === target.w : f.p === target.p;
    }

    function choose(btn, f) {
      if (locked || btn.disabled) return;
      if (!right(f)) {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        UI.replayClass(body, 'wobble');
        if (readWord) Sound.say(`Yuck! That says ${f.w}.`, 250, `I want the ${target.w}.`);
        else Sound.say(`Yuck! ${f.w} has`, { sound: f.p }, 250, 'I want', { sound: target.p });
        return;
      }

      locked = true;
      btn.disabled = true;
      Sound.sfx('correct');
      UI.flyTo(btn, body, () => { UI.replayClass(body, 'chomp'); Sound.sfx('pop'); });
      btn.classList.add('eaten');
      round++;
      api.progress(round, GOAL);

      // the whole word, written out and sounded through, so it is read as well as heard
      const bits = f.c.map(bit => UI.el('span', {
        class: `dragon-bit${bit.length > 1 ? ' pair' : ''}`,
      }, UI.el('span', { class: 'letter', text: UI.showLetter(bit) })));
      shownWord.replaceChildren(
        UI.el('span', { class: 'emoji dragon-word-pic', text: f.e }),
        UI.el('span', { class: 'dragon-word-bits' }, ...bits));
      shownWord.classList.add('shown');
      UI.replayClass(shownWord, 'pop-in');

      const glow = i => bits.forEach((b, j) => b.classList.toggle('lit', i === j));
      const parts = [`Yum yum! ${f.w}!`, 200];
      f.c.forEach((bit, i) => parts.push(() => glow(i), { sound: bit }, 110));
      parts.push(() => glow(-1), 150, `${f.w}!`,
        () => UI.replayClass(shownWord, 'bounce'), 250, UI.pick(UI.PRAISE));
      api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1600);
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
