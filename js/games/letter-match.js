// Letter Match: a memory game pairing capital and small letters.
App.register({
  id: 'match',
  name: 'Letter Match',
  emoji: '🃏',
  color: '#9b5de5',
  levels: ['6 cards', '8 cards', '12 cards'],

  create(stage, api) {
    const pairs = [3, 4, 6][api.level - 1];
    const cols = pairs === 3 ? 3 : 4;
    const rows = Math.ceil((pairs * 2) / cols);
    const pool = UI.activeLetters();
    let chosen = UI.sample(pool, pairs);
    if (chosen.length < pairs) {
      chosen = chosen.concat(UI.sample(DATA.letters.filter(l => !chosen.includes(l)), pairs - chosen.length));
    }
    const cards = UI.shuffle(chosen.flatMap(l => [{ l, face: l.toUpperCase() }, { l, face: l }]));
    const inks = ['#e63946', '#1d70d6', '#7b2cbf', '#d6246e', '#e76f00', '#1f8a70'];

    const grid = UI.el('div', { class: 'match-grid', style: `--rows:${rows};--cols:${cols}` });
    stage.append(grid);

    let open = [];
    let matched = 0;
    let lock = false;

    cards.forEach((c, i) => {
      c.node = UI.el('button', { class: 'card', style: `--d:${i * 0.05}s`, 'aria-label': 'Card, face down' },
        UI.el('span', { class: 'card-inner' },
          UI.el('span', { class: 'card-back' }, UI.el('span', { class: 'emoji', text: '⭐' })),
          UI.el('span', { class: 'card-front', style: `color:${UI.pick(inks)}` },
            UI.el('span', { class: 'letter', text: c.face }))));
      c.node.addEventListener('click', () => flip(c));
      grid.append(c.node);
    });

    const instructions = () => Sound.say("Let's play a matching game!", 200, 'Turn over two cards, and find a big letter and its little letter.');

    function flip(c) {
      if (lock || c.open) return;
      c.open = true;
      c.node.classList.add('flipped');
      c.node.setAttribute('aria-label', `Letter ${c.face}`);
      Sound.sfx('flip');
      open.push(c);
      const name = Sound.letterName(c.l);
      if (open.length < 2) {
        Sound.say(name);
        return;
      }

      const [a, b] = open;
      open = [];
      if (a.l === b.l) {
        matched++;
        const spoken = Sound.say(name, 250, `Big ${name}, little ${name}!`, 150, { sound: c.l });
        api.later(() => {
          a.node.classList.add('done');
          b.node.classList.add('done');
          Sound.sfx('correct');
          api.progress(matched, pairs);
        }, 450);
        if (matched === pairs) api.after(spoken, () => api.win(), 1600);
      } else {
        lock = true;
        Sound.say(name);
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
