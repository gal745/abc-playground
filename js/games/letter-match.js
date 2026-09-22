// Letter Match: a memory game pairing capital and small letters (or, at level 5, letters and pictures).
App.register({
  id: 'match',
  name: 'Letter Match',
  emoji: '🃏',
  color: '#9b5de5',
  levels: ['6 cards', '8 cards', '12 cards', '16 cards', 'Letters and pictures'],

  create(stage, api) {
    const L = api.level;
    const pairs = [3, 4, 6, 8, 6][L - 1];
    const pictures = L === 5;
    const cols = pairs === 3 ? 3 : 4;
    const rows = Math.ceil((pairs * 2) / cols);
    const hasWords = l => (DATA.words[l] || []).length > 0;
    const usable = l => !pictures || hasWords(l);
    let chosen = UI.sample(UI.activeLetters().filter(usable), pairs);
    if (chosen.length < pairs) {
      chosen = chosen.concat(UI.sample(DATA.letters.filter(l => usable(l) && !chosen.includes(l)), pairs - chosen.length));
    }
    const cards = UI.shuffle(chosen.flatMap(l => {
      if (!pictures) return [{ l, kind: 'upper', face: l.toUpperCase() }, { l, kind: 'lower', face: l }];
      const w = UI.pick(DATA.words[l]);
      return [{ l, kind: 'letter', face: UI.showLetter(l) }, { l, kind: 'pic', face: w.e, word: w.w }];
    }));
    const inks = ['#e63946', '#1d70d6', '#7b2cbf', '#d6246e', '#e76f00', '#1f8a70'];

    const grid = UI.el('div', { class: 'match-grid', style: `--rows:${rows};--cols:${cols}` });
    stage.append(grid);

    let open = [];
    let matched = 0;
    let lock = false;

    cards.forEach((c, i) => {
      const front = c.kind === 'pic'
        ? UI.el('span', { class: 'card-front' }, UI.el('span', { class: 'emoji card-pic', text: c.face }))
        : UI.el('span', { class: 'card-front', style: `color:${UI.pick(inks)}` }, UI.el('span', { class: 'letter', text: c.face }));
      c.node = UI.el('button', { class: 'card', style: `--d:${i * 0.04}s`, 'aria-label': 'Card, face down' },
        UI.el('span', { class: 'card-inner' },
          UI.el('span', { class: 'card-back' }, UI.el('span', { class: 'emoji', text: '⭐' })),
          front));
      c.node.addEventListener('click', () => flip(c));
      grid.append(c.node);
    });

    const instructions = () => (pictures
      ? Sound.say("Let's play a matching game!", 200, 'Find a letter, and a picture that starts with its sound.')
      : Sound.say("Let's play a matching game!", 200, 'Turn over two cards, and find a big letter and its little letter.'));

    const spoken = c => (c.kind === 'pic' ? c.word : Sound.letterName(c.l));

    function flip(c) {
      if (lock || c.open) return;
      c.open = true;
      c.node.classList.add('flipped');
      c.node.setAttribute('aria-label', c.kind === 'pic' ? c.word : `Letter ${c.face}`);
      Sound.sfx('flip');
      open.push(c);
      if (open.length < 2) {
        Sound.say(spoken(c));
        return;
      }

      const [a, b] = open;
      open = [];
      if (a.l === b.l && a.kind !== b.kind) {
        matched++;
        const name = Sound.letterName(c.l);
        const picCard = [a, b].find(x => x.kind === 'pic');
        const talk = picCard
          ? Sound.say(spoken(c), 250, `${picCard.word} starts with`, { sound: c.l })
          : Sound.say(name, 250, `Big ${name}, little ${name}!`, 150, { sound: c.l });
        api.later(() => {
          a.node.classList.add('done');
          b.node.classList.add('done');
          Sound.sfx('correct');
          api.progress(matched, pairs);
        }, 450);
        if (matched === pairs) api.after(talk, () => api.win(), 1600);
      } else {
        lock = true;
        Sound.say(spoken(c));
        api.later(() => {
          [a, b].forEach(x => {
            x.open = false;
            x.node.classList.remove('flipped');
            x.node.setAttribute('aria-label', 'Card, face down');
          });
          lock = false;
        }, 1400);
      }
    }

    api.progress(0, pairs);
    instructions();

    return { replay: instructions };
  },
});
