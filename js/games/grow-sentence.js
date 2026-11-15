// Grow a Sentence: a whole sentence at once is too much, so it arrives a piece at a time.
// Read "a cat", tap for more, read "a cat on a bed". Nothing can be got wrong while it grows -
// the question comes at the end, when the sentence is whole and has been read in pieces.
App.register({
  id: 'grow',
  name: 'Grow a Sentence',
  emoji: '🌱',
  color: '#43aa8b',
  levels: ['Two pieces', 'Three pieces', 'Three pieces, three pictures', 'One word at a time', 'Read it in one'],

  create(stage, api) {
    const GOAL = 4;
    const L = api.level;
    const PICS = [2, 2, 3, 3, 3][L - 1];
    const byWord = L === 4;       // the sentence grows one word at a time
    const whole = L === 5;        // no growing: the sentence is there from the start

    const all = DATA.sentences.map(s => {
      const words = s.split(' ');
      return { s, words, pics: words.filter(w => DATA.pics[w]).map(w => DATA.pics[w]) };
    }).filter(x => x.pics.length === 2);

    let item = null;
    let steps = [];
    let at = 0;
    let round = 0;
    let locked = false;

    const line = UI.el('button', { class: 'grow-line', 'aria-label': 'Hear it again', onclick: () => readSoFar() });
    const more = UI.el('button', { class: 'grow-more' }, 'and then… ⬇');
    const choices = UI.el('div', { class: 'choices sentence-choices' });
    stage.append(line, more, choices);
    more.addEventListener('click', () => grow());

    // "a cat on a bed" -> ["a cat", "a cat on a bed"], or one word at a time
    function pieces(words) {
      if (whole) return [words.join(' ')];
      if (byWord) return words.map((_, i) => words.slice(0, i + 1).join(' '));
      const joiner = words.findIndex(w => ['in', 'on', 'up', 'at'].includes(w));
      const cut = joiner > 0 ? joiner : 2;
      if (L === 1) return [words.slice(0, cut).join(' '), words.join(' ')];
      return [words.slice(0, cut).join(' '), words.slice(0, cut + 2).join(' '), words.join(' ')];
    }

    function next() {
      locked = false;
      at = 0;
      item = UI.pick(all.filter(x => !item || x.s !== item.s));
      steps = pieces(item.words);
      choices.replaceChildren();
      draw();
      Sound.say(round === 0
        ? (whole ? 'Read the whole sentence, then tap the pictures.' : 'Read the first bit, then tap for more.')
        : UI.pick(['Here we go.', 'Next one.', 'Your turn.']));
      if (steps.length === 1) askPictures();
    }

    function draw() {
      const shown = steps[at].split(' ');
      line.replaceChildren(...shown.map((w, i) => UI.el('span', {
        class: `letter grow-word${i >= (at ? steps[at - 1].split(' ').length : 0) ? ' fresh' : ''}`,
        text: UI.showLetter(w),
      })));
      UI.replayClass(line, 'bounce');
      more.hidden = at >= steps.length - 1;
    }

    function readSoFar() {
      if (!item) return;
      const bit = steps[Math.min(at, steps.length - 1)];
      return Sound.say(...bit.split(' ').flatMap(w => [w, 80]), 200, `${bit}.`);
    }

    function grow() {
      if (locked || at >= steps.length - 1) return;
      at++;
      Sound.sfx('tap');
      draw();
      const spoken = readSoFar();
      if (at >= steps.length - 1) api.after(spoken, askPictures, 900);
    }

    // the one question: which pictures is it about?
    function askPictures() {
      const wrong = UI.shuffle(all.filter(x => x.s !== item.s && x.pics.join() !== item.pics.join())).slice(0, PICS - 1);
      choices.className = `choices sentence-choices${PICS >= 4 ? ' count-4' : ''}`;
      choices.replaceChildren(...UI.shuffle([item, ...wrong]).map((x, i) => {
        const btn = UI.el('button', { class: 'pic-btn pair-pic pop-in', style: `animation-delay:${0.1 + i * 0.08}s`, 'aria-label': x.s },
          ...x.pics.map(e => UI.el('span', { class: 'emoji', text: e })));
        btn.addEventListener('click', () => choose(btn, x));
        return btn;
      }));
      Sound.say('Now tap the pictures it tells you about.');
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

    return { replay: readSoFar };
  },
});
