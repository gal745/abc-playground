// First Sounds: see a picture, tap the letter it starts with.
App.register({
  id: 'first-sounds',
  name: 'First Sounds',
  emoji: '🐶',
  color: '#4d96ff',

  create(stage, api) {
    const GOAL = 5;
    const hasWords = l => (DATA.words[l] || []).length > 0;
    let letters = UI.activeLetters().filter(hasWords);
    if (!letters.length) letters = DATA.letters.filter(hasWords);

    let round = 0;
    let answer = null;
    let word = null;
    let locked = false;

    const pic = UI.el('button', { class: 'picture-card', 'aria-label': 'Hear the word again', onclick: () => replay() });
    const choices = UI.el('div', { class: 'choices' });
    stage.append(pic, choices);

    function next() {
      locked = false;
      answer = UI.pick(letters.length > 1 ? letters.filter(l => l !== answer) : letters);
      const options = DATA.words[answer].filter(w => !word || w.w !== word.w);
      word = UI.pick(options.length ? options : DATA.words[answer]);

      pic.replaceChildren(
        UI.el('span', { class: 'emoji picture', text: word.e }),
        UI.el('span', { class: 'speaker emoji', text: '🔊' })
      );
      UI.replayClass(pic, 'pop-in');

      const opts = UI.shuffle([answer, ...UI.distractors(answer, 2, UI.activeLetters())]);
      const colors = UI.shuffle(UI.COLORS);
      choices.replaceChildren(...opts.map((l, i) => {
        const btn = UI.el('button', {
          class: 'letter-btn pop-in',
          style: `--bc:${colors[i]};animation-delay:${0.1 + i * 0.08}s`,
          'aria-label': `Letter ${l}`,
        }, UI.el('span', { class: 'letter', text: UI.showLetter(l) }));
        btn.addEventListener('click', () => choose(btn, l));
        return btn;
      }));
      ask();
    }

    function ask() {
      return Sound.say(`${word.w}!`, 300, `Which letter does ${word.w} start with?`);
    }

    function replay() {
      if (!locked) ask();
    }

    function choose(btn, l) {
      if (locked || btn.disabled) return;
      if (l === answer) {
        locked = true;
        btn.classList.add('right');
        Sound.sfx('correct');
        UI.replayClass(pic, 'bounce');
        round++;
        api.progress(round, GOAL);
        const spoken = Sound.say(UI.pick(UI.PRAISE), 150, `${word.w} starts with`, { sound: answer });
        api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1500);
      } else {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        Sound.say(`Oops! That's ${Sound.letterName(l)}.`, 250, 'Listen...', { sound: answer }, 120, { sound: answer }, 150, `${word.w}!`);
      }
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
