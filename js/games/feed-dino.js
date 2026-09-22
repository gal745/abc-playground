// Feed the Dino: hear a sound, feed the dino a picture that starts with it.
App.register({
  id: 'dino',
  name: 'Feed the Dino',
  emoji: '🦖',
  color: '#6a994e',
  levels: ['2 foods, see the letter', '3 foods', '4 foods', 'Listen for the sound', 'Find 2 foods'],

  create(stage, api) {
    const L = api.level;
    const GOAL = L === 5 ? 4 : 5;
    const CHOICES = [2, 3, 4, 4, 5][L - 1];
    const NEED = L === 5 ? 2 : 1;   // right pictures to find each round
    const listenOnly = L === 4;
    const active = UI.activeLetters();
    const enough = l => (DATA.words[l] || []).length >= NEED;
    let letters = active.filter(enough);
    if (!letters.length) letters = DATA.letters.filter(enough);

    let round = 0;
    let target = null;
    let fed = 0;
    let locked = false;

    const dinoBody = UI.el('span', { class: 'dino-body emoji', text: '🦖' });
    const bubble = UI.el('span', { class: 'dino-bubble' });
    const dino = UI.el('button', { class: 'dino', 'aria-label': 'Hear it again', onclick: () => replay() }, dinoBody, bubble);
    const choices = UI.el('div', { class: `choices${CHOICES >= 4 ? ' count-4' : ''}` });
    stage.append(dino, choices);

    function next() {
      locked = false;
      fed = 0;
      target = UI.pick(letters.length > 1 ? letters.filter(l => l !== target) : letters);
      bubble.replaceChildren(listenOnly
        ? UI.el('span', { class: 'emoji', text: '👂' })
        : UI.el('span', { class: 'letter', text: UI.showLetter(target) }));
      UI.replayClass(dino, 'pop-in');

      const good = UI.sample(DATA.words[target], NEED).map(w => ({ ...w, l: target }));
      const bad = UI.distractors(target, CHOICES + 4, active)
        .filter(l => (DATA.words[l] || []).length)
        .slice(0, CHOICES - NEED)
        .map(l => ({ ...UI.pick(DATA.words[l]), l }));
      const foods = UI.shuffle([...good, ...bad]);

      choices.replaceChildren(...foods.map((f, i) => {
        const btn = UI.el('button', { class: 'pic-btn pop-in', style: `animation-delay:${0.1 + i * 0.07}s`, 'aria-label': f.w },
          UI.el('span', { class: 'emoji', text: f.e }));
        btn.addEventListener('click', () => choose(btn, f));
        return btn;
      }));
      ask();
    }

    function ask() {
      return Sound.say(
        "I'm hungry!", 200,
        NEED === 2 ? 'Feed me two things that start with' : 'Feed me something that starts with',
        { sound: target }, 300, listenOnly ? { sound: target } : null
      );
    }

    function replay() {
      if (!locked) ask();
    }

    function choose(btn, f) {
      if (locked || btn.disabled) return;
      if (f.l === target) {
        btn.disabled = true;
        Sound.sfx('correct');
        UI.flyTo(btn, dinoBody, () => { UI.replayClass(dinoBody, 'chomp'); Sound.sfx('pop'); });
        btn.classList.add('eaten');
        fed++;
        if (fed < NEED) {
          Sound.say(`Yum! ${f.w}!`, 200, 'One more, please!');
          return;
        }
        locked = true;
        round++;
        api.progress(round, GOAL);
        const spoken = Sound.say(`Yum yum! ${f.w}!`, 200, `${f.w} starts with`, { sound: target });
        api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1600);
      } else {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        UI.replayClass(dinoBody, 'wobble');
        Sound.say(`Yuck! ${f.w} starts with`, { sound: f.l }, 250, 'I want', { sound: target });
      }
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
