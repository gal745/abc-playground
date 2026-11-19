// b Words and d Words: one letter at a time, and a bag to fill with every word that starts with
// it. "b and d Hunt" keeps swapping which letter is wanted; this does the opposite - the letter
// never changes for a whole game, so the only job is first sounds. The two games are built from
// the same maker because they are the same game with the letter swapped, and keeping them in one
// place keeps them behaving the same way.
(() => {
  const BAG = { b: '🐝', d: '🦆' };

  function make(letter, { id, name, color, other }) {
    App.register({
      id,
      name,
      emoji: BAG[letter],
      color,
      levels: ['Word and picture', 'More to find', 'Just the word',
        `The others all start with ${other}`, 'Quick as you can'],

      create(stage, api) {
        const GOAL = 4;
        const L = api.level;
        const SIZE = [6, 9, 9, 9, 12][L - 1];
        const WANT = [2, 3, 3, 3, 4][L - 1];
        const showPic = L <= 2;
        const colour = letter === 'b' ? 'blue' : 'red';

        const pairWords = [...DATA.soundPairs, ...DATA.morePairs].flatMap(g => g.words);
        const seen = new Set();
        const bank = [...DATA.cvc, ...DATA.cvcc, ...pairWords]
          .filter(w => w.e && w.w.length <= 5 && !seen.has(w.w) && seen.add(w.w));

        const startsWith = l => bank.filter(w => w.w[0] === l);
        // the picture words (balloon, dinosaur) are only ever shown with their picture beside them
        const mine = showPic
          ? [...startsWith(letter), ...(DATA.words[letter] || []).filter(w => !seen.has(w.w))]
          : startsWith(letter);
        // early on, nothing on the board looks like the letter we want; level 4 is nothing but
        const notMine = L === 4
          ? startsWith(other)
          : bank.filter(w => w.w[0] !== letter && (L >= 3 || w.w[0] !== other));

        let left = 0;
        let round = 0;
        let locked = false;
        let found = [];
        let queue = [];

        const bag = UI.el('button', { class: `bw-bag is-${letter}`, 'aria-label': 'Say it again', onclick: () => ask() });
        const tray = UI.el('div', { class: 'bw-tray' });
        const board = UI.el('div', { class: 'bw-board' });
        stage.append(bag, tray, board);

        const chips = () => tray.replaceChildren(...found.map(w =>
          UI.el('span', { class: 'bw-chip pop-in' },
            UI.el('span', { class: 'emoji', text: w.e }),
            UI.el('span', { class: 'letter', text: UI.showLetter(w.w) }))));

        function next() {
          locked = false;
          found = [];
          chips();

          if (queue.length < WANT) queue = UI.shuffle(mine);
          const wanted = queue.splice(0, WANT);
          const rest = UI.shuffle(notMine).slice(0, SIZE - wanted.length);
          const items = UI.shuffle([...wanted.map(w => ({ w, mine: true })), ...rest.map(w => ({ w, mine: false }))]);
          left = wanted.length;

          bag.replaceChildren(
            UI.el('span', { class: 'emoji bw-bag-pic', text: BAG[letter] }),
            UI.el('span', { class: 'bw-bag-text' },
              UI.el('span', { class: `letter bw-bag-letter is-${letter}`, text: UI.showLetter(letter) }),
              UI.el('span', { class: 'bw-bag-how', text: `find ${left} words` })));
          UI.replayClass(bag, 'pop-in');

          board.className = `bw-board size-${SIZE}${showPic ? '' : ' words-only'}`;
          board.replaceChildren(...items.map((item, i) => {
            const tile = UI.el('button', {
              class: 'bw-word pop-in', style: `animation-delay:${0.04 + i * 0.03}s`, 'aria-label': item.w.w,
            },
              showPic ? UI.el('span', { class: 'emoji', text: item.w.e }) : null,
              UI.el('span', { class: 'letter', text: UI.showLetter(item.w.w) }));
            tile.addEventListener('click', () => tap(tile, item));
            return tile;
          }));
          ask();
        }

        function ask() {
          return Sound.say(round === 0 && L === 1 ? 'Read them, and find the ones that start with' : 'Find the words that start with',
            150, { sound: letter }, 200, `The ${colour} letter. ${Sound.letterName(letter)}.`);
        }

        function tap(tile, item) {
          if (locked || tile.disabled) return;
          const first = (item.w.c || [item.w.w[0]])[0];

          if (!item.mine) {
            Sound.sfx('wrong');
            UI.replayClass(tile, 'shake');
            Sound.say(`${item.w.w}.`, 150, 'That starts with', { sound: first }, 300,
              'We want', { sound: letter }, 200, `like ${Sound.letterName(letter)}.`);
            return;
          }

          Sound.sfx('tap');
          tile.disabled = true;
          tile.classList.add('got');
          found.push(item.w);
          left--;
          UI.flyTo(tile, bag, () => { chips(); UI.replayClass(bag, 'bounce'); });
          const how = bag.querySelector('.bw-bag-how');
          if (how) how.textContent = left ? `${left} more` : 'all of them!';
          if (left > 0) {
            Sound.say(`${item.w.w}!`, 150, { sound: letter }, 150, `${item.w.w}.`);
            return;
          }

          locked = true;
          Sound.sfx('correct');
          round++;
          api.progress(round, GOAL);
          const list = found.map(w => w.w);
          const spoken = Sound.say('You found them all!', 250,
            ...list.flatMap(w => [w, 120]), 150, `All starting with ${Sound.letterName(letter)}.`,
            250, UI.pick(UI.PRAISE));
          api.after(spoken, () => (round >= GOAL ? api.win() : next()), L === 5 ? 900 : 1400);
        }

        api.progress(0, GOAL);
        next();

        return { replay: ask };
      },
    });
  }

  make('b', { id: 'bwords', name: 'b Words', color: '#1f6fd0', other: 'd' });
  make('d', { id: 'dwords', name: 'd Words', color: '#e0322f', other: 'b' });
})();
