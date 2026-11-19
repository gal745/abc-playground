// b and d Hunt: a board of b's and d's, and only one of them is wanted. Finding every b on a
// board full of d's is the plainest way to practise telling the two shapes apart, and it is
// the kind of hunting children will do all day.
App.register({
  id: 'bdhunt',
  name: 'b and d Hunt',
  emoji: '🔍',
  color: '#ff8c1a',
  levels: ['Find the letters', 'A bigger board', 'Words that start with it', 'Words, anywhere in them', 'A big board, quick'],

  create(stage, api) {
    const GOAL = 4;
    const L = api.level;
    const SIZE = [9, 12, 9, 12, 16][L - 1];
    const wordsMode = L >= 3;

    const pairWords = [...DATA.soundPairs, ...DATA.morePairs].flatMap(g => g.words);
    const every = [...DATA.cvc, ...DATA.cvcc, ...pairWords].filter(w => w.e && w.w.length <= 5);
    const startsWith = l => every.filter(w => w.w[0] === l);
    const hasAt = l => every.filter(w => w.w[0] === l || w.w[w.w.length - 1] === l);
    const wordsFor = l => (L === 3 ? startsWith(l) : hasAt(l));

    let want = 'd';
    let left = 0;
    let round = 0;
    let locked = false;

    const card = UI.el('button', { class: 'hunt-target', 'aria-label': 'Say it again', onclick: () => ask() });
    const board = UI.el('div', { class: 'hunt-board' });
    stage.append(card, board);

    const colour = l => (l === 'b' ? 'blue' : 'red');

    function next() {
      locked = false;
      want = want === 'b' ? 'd' : 'b';
      const other = want === 'b' ? 'd' : 'b';

      // between a third and a half of the board is what they are looking for
      const wanted = Math.max(3, Math.round(SIZE * 0.4));
      const mine = wordsMode ? UI.shuffle(wordsFor(want)).slice(0, wanted) : Array.from({ length: wanted }, () => want);
      // a word that carries both letters (bed, bud) can never be one of the ones to leave alone
      const rest = wordsMode
        ? UI.shuffle(wordsFor(other).filter(w => !w.w.includes(want))).slice(0, SIZE - mine.length)
        : Array.from({ length: SIZE - mine.length }, () => other);
      const items = UI.shuffle([...mine.map(x => ({ x, mine: true })), ...rest.map(x => ({ x, mine: false }))]);
      left = mine.length;

      card.replaceChildren(
        UI.el('span', { class: `letter hunt-big is-${want}`, text: UI.showLetter(want) }),
        UI.el('span', { class: 'hunt-find', text: wordsMode ? 'find them all' : 'tap every one' }));
      UI.replayClass(card, 'pop-in');

      board.className = `hunt-board size-${SIZE}`;
      board.replaceChildren(...items.map((item, i) => {
        const text = wordsMode ? item.x.w : item.x;
        const tile = UI.el('button', {
          class: `hunt-tile pop-in${wordsMode ? ' word' : ''}`,
          style: `animation-delay:${0.04 + i * 0.03}s`,
          'aria-label': text,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(text) }));
        tile.addEventListener('click', () => tap(tile, item, text));
        return tile;
      }));
      ask();
    }

    function ask() {
      if (!want) return null;
      const what = !wordsMode
        ? [`Tap every ${Sound.letterName(want)}.`]
        : L === 3
          ? [`Find the words that start with ${Sound.letterName(want)}.`]
          : [`Find the words with ${Sound.letterName(want)} in them.`];
      return Sound.say(`The ${colour(want)} one!`, 250, ...what, 300, { sound: want });
    }

    function tap(tile, item, text) {
      if (locked || tile.classList.contains('got') || tile.classList.contains('no')) return;

      if (!item.mine) {
        Sound.sfx('wrong');
        UI.replayClass(tile, 'shake');
        tile.classList.add('no');
        setTimeout(() => tile.classList.remove('no'), 700);
        const other = want === 'b' ? 'd' : 'b';
        Sound.say(wordsMode ? `${text} has a ${Sound.letterName(other)}.` : `That one is ${Sound.letterName(other)}, the ${colour(other)} one.`,
          250, 'We want the', colour(want), 'one,', { name: want });
        return;
      }

      Sound.sfx('tap');
      tile.classList.add('got', `is-${want}`);
      left--;
      if (left > 0) {
        Sound.say(wordsMode ? `${text}!` : `${Sound.letterName(want)}!`);
        return;
      }

      locked = true;
      Sound.sfx('correct');
      round++;
      api.progress(round, GOAL);
      const spoken = Sound.say('You found them all!', 250, UI.pick(UI.PRAISE));
      api.after(spoken, () => (round >= GOAL ? api.win() : next()), L === 5 ? 900 : 1300);
    }

    api.progress(0, GOAL);
    next();

    return { replay: ask };
  },
});
