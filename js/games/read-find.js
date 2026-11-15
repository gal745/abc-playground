// Read and Find: the word comes first and nothing says it out loud. Read it, then tap the
// picture it means. The other way round from Which Word?, and the thing today's lesson works
// on: a written word standing on its own, with meaning on the end of it.
App.register({
  id: 'readfind',
  name: 'Read and Find',
  emoji: '📘',
  color: '#3a7ca5',
  levels: ['Two pictures', 'Three pictures', 'Same family: look at the start', 'Pair words: sh ch th oo ee ck', 'Four sounds'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const CHOICES = [2, 3, 3, 3, 3][L - 1];
    const family = L === 3;

    const chunksOf = w => (w.c || [...w.w]);
    const pairWords = DATA.soundPairs.flatMap(g => g.words).map(w => ({ ...w, c: chunksOf(w) }));
    const threes = DATA.cvc.map(w => ({ ...w, c: [...w.w] }));
    const fours = DATA.cvcc.map(w => ({ ...w, c: [...w.w] }));
    const families = DATA.families.filter(f => f.words.length >= CHOICES);
    const list = L === 4 ? pairWords : L === 5 ? fours : threes;

    let round = 0;
    let item = null;
    let locked = false;

    const card = UI.el('button', { class: 'read-word', 'aria-label': 'Sound it out', onclick: () => soundOut() });
    const help = UI.el('p', { class: 'read-help', text: 'Tap the word if you need help.' });
    const choices = UI.el('div', { class: 'choices' });
    stage.append(card, help, choices);

    // never two of the same picture, and for the family level the words all rhyme, so only
    // the beginning tells them apart
    function roundWords() {
      if (family) {
        const f = UI.pick(families);
        const words = UI.shuffle(f.words).slice(0, CHOICES).map(w => ({ ...w, c: [...w.w] }));
        return { right: words[0], all: UI.shuffle(words) };
      }
      const right = UI.pick(list.filter(w => !item || w.w !== item.w));
      const near = UI.shuffle(list.filter(w => w.w !== right.w && w.e !== right.e))
        .sort((a, b) => {
          const same = x => [...x.w].filter((ch, i) => right.w[i] === ch).length;
          return same(b) - same(a);
        })
        .slice(0, CHOICES - 1);
      return { right, all: UI.shuffle([right, ...near]) };
    }

    function next() {
      locked = false;
      const { right, all } = roundWords();
      item = right;

      card.replaceChildren(UI.el('span', { class: 'letter', text: UI.showLetter(item.w) }));
      UI.replayClass(card, 'pop-in');
      card.classList.remove('read');

      choices.className = `choices${CHOICES >= 4 ? ' count-4' : ''}`;
      choices.replaceChildren(...all.map((w, i) => {
        const btn = UI.el('button', { class: 'pic-btn pop-in', style: `animation-delay:${0.1 + i * 0.08}s`, 'aria-label': w.w },
          UI.el('span', { class: 'emoji', text: w.e }));
        btn.addEventListener('click', () => choose(btn, w));
        return btn;
      }));
      ask();
    }

    function ask() {
      return Sound.say(round === 0 ? 'Read the word, then tap the picture it says.' : UI.pick(['Read this one.', 'Your turn.', 'What does it say?']));
    }

    // the help: the word sounded out, only when it is asked for
    function soundOut() {
      if (locked || !item) return;
      card.classList.add('read');
      const parts = [];
      chunksOf(item).forEach(bit => parts.push({ sound: bit }, 110));
      parts.push(150, `${item.w}!`);
      return Sound.say(...parts);
    }

    function choose(btn, w) {
      if (locked || btn.disabled) return;
      if (w.w !== item.w) {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        // a wrong tap is where the teaching happens: say what they picked, then read the word
        Sound.say(`That is a ${w.w}.`, 250, 'This word says', ...chunksOf(item).flatMap(bit => [{ sound: bit }, 110]), 150, `${item.w}.`);
        return;
      }

      locked = true;
      btn.classList.add('right');
      choices.querySelectorAll('button').forEach(b => { b.disabled = true; });
      Sound.sfx('correct');
      card.classList.add('read');
      round++;
      api.progress(round, GOAL);
      const spoken = Sound.say(`${item.w}!`, 250, UI.pick(UI.PRAISE));
      api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1300);
    }

    api.progress(0, GOAL);
    next();

    return { replay: ask };
  },
});
