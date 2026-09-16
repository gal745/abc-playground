// Rhyme Time: which picture rhymes with the one at the top?
App.register({
  id: 'rhymes',
  name: 'Rhyme Time',
  emoji: '🎵',
  color: '#f15bb5',

  create(stage, api) {
    const GOAL = 5;
    let round = 0;
    let lastGroup = -1;
    let target = null;
    let answer = null;
    let options = [];
    let nodes = [];
    let locked = false;

    const top = UI.el('button', { class: 'picture-card', 'aria-label': 'Hear it again', onclick: () => replay() });
    const choices = UI.el('div', { class: 'choices' });
    stage.append(top, choices);

    const highlight = node => nodes.forEach(n => n.classList.toggle('speaking', n === node));

    function next() {
      locked = false;
      let gi;
      do { gi = UI.rand(DATA.rhymes.length); } while (gi === lastGroup);
      lastGroup = gi;
      const group = DATA.rhymes[gi];
      [target, answer] = UI.sample(group.words, 2);
      const others = UI.shuffle(DATA.rhymes.filter(g => g.vowel !== group.vowel)).slice(0, 2).map(g => UI.pick(g.words));
      options = UI.shuffle([answer, ...others]);

      top.replaceChildren(
        UI.el('span', { class: 'emoji picture', text: target.e }),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
      UI.replayClass(top, 'pop-in');

      nodes = options.map((w, i) => {
        const btn = UI.el('button', { class: 'pic-btn pop-in', style: `animation-delay:${0.1 + i * 0.08}s`, 'aria-label': w.w },
          UI.el('span', { class: 'emoji', text: w.e }));
        btn.addEventListener('click', () => choose(btn, w));
        return btn;
      });
      choices.replaceChildren(...nodes);
      ask();
    }

    function ask() {
      return Sound.say(
        `${target.w}.`, 250, `Which one rhymes with ${target.w}?`, 350,
        ...nodes.flatMap((n, i) => [() => highlight(n), options[i].w, 400]),
        () => highlight(null)
      );
    }

    function replay() {
      if (!locked) ask();
    }

    function choose(btn, w) {
      if (locked || btn.disabled) return;
      highlight(null);
      if (w === answer) {
        locked = true;
        btn.classList.add('right');
        Sound.sfx('correct');
        UI.replayClass(top, 'bounce');
        round++;
        api.progress(round, GOAL);
        const spoken = Sound.say(`${target.w}, ${answer.w}!`, 200, `${UI.pick(UI.PRAISE)} They rhyme!`);
        api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1500);
      } else {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        Sound.say(`${target.w}, ${w.w}.`, 200, "Hmm, those don't rhyme. Try again!");
      }
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
