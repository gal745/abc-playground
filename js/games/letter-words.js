// b Words and d Words: one letter at a time, and a bag to fill with every word that starts with
// it. "b and d Hunt" keeps swapping which letter is wanted; these do the opposite - the letter
// never changes for a whole game, so the only job is the first sound.
//
// The words are the ones a child already owns - animals, food, toys, things round the house -
// not the ones that happen to be easy to sound out, so banana and butterfly are in. The picture
// says what each word is; the word sits under it to be looked at, not decoded. Each level is one
// kind of thing, which makes the question a real one: "which of these animals starts with b?"
//
// Both games come out of the same maker because they are the same game with the letter swapped.
(() => {
  const BAG = { b: '🐝', d: '🦆' };
  const KINDS = [
    { set: 'animals', name: 'Animals', say: 'animals', size: 6, want: 3 },
    { set: 'food', name: 'Food', say: 'food', size: 6, want: 3 },
    { set: 'toys', name: 'Toys', say: 'toys', size: 6, want: 2 },
    { set: 'things', name: 'Things at home', say: 'things', size: 9, want: 3 },
    { set: null, name: 'All mixed up', say: 'words', size: 12, want: 4 },
  ];

  // sheep, chips: the first SOUND is two letters, so a wrong tap can be told what it really was
  const firstSound = w => (['sh', 'ch', 'th'].includes(w.slice(0, 2)) ? w.slice(0, 2) : w[0]);

  function make(letter, { id, name, color, other }) {
    App.register({
      id,
      name,
      emoji: BAG[letter],
      color,
      levels: KINDS.map(k => k.name),

      create(stage, api) {
        const GOAL = 4;
        const L = api.level;
        const kind = KINDS[L - 1];
        const colour = letter === 'b' ? 'blue' : 'red';

        const everything = Object.values(DATA.picSets).flat();
        const seen = new Set();
        const pool = (kind.set ? DATA.picSets[kind.set] : everything)
          .filter(w => !seen.has(w.w) && !seen.has(w.e) && seen.add(w.w) && seen.add(w.e));

        const mine = pool.filter(w => w.w[0] === letter);
        // the look-alike letter joins in once they have had one gentle round
        const notMine = pool.filter(w => w.w[0] !== letter && (L > 1 || w.w[0] !== other));
        const WANT = Math.max(2, Math.min(kind.want, mine.length));

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
          const rest = UI.shuffle(notMine).slice(0, kind.size - wanted.length);
          const items = UI.shuffle([...wanted.map(w => ({ w, mine: true })), ...rest.map(w => ({ w, mine: false }))]);
          left = wanted.length;

          bag.replaceChildren(
            UI.el('span', { class: 'emoji bw-bag-pic', text: BAG[letter] }),
            UI.el('span', { class: 'bw-bag-text' },
              UI.el('span', { class: `letter bw-bag-letter is-${letter}`, text: UI.showLetter(letter) }),
              UI.el('span', { class: 'bw-bag-how', text: `find ${left}` })));
          UI.replayClass(bag, 'pop-in');

          board.className = `bw-board size-${kind.size}`;
          board.replaceChildren(...items.map((item, i) => {
            const tile = UI.el('button', {
              class: 'bw-word pop-in', style: `animation-delay:${0.04 + i * 0.03}s`, 'aria-label': item.w.w,
            },
              UI.el('span', { class: 'emoji', text: item.w.e }),
              UI.el('span', { class: 'letter', text: UI.showLetter(item.w.w) }));
            tile.addEventListener('click', () => tap(tile, item));
            return tile;
          }));
          ask();
        }

        function ask() {
          return Sound.say(`Find the ${kind.say} that start with`, 150, { sound: letter }, 250,
            `The ${colour} letter. ${Sound.letterName(letter)}.`);
        }

        function tap(tile, item) {
          if (locked || tile.disabled) return;

          if (!item.mine) {
            Sound.sfx('wrong');
            UI.replayClass(tile, 'shake');
            Sound.say(`${item.w.w}.`, 150, 'That starts with', { sound: firstSound(item.w.w) }, 300,
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
          const spoken = Sound.say('You found them all!', 250,
            ...found.flatMap(w => [w.w, 120]), 150, `All starting with ${Sound.letterName(letter)}.`,
            250, UI.pick(UI.PRAISE));
          api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1400);
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
