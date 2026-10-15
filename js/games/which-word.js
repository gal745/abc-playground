// Which Word? Read the words and tap the right one. Rhyming words first, tricky vowels last.
App.register({
  id: 'which',
  name: 'Which Word?',
  emoji: '🔎',
  color: '#b5651d',
  levels: ['Two rhyming words', 'Three rhyming words', 'Four words to read', 'Same first letter', 'Tricky vowels: pan, pin, pen'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const COUNT = [2, 3, 4, 3, 3][L - 1];
    const mode = L === 4 ? 'first' : L === 5 ? 'vowel' : 'rhyme';
    const all = DATA.families.flatMap(f => f.words);
    const VOWELS = ['a', 'e', 'i', 'o', 'u'];
    const vowelOf = w => [...w].find(l => VOWELS.includes(l));
    const enough = list => (list.filter(g => g.length >= COUNT).length ? list.filter(g => g.length >= COUNT) : list);

    // words that start with the same letter but end differently: pan, pen, pin
    const byFirst = {};
    all.forEach(w => { (byFirst[w.w[0]] = byFirst[w.w[0]] || []).push(w); });
    const firstGroups = enough(Object.values(byFirst).filter(g => g.length >= 2));
    const famWords = enough(DATA.families.map(f => f.words));

    let round = 0;
    let item = null;
    let last = null;
    let locked = false;
    let buttons = [];

    const pic = UI.el('button', { class: 'picture-card', 'aria-label': 'Hear it again', onclick: () => replay() });
    const words = UI.el('div', { class: 'word-row' });
    stage.append(pic, words);

    // each letter's sound, one after another, for sounding a word out
    const soundOut = w => [...w].flatMap(l => [{ sound: l }, 120]);

    function roundWords() {
      const pool = mode === 'vowel' ? UI.pick(DATA.vowelSwaps)
        : mode === 'first' ? UI.pick(firstGroups)
          : UI.pick(famWords);
      let choices = UI.shuffle(pool).slice(0, COUNT);
      if (choices.length < COUNT) {
        // a small set: top up with words that still look alike - same first letter,
        // same ending, or the same vowel in the middle
        const base = choices[0].w;
        const alike = w => w.w[0] === base[0] || w.w.slice(-2) === base.slice(-2) || vowelOf(w.w) === vowelOf(base);
        const spare = all.filter(w => !choices.some(c => c.w === w.w));
        choices = choices.concat(UI.shuffle(spare.filter(alike)), UI.shuffle(spare.filter(w => !alike(w)))).slice(0, COUNT);
      }
      return UI.shuffle(choices);
    }

    function next() {
      locked = false;
      const choices = roundWords();
      // don't ask for the same word twice running
      const fresh = choices.filter(w => w.w !== last);
      item = UI.pick(fresh.length ? fresh : choices);
      last = item.w;

      pic.replaceChildren(
        UI.el('span', { class: 'emoji picture', text: '❓' }),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
      UI.replayClass(pic, 'pop-in');

      const colors = UI.shuffle(UI.COLORS);
      words.className = `word-row${choices.length >= 4 ? ' count-4' : ''}`;
      buttons = choices.map((w, i) => {
        const btn = UI.el('button', {
          class: 'word-btn pop-in',
          style: `--bc:${colors[i % colors.length]};animation-delay:${0.2 + i * 0.08}s`,
          'aria-label': w.w,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(w.w) }));
        btn.addEventListener('click', () => choose(btn, w));
        return btn;
      });
      words.replaceChildren(...buttons);
      ask();
    }

    function ask() {
      return Sound.say(`${item.w}.`, 250, `Which word says ${item.w}?`);
    }

    function replay() {
      if (!locked && item) ask();
    }

    function choose(btn, w) {
      if (locked || btn.disabled) return;
      if (w.w !== item.w) {
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        Sound.say('That says', 100, ...soundOut(w.w), 100, `${w.w}.`, 250, `Find ${item.w}.`);
        return;
      }

      locked = true;
      Sound.sfx('correct');
      btn.classList.add('right');
      buttons.forEach(b => { b.disabled = true; if (b !== btn) b.classList.add('wrong'); });
      pic.replaceChildren(
        UI.el('span', { class: 'emoji picture', text: item.e }),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
      UI.replayClass(pic, 'bounce');

      round++;
      api.progress(round, GOAL);
      const spoken = Sound.say('Yes!', 200, ...soundOut(item.w), 150, `${item.w}!`, 250, UI.pick(UI.PRAISE));
      api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1600);
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
