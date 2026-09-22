// Rhyme Time: which picture rhymes? From level 4: which one does NOT rhyme?
App.register({
  id: 'rhymes',
  name: 'Rhyme Time',
  emoji: '🎵',
  color: '#f15bb5',
  levels: ['Choose from 2 pictures', 'Choose from 3 pictures', 'Choose from 4 pictures', 'Find the odd one out', 'Odd one out: say it yourself'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const oddOneOut = L >= 4;
    const readOptions = L !== 5;
    const OPTIONS = oddOneOut ? 4 : L + 1;
    let round = 0;
    let lastGroup = -1;
    let target = null;   // picture at the top (rhyme levels)
    let answer = null;   // the right picture to tap
    let rhymers = [];    // the three that rhyme (odd-one-out levels)
    let options = [];
    let nodes = [];
    let locked = false;

    const top = UI.el('button', { class: 'picture-card', 'aria-label': 'Hear it again', onclick: () => replay() });
    const choices = UI.el('div', { class: `choices count-${OPTIONS}` });
    stage.append(top, choices);

    const highlight = node => nodes.forEach(n => n.classList.toggle('speaking', n === node));

    function pickGroup(minWords) {
      const groups = DATA.rhymes.map((g, i) => ({ g, i })).filter(x => x.g.words.length >= minWords && x.i !== lastGroup);
      const chosen = UI.pick(groups);
      lastGroup = chosen.i;
      return chosen.g;
    }

    function next() {
      locked = false;
      if (oddOneOut) {
        const group = pickGroup(3);
        rhymers = UI.sample(group.words, 3);
        answer = UI.pick(UI.pick(DATA.rhymes.filter(g => g.vowel !== group.vowel)).words);
        options = UI.shuffle([...rhymers, answer]);
        top.replaceChildren(UI.el('span', { class: 'emoji picture', text: '🤔' }), UI.el('span', { class: 'speaker emoji', text: '🔊' }));
      } else {
        const group = pickGroup(2);
        [target, answer] = UI.sample(group.words, 2);
        const others = UI.shuffle(DATA.rhymes.filter(g => g.vowel !== group.vowel)).slice(0, OPTIONS - 1).map(g => UI.pick(g.words));
        options = UI.shuffle([answer, ...others]);
        top.replaceChildren(UI.el('span', { class: 'emoji picture', text: target.e }), UI.el('span', { class: 'speaker emoji', text: '🔊' }));
      }
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

    const readAll = () => nodes.flatMap((n, i) => [() => highlight(n), options[i].w, 400]);

    function ask() {
      if (oddOneOut) {
        return Sound.say('Three of these rhyme.', 200, 'Which one does not rhyme?', 350,
          ...(readOptions ? readAll() : ['Say the words out loud yourself!']), () => highlight(null));
      }
      return Sound.say(`${target.w}.`, 250, `Which one rhymes with ${target.w}?`, 350, ...readAll(), () => highlight(null));
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
        const spoken = oddOneOut
          ? Sound.say(`Yes! ${answer.w} doesn't rhyme.`, 200, `${rhymers.map(r => r.w).join(', ')}.`, 150, 'They rhyme!')
          : Sound.say(`${target.w}, ${answer.w}!`, 200, `${UI.pick(UI.PRAISE)} They rhyme!`);
        api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1500);
      } else {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        if (oddOneOut) {
          const buddy = rhymers.find(r => r !== w);
          Sound.say(`${w.w}, ${buddy.w}.`, 200, 'Those two rhyme! Try again.');
        } else {
          Sound.say(`${target.w}, ${w.w}.`, 200, "Hmm, those don't rhyme. Try again!");
        }
      }
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
