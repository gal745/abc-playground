// b or d? The two letters children mix up most: same ball, same stick, different way round.
// A word is missing one of them, and the choice is always the same two, so the only question
// each time is which way the letter faces. The bed card stays on screen as the reminder:
// b at the front of "bed", d at the back, and a bed is the shape of the two letters together.
App.register({
  id: 'bord',
  name: 'b or d?',
  emoji: '🛏️',
  color: '#f15bb5',
  levels: ['At the start', 'At the end', 'Start or end', 'Read it yourself', 'Listen for it'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const quiet = L === 4;        // nothing is said: the picture is the only clue
    const listen = L === 5;       // nothing is shown: the word is the only clue

    const chunksOf = w => (w.c || [...w.w]);
    const pairWords = [...DATA.soundPairs, ...DATA.morePairs].flatMap(g => g.words);
    const every = [...DATA.cvc, ...DATA.cvcc, ...pairWords]
      .filter(w => w.e && w.w.length <= 5)
      .map(w => ({ ...w, c: chunksOf(w) }));

    const starts = every.filter(w => 'bd'.includes(w.w[0]));
    const ends = every.filter(w => 'bd'.includes(w.w[w.w.length - 1]));
    const list = L === 1 ? starts : L === 2 ? ends : [...starts, ...ends];

    // which letter is blanked out: the b or d at the start, or the one at the end
    const spotIn = w => (L === 2 || (L >= 3 && w.w[0] !== 'b' && w.w[0] !== 'd')
      ? w.w.length - 1
      : 0);

    const KEY = { b: (DATA.words.b || [])[0], d: (DATA.words.d || [])[0] };
    // b is blue - b for blue - and d is red. The colour is the thing a child catches first,
    // long before the shape, so it is on the letters, the buttons and the bed.
    const DOT = { b: '🔵', d: '🔴' };
    const COLOUR = { b: 'blue', d: 'red' };

    let queue = [];
    let item = null;
    let spot = 0;
    let want = 'b';
    let round = 0;
    let locked = false;
    let wrongHere = 0;

    const pic = UI.el('div', { class: 'picture-card bd-pic' });
    const slots = UI.el('div', { class: 'bd-word' });
    const choices = UI.el('div', { class: 'choices bd-choices' });

    // the reminder, always there: b at the front of bed, d at the back
    const bed = UI.el('button', { class: 'bd-bed', 'aria-label': 'The bed trick' },
      UI.el('span', { class: 'emoji', text: '🛏️' }),
      UI.el('span', { class: 'letter bd-bed-word' },
        UI.el('span', { class: 'bd-b', text: 'b' }),
        UI.el('span', { text: 'e' }),
        UI.el('span', { class: 'bd-d', text: 'd' })));
    bed.addEventListener('click', () => trick());
    stage.append(pic, slots, choices, bed);

    function trick() {
      return Sound.say('b is blue.', 250, 'd is red.', 350,
        'Think of the word bed.', 300, 'The blue b is at the front,', 200, 'and the red d is at the back!');
    }

    function next() {
      locked = false;
      wrongHere = 0;
      if (!queue.length) queue = UI.shuffle(list);
      item = queue.pop();
      spot = spotIn(item);
      want = item.w[spot];

      pic.replaceChildren(UI.el('span', { class: 'emoji picture', text: listen ? '👂' : item.e }));
      UI.replayClass(pic, 'pop-in');

      slots.replaceChildren(...[...item.w].map((l, i) => (i === spot
        ? UI.el('span', { class: 'bd-gap', id: 'bdGap' })
        : UI.el('span', { class: `letter bd-letter${'bd'.includes(l) ? ` is-${l}` : ''}`, text: UI.showLetter(l) }))));

      choices.replaceChildren(...UI.shuffle(['b', 'd']).map(letter => {
        const btn = UI.el('button', { class: `bd-btn is-${letter} pop-in`, 'aria-label': `the ${COLOUR[letter]} letter ${letter}` },
          UI.el('span', { class: 'letter bd-big', text: letter }),
          UI.el('span', { class: 'emoji bd-kw', text: DOT[letter] }));
        btn.addEventListener('click', () => choose(btn, letter));
        return btn;
      }));
      ask();
    }

    function ask() {
      if (listen) return Sound.say('Listen!', 250, `${item.w}.`, 300, 'Is it b or d?');
      if (quiet) return Sound.say(round === 0 ? 'Read it yourself. Which letter is missing, b or d?' : 'Which letter is missing?');
      const where = spot === 0 ? 'start with' : 'end with';
      return Sound.say(`${item.w}.`, 300, `Does ${item.w} ${where} b, or d?`);
    }

    function choose(btn, letter) {
      if (locked || btn.disabled) return;

      if (letter !== want) {
        // with only two letters to choose from, a wrong one is not taken away: they have to
        // look again and pick, which is the whole exercise
        Sound.sfx('wrong');
        UI.replayClass(btn, 'shake');
        UI.replayClass(bed, 'bounce');
        wrongHere++;
        const kw = KEY[letter];
        const named = `That is the ${COLOUR[letter]} one, ${Sound.letterName(letter)}${kw ? `, like ${kw.w}.` : '.'}`;
        const parts = [named, 300];
        if (wrongHere === 1) parts.push('Look at the bed:', 200, 'blue b at the front,', 150, 'red d at the back.');
        else parts.push('Try the', COLOUR[want], 'one,', { name: want }, 200, `for ${item.w}.`);
        Sound.say(...parts);
        // after a second slip, the right letter gives itself a nudge
        if (wrongHere >= 2) {
          const other = [...choices.children].find(b => b !== btn);
          if (other) other.classList.add('hint');
        }
        return;
      }

      locked = true;
      Sound.sfx('correct');
      choices.querySelectorAll('button').forEach(b => { b.disabled = true; });
      btn.classList.add('right');
      const gap = document.getElementById('bdGap');
      UI.flyTo(btn.firstChild, gap, () => {
        gap.replaceChildren(UI.el('span', { class: `letter bd-letter in is-${want}`, text: UI.showLetter(want) }));
        gap.classList.add('filled');
        UI.replayClass(slots, 'bounce');
      });
      if (listen) pic.replaceChildren(UI.el('span', { class: 'emoji picture pop-in', text: item.e }));

      round++;
      api.progress(round, GOAL);
      const parts = [600, `Yes! ${Sound.letterName(want)}.`, 250];
      item.c.forEach(bit => parts.push({ sound: bit }, 110));
      parts.push(150, `${item.w}!`, 250, UI.pick(UI.PRAISE));
      api.after(Sound.say(...parts), () => (round >= GOAL ? api.win() : next()), 1800);
    }

    api.progress(0, GOAL);
    next();

    return { replay: ask };
  },
});
