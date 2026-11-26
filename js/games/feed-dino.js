// Feed the Dino: hear a sound, feed the dino a picture that starts with it.
//
// The first five levels are the first sound of a word, which is where everyone starts. The three
// after them are the same game with the question moved: two to find with nothing shown but the
// sound, then a two-letter sound at the front of a word (sh, ch, th), then the sound a word ENDS
// with - the hardest of the three, because the end of a word is the part a child hears last and
// listens to least.
App.register({
  id: 'dino',
  name: 'Feed the Dino',
  emoji: '🦖',
  color: '#6a994e',
  levels: ['2 foods, see the letter', '3 foods', '4 foods', 'Listen for the sound', 'Find 2 foods',
    'Find 2, listening', 'Starts with sh, ch or th', 'The sound at the END'],

  create(stage, api) {
    const L = api.level;
    const PLAN = [
      { choices: 2, need: 1, listen: false, pool: 'first' },
      { choices: 3, need: 1, listen: false, pool: 'first' },
      { choices: 4, need: 1, listen: false, pool: 'first' },
      { choices: 4, need: 1, listen: true, pool: 'first' },
      { choices: 5, need: 2, listen: false, pool: 'first' },
      { choices: 5, need: 2, listen: true, pool: 'first' },
      { choices: 4, need: 2, listen: false, pool: 'pairs' },
      { choices: 4, need: 1, listen: false, pool: 'last' },
    ][L - 1];
    const GOAL = PLAN.need > 1 ? 4 : 5;
    const CHOICES = PLAN.choices;
    const NEED = PLAN.need;
    const listenOnly = PLAN.listen;
    const active = UI.activeLetters();

    // Where the words come from, and what counts as a right answer, depends on the question.
    // Every word here has a picture, because the whole game is pictures.
    const chunked = [...DATA.cvc, ...DATA.cvcc, ...DATA.soundPairs.flatMap(g => g.words),
      ...DATA.morePairs.flatMap(g => g.words)].filter(w => w.e);
    const bitsOf = w => (w.c || [...w.w]);
    const groups = {};
    if (PLAN.pool === 'first') {
      DATA.letters.forEach(l => { if ((DATA.words[l] || []).length) groups[l] = DATA.words[l]; });
    } else if (PLAN.pool === 'pairs') {
      ['sh', 'ch', 'th'].forEach(p => {
        const got = chunked.filter(w => bitsOf(w)[0] === p);
        if (got.length >= NEED) groups[p] = got;
      });
    } else {
      chunked.forEach(w => {
        const end = bitsOf(w)[bitsOf(w).length - 1];
        (groups[end] ||= []).push(w);
      });
      Object.keys(groups).forEach(k => { if (groups[k].length < NEED + 1) delete groups[k]; });
    }
    const enough = l => (groups[l] || []).length >= NEED;
    let letters = (PLAN.pool === 'first' ? active : Object.keys(groups)).filter(enough);
    if (!letters.length) letters = Object.keys(groups).filter(enough);

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

      const good = UI.sample(groups[target], NEED).map(w => ({ ...w, l: target }));
      // nothing the dino should refuse may quietly be a right answer too
      const mine = w => (PLAN.pool === 'first' ? w.w[0] === target
        : PLAN.pool === 'pairs' ? bitsOf(w)[0] === target
          : bitsOf(w)[bitsOf(w).length - 1] === target);
      let bad;
      if (PLAN.pool === 'first') {
        bad = UI.distractors(target, CHOICES + 4, active)
          .filter(l => (groups[l] || []).length)
          .slice(0, CHOICES - NEED)
          .map(l => ({ ...UI.pick(groups[l]), l }));
      } else {
        const seen = new Set(good.map(w => w.e));
        bad = UI.shuffle(chunked.filter(w => !mine(w) && !seen.has(w.e)))
          .filter(w => (seen.has(w.e) ? false : seen.add(w.e)))
          .slice(0, CHOICES - NEED)
          .map(w => ({ ...w, l: PLAN.pool === 'pairs' ? bitsOf(w)[0] : bitsOf(w)[bitsOf(w).length - 1] }));
      }
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
      const what = PLAN.pool === 'last'
        ? 'Feed me something that ENDS with'
        : NEED === 2 ? 'Feed me two things that start with' : 'Feed me something that starts with';
      return Sound.say("I'm hungry!", 200, what, { sound: target }, 300, { sound: target });
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
        const spoken = Sound.say(`Yum yum! ${f.w}!`, 200,
          PLAN.pool === 'last' ? `${f.w} ends with` : `${f.w} starts with`, { sound: target });
        api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1600);
      } else {
        btn.disabled = true;
        btn.classList.add('wrong');
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        UI.replayClass(dinoBody, 'wobble');
        Sound.say(PLAN.pool === 'last' ? `Yuck! ${f.w} ends with` : `Yuck! ${f.w} starts with`,
          { sound: f.l }, 250, 'I want', { sound: target });
      }
    }

    api.progress(0, GOAL);
    next();

    return { replay };
  },
});
