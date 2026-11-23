// Pack the Picnic and Pack your Bag: hear a sound, then choose the TWO things that start with it.
// The same job as the last level of Feed the Dino, which is the one they like, but nothing is being
// eaten and nothing is an animal - here they are packing a basket for a picnic, or a bag for the
// day out. Two right answers in a round is what makes it worth doing: the first one is a guess you
// can get lucky with, the second one is the sound.
//
// The words come from the picture bank, so they are things a child can already name, and the
// choices in a round never share a starting sound with each other.
(() => {
  // cheese starts with ch, not c - a sound can be two letters
  const soundOf = w => (['sh', 'ch', 'th'].includes(w.slice(0, 2)) ? w.slice(0, 2) : w[0]);

  const LEVELS = [
    { name: 'Two things, see the letter', choices: 4, need: 2, listen: false },
    { name: 'More to choose from', choices: 5, need: 2, listen: false },
    { name: 'Listen for the sound', choices: 5, need: 2, listen: true },
    { name: 'Six to choose from', choices: 6, need: 2, listen: false },
    { name: 'Three things, listening', choices: 6, need: 3, listen: true },
  ];

  function make({ id, name, emoji, color, sets, packed, yum }) {
    App.register({
      id,
      name,
      emoji,
      color,
      levels: LEVELS.map(l => l.name),

      create(stage, api) {
        const GOAL = 4;
        const L = LEVELS[api.level - 1];
        const NEED = L.need;

        const pool = sets.flatMap(s => DATA.picSets[s] || []);
        const groups = {};
        pool.forEach(w => { (groups[soundOf(w.w)] ||= []).push(w); });
        const targets = Object.keys(groups).filter(s => groups[s].length >= NEED);

        let target = null;
        let got = [];
        let round = 0;
        let locked = false;
        let first = true;

        const holder = UI.el('span', { class: 'emoji pack-holder', text: emoji });
        const bubble = UI.el('span', { class: 'pack-bubble' });
        const top = UI.el('button', { class: 'pack-top', 'aria-label': 'Hear it again', onclick: () => replay() }, holder, bubble);
        const list = UI.el('div', { class: 'pack-list' });
        const choices = UI.el('div', { class: 'choices count-4' });
        stage.append(top, list, choices);

        function next() {
          locked = false;
          got = [];
          list.replaceChildren();
          target = UI.pick(targets.length > 1 ? targets.filter(s => s !== target) : targets);

          bubble.replaceChildren(L.listen
            ? UI.el('span', { class: 'emoji', text: '👂' })
            : UI.el('span', { class: 'letter', text: UI.showLetter(target) }));
          UI.replayClass(top, 'pop-in');

          const good = UI.shuffle(groups[target]).slice(0, NEED);
          // every wrong one starts with a different sound from the others, and never the wanted one
          const spare = UI.shuffle(Object.keys(groups).filter(s => s !== target))
            .slice(0, L.choices - NEED)
            .map(s => UI.pick(groups[s]));
          const items = UI.shuffle([...good, ...spare]);

          choices.replaceChildren(...items.map((item, i) => {
            const btn = UI.el('button', {
              class: 'pic-btn pop-in', style: `animation-delay:${0.1 + i * 0.07}s`, 'aria-label': item.w,
            }, UI.el('span', { class: 'emoji', text: item.e }));
            btn.addEventListener('click', () => choose(btn, item));
            return btn;
          }));
          if (first) { first = false; api.later(ask, 550); } else ask();
        }

        function ask() {
          const how = NEED === 3 ? 'three things' : 'two things';
          // the sound is said twice, and on the levels that show the letter it is named as well:
          // a single short sound at the end of a sentence is the easiest thing in the world to miss
          return Sound.say(round === 0 ? `Let's pack ${packed}.` : UI.pick(['Next one.', 'Again!', 'Keep going.']),
            250, `Find ${how} that start with`, 150, { sound: target }, 350, { sound: target },
            // a pair like ch has no letter name worth saying, so it gets the sound again instead
            L.listen ? null : [250, target.length > 1 ? { sound: target } : { name: target }]);
        }

        function replay() {
          if (target) ask();
        }

        function choose(btn, item) {
          if (locked || btn.disabled) return;

          if (soundOf(item.w) !== target) {
            btn.disabled = true;
            btn.classList.add('wrong');
            Sound.sfx('wrong');
            UI.replayClass(btn, 'shake');
            UI.replayClass(holder, 'wobble');
            Sound.say(`${item.w} starts with`, { sound: soundOf(item.w) }, 250, 'We want', { sound: target });
            return;
          }

          btn.disabled = true;
          btn.classList.add('eaten');
          Sound.sfx('correct');
          got.push(item);
          UI.flyTo(btn, holder, () => {
            UI.replayClass(holder, 'bounce');
            Sound.sfx('pop');
            list.append(UI.el('span', { class: 'pack-chip pop-in' },
              UI.el('span', { class: 'emoji', text: item.e }),
              UI.el('span', { class: 'letter', text: UI.showLetter(item.w) })));
          });

          if (got.length < NEED) {
            Sound.say(`${yum} ${item.w}!`, 200, NEED - got.length === 1 ? 'One more!' : 'Keep looking!');
            return;
          }

          locked = true;
          round++;
          api.progress(round, GOAL);
          const names = got.map(x => x.w);
          const spoken = Sound.say(`${item.w}!`, 250,
            `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`, 250,
            'All starting with', { sound: target }, 250, UI.pick(UI.PRAISE));
          api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1600);
        }

        api.progress(0, GOAL);
        next();

        return { replay };
      },
    });
  }

  make({
    id: 'picnic',
    name: 'Pack the Picnic',
    emoji: '🧺',
    color: '#e76f51',
    sets: ['food'],
    packed: 'a picnic',
    yum: 'Yum!',
  });

  make({
    id: 'packbag',
    name: 'Pack your Bag',
    emoji: '🎒',
    color: '#457b9d',
    sets: ['toys', 'things'],
    packed: 'your bag',
    yum: 'In it goes!',
  });
})();
