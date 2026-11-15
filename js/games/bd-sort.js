// b and d Sort: the same decision as "b or d?", made the other way round. Here the letter is
// already in the word and the job is to see which one it is - blue b basket or red d basket.
// Plain repetition is what fixes this mix-up, so the game is short, quick and always the same
// two baskets.
App.register({
  id: 'bdsort',
  name: 'b and d Sort',
  emoji: '🧺',
  color: '#4d96ff',
  levels: ['Just the letter', 'Words that start with it', 'Words that end with it', 'Start or end', 'Quick as you can'],

  create(stage, api) {
    const GOAL = 6;
    const L = api.level;
    const lettersOnly = L === 1;

    const pairWords = [...DATA.soundPairs, ...DATA.morePairs].flatMap(g => g.words);
    const every = [...DATA.cvc, ...DATA.cvcc, ...pairWords].filter(w => w.e && w.w.length <= 5);
    const starts = every.filter(w => 'bd'.includes(w.w[0]));
    const ends = every.filter(w => 'bd'.includes(w.w[w.w.length - 1]));
    const list = L === 2 ? starts : L === 3 ? ends : [...starts, ...ends];

    let queue = [];
    let item = null;      // { w, e } or { letter }
    let want = 'b';
    let round = 0;
    let locked = false;

    const card = UI.el('div', { class: 'sort-card' });
    const baskets = UI.el('div', { class: 'sort-baskets' });
    stage.append(card, baskets);

    const basket = letter => {
      const box = UI.el('button', { class: `sort-basket is-${letter}`, 'aria-label': `the ${letter === 'b' ? 'blue b' : 'red d'} basket` },
        UI.el('span', { class: 'emoji sort-pic', text: '🧺' }),
        UI.el('span', { class: 'letter sort-letter', text: letter }));
      box.addEventListener('click', () => choose(box, letter));
      return box;
    };
    baskets.replaceChildren(basket('b'), basket('d'));

    function next() {
      locked = false;
      if (!queue.length) queue = UI.shuffle(lettersOnly ? ['b', 'd', 'b', 'd', 'b', 'd'] : list);
      const pick = queue.pop();

      if (lettersOnly) {
        want = pick;
        item = { letter: pick };
        card.replaceChildren(UI.el('span', { class: `letter sort-big is-${pick}`, text: UI.showLetter(pick) }));
      } else {
        item = pick;
        const first = 'bd'.includes(pick.w[0]);
        want = first ? pick.w[0] : pick.w[pick.w.length - 1];
        card.replaceChildren(
          UI.el('span', { class: 'emoji sort-word-pic', text: pick.e }),
          UI.el('span', { class: 'letter sort-word' }, ...[...pick.w].map(l =>
            UI.el('span', { class: 'bd'.includes(l) ? `is-${l}` : '', text: UI.showLetter(l) }))));
      }
      UI.replayClass(card, 'pop-in');
      ask();
    }

    function ask() {
      if (lettersOnly) return Sound.say('Which one is this?', 250, 'Put it in the right basket.');
      if (round === 0) return Sound.say(`${item.w}.`, 300, 'Does it belong with b, or with d?');
      return Sound.say(`${item.w}.`, 250, UI.pick(['Which basket?', 'Where does it go?', 'b or d?']));
    }

    function choose(box, letter) {
      if (locked) return;
      if (letter !== want) {
        Sound.sfx('wrong');
        UI.replayClass(box, 'shake');
        const other = letter === 'b' ? 'blue' : 'red';
        Sound.say(`That is the ${other} basket, for ${Sound.letterName(letter)}.`, 300,
          'Look again:', 200, lettersOnly ? 'which way does it face?' : `${item.w}.`);
        return;
      }

      locked = true;
      Sound.sfx('correct');
      const thing = card.firstChild && card.lastChild;
      UI.flyTo(card, box, () => { UI.replayClass(box, 'bounce'); Sound.sfx('pop'); });
      card.replaceChildren();
      round++;
      api.progress(round, GOAL);
      const said = lettersOnly
        ? [`Yes! ${Sound.letterName(want)}.`, 200, `${want === 'b' ? 'Blue' : 'Red'} one.`]
        : [`Yes! ${item.w}`, 200, 'with', { name: want }, 250, `${item.w}!`];
      api.after(Sound.say(...said, 250, UI.pick(UI.PRAISE)),
        () => (round >= GOAL ? api.win() : next()), L === 5 ? 700 : 1100);
      void thing;
    }

    api.progress(0, GOAL);
    next();

    return { replay: ask };
  },
});
