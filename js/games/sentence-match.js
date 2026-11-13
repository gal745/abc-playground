// Match the Sentence: a whole sentence, read by the child, and the pictures it tells you
// about. Feed the Frog puts a sentence in order; this one asks what it means. The last part of
// today's lesson, made into a game.
App.register({
  id: 'sentence',
  name: 'Match the Sentence',
  emoji: '🖼️',
  color: '#7209b7',
  levels: ['Two to choose from', 'Three to choose from', 'One word different', 'Four to choose from', 'No help: read it yourself'],

  create(stage, api) {
    const GOAL = 4;
    const L = api.level;
    const CHOICES = [2, 3, 3, 4, 3][L - 1];
    const nearMiss = L === 3;      // the wrong ones differ by a single word
    const noHelp = L === 5;        // tapping the sentence does not read it out

    // only sentences whose words all have a picture, so a choice is always two pictures
    const all = DATA.sentences.map(s => {
      const words = s.split(' ');
      return { s, words, pics: words.filter(w => DATA.pics[w]).map(w => DATA.pics[w]) };
    }).filter(x => x.pics.length === 2);

    const apart = (a, b) => a.words.filter((w, i) => b.words[i] !== w).length;

    let round = 0;
    let item = null;
    let locked = false;

    const line = UI.el('button', { class: 'sentence-card', 'aria-label': 'Read it to me', onclick: () => readIt() });
    const help = UI.el('p', { class: 'read-help' });
    const choices = UI.el('div', { class: 'choices sentence-choices' });
    stage.append(line, help, choices);

    function next() {
      locked = false;
      item = UI.pick(all.filter(x => !item || x.s !== item.s));

      const others = UI.shuffle(all.filter(x => x.s !== item.s && x.pics.join() !== item.pics.join()));
      const near = nearMiss
        ? others.slice().sort((a, b) => apart(item, a) - apart(item, b))
        : others;
      const picks = UI.shuffle([item, ...near.slice(0, CHOICES - 1)]);

      line.replaceChildren(...item.words.map(w => UI.el('span', { class: 'letter sentence-word', text: UI.showLetter(w) })));
      UI.replayClass(line, 'pop-in');
      help.textContent = noHelp ? 'Read it by yourself!' : 'Tap the words if you need help.';

      choices.className = `choices sentence-choices${CHOICES >= 4 ? ' count-4' : ''}`;
      choices.replaceChildren(...picks.map((x, i) => {
        const btn = UI.el('button', { class: 'pic-btn pair-pic pop-in', style: `animation-delay:${0.1 + i * 0.08}s`, 'aria-label': x.s },
          ...x.pics.map(e => UI.el('span', { class: 'emoji', text: e })));
        btn.addEventListener('click', () => choose(btn, x));
        return btn;
      }));
      ask();
    }

    function ask() {
      return Sound.say(round === 0
        ? 'Read the sentence, then tap the pictures it tells you about.'
        : UI.pick(['Read this one.', 'And this one.', 'What does it say?']));
    }

    // the help, when it is asked for: each word, then the whole sentence
    function readIt() {
      if (locked || !item) return;
      if (noHelp) return Sound.say('Read it by yourself! You can do it.');
      return Sound.say(...item.words.flatMap(w => [w, 80]), 200, `${item.s}!`);
    }

    function choose(btn, x) {
      if (locked || btn.disabled) return;
      if (x.s !== item.s) {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        Sound.say(`That one is ${x.s}.`, 300, 'Read it again:', 200, ...item.words.flatMap(w => [w, 80]));
        return;
      }

      locked = true;
      btn.classList.add('right');
      choices.querySelectorAll('button').forEach(b => { b.disabled = true; });
      Sound.sfx('correct');
      round++;
      api.progress(round, GOAL);
      const spoken = Sound.say(`${item.s}!`, 300, UI.pick(UI.PRAISE));
      api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1400);
    }

    api.progress(0, GOAL);
    next();

    return { replay: ask };
  },
});
