// All the letters, sounds, words and pictures used by the games.
// Word lists are written as "word emoji, word emoji" to keep them easy to edit.
const DATA = (() => {
  const parse = list => list.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const i = s.indexOf(' ');
    return { w: s.slice(0, i), e: s.slice(i + 1).trim() };
  });

  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

  // Spelled so that text-to-speech voices say the letter NAME clearly.
  const names = {
    a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'eff', g: 'gee', h: 'aitch', i: 'eye',
    j: 'jay', k: 'kay', l: 'ell', m: 'em', n: 'en', o: 'oh', p: 'pee', q: 'cue', r: 'are',
    s: 'ess', t: 'tee', u: 'you', v: 'vee', w: 'double you', x: 'ex', y: 'why', z: 'zee',
  };

  // Approximate letter SOUNDS for text-to-speech. Recordings in audio/sounds/ replace these,
  // and a grown-up can change any of them on the Sound check page.
  //
  // These are spellings a voice has to read, so they must be words it cannot misread. The
  // old "-uh" endings were invented words: British voices turned "puh" into "poo" and "buh"
  // into "boo". An "-ah" ending is read the same way by every voice (bah, nah, rah, wah are
  // real words), so the consonant at the front comes out clearly. The sounds that can be
  // held on their own - mmm, sss - are written as they are hummed or hissed.
  const sounds = {
    a: 'ah', b: 'bah', c: 'kah', d: 'dah', e: 'eh', f: 'fah', g: 'gah', h: 'hah', i: 'ih',
    j: 'jah', k: 'kah', l: 'lah', m: 'mmm', n: 'nah', o: 'aw', p: 'pah', q: 'kwah', r: 'rah',
    s: 'sss', t: 'tah', u: 'uh', v: 'vah', w: 'wah', x: 'kss', y: 'yah', z: 'zah',
  };

  // Pictures that START with each letter sound. The first word is the letter's "keyword".
  const words = {
    a: parse('apple 🍎, ant 🐜, ambulance 🚑'),
    b: parse('balloon 🎈, banana 🍌, bear 🐻, bus 🚌, bee 🐝'),
    c: parse('cat 🐱, car 🚗, cake 🎂, cow 🐮, carrot 🥕'),
    d: parse('dog 🐶, duck 🦆, drum 🥁, door 🚪, dinosaur 🦕'),
    e: parse('egg 🥚, elephant 🐘'),
    f: parse('fish 🐟, frog 🐸, fox 🦊, fire 🔥, flower 🌸'),
    g: parse('goat 🐐, gift 🎁, grapes 🍇, guitar 🎸, gorilla 🦍'),
    h: parse('hat 🎩, horse 🐴, house 🏠, heart ❤️, hippo 🦛'),
    i: parse('insect 🐛'),
    j: parse('jeans 👖, juice 🧃'),
    k: parse('kite 🪁, key 🔑, king 🤴, kangaroo 🦘, koala 🐨'),
    l: parse('lion 🦁, leaf 🍃, lemon 🍋, lollipop 🍭, ladybug 🐞'),
    m: parse('moon 🌙, monkey 🐵, mouse 🐭, milk 🥛, mushroom 🍄'),
    n: parse('nose 👃, nut 🥜, net 🥅'),
    o: parse('octopus 🐙, ox 🐂, otter 🦦'),
    p: parse('pig 🐷, pizza 🍕, penguin 🐧, pear 🍐, panda 🐼'),
    q: parse('queen 👸'),
    r: parse('rabbit 🐰, rainbow 🌈, robot 🤖, rocket 🚀, ring 💍'),
    s: parse('sun ☀️, snake 🐍, star ⭐, sock 🧦, strawberry 🍓'),
    t: parse('tiger 🐯, tree 🌳, turtle 🐢, tent ⛺, tomato 🍅'),
    u: parse('umbrella ☂️'),
    v: parse('van 🚐, volcano 🌋, violin 🎻'),
    w: parse('whale 🐳, watch ⌚, web 🕸️, watermelon 🍉, wolf 🐺'),
    x: [],
    y: parse('yo-yo 🪀, yarn 🧶'),
    z: parse('zebra 🦓'),
  };

  // Rhyming families. `vowel` stops near-rhymes (e.g. sock / fox) being used as wrong answers.
  const rhyme = (vowel, list) => ({ vowel, words: parse(list) });
  const rhymes = [
    rhyme('a', 'cat 🐱, hat 🎩, bat 🦇'),
    rhyme('o', 'dog 🐶, frog 🐸'),
    rhyme('ee', 'bee 🐝, tree 🌳, key 🔑'),
    rhyme('oo', 'moon 🌙, spoon 🥄, balloon 🎈'),
    rhyme('ar', 'car 🚗, star ⭐, guitar 🎸'),
    rhyme('ay', 'cake 🎂, snake 🐍'),
    rhyme('air', 'bear 🐻, pear 🍐, chair 🪑'),
    rhyme('o', 'sock 🧦, clock ⏰'),
    rhyme('ow', 'mouse 🐭, house 🏠'),
    rhyme('oa', 'goat 🐐, boat ⛵, coat 🧥'),
    rhyme('i', 'king 🤴, ring 💍'),
    rhyme('o', 'fox 🦊, box 📦'),
    rhyme('oa', 'nose 👃, rose 🌹'),
    rhyme('ay', 'snail 🐌, whale 🐳'),
    rhyme('e', 'pen 🖊️, ten 🔟'),
    rhyme('e', 'bell 🔔, shell 🐚'),
    rhyme('igh', 'tie 👔, pie 🥧'),
    rhyme('ay', 'train 🚂, rain 🌧️'),
    rhyme('e', 'bed 🛏️, bread 🍞'),
    rhyme('igh', 'light 💡, kite 🪁'),
    rhyme('u', 'drum 🥁, thumb 👍'),
    rhyme('or', 'four 4️⃣, door 🚪'),
    rhyme('oo', 'shoe 👟, two 2️⃣'),
  ];

  // Three-letter words for Build a Word and Middle Sound.
  const cvc = parse(
    'cat 🐱, dog 🐶, pig 🐷, sun ☀️, bus 🚌, hat 🎩, bed 🛏️, box 📦, fox 🦊, ten 🔟, net 🥅, ' +
    'bat 🦇, map 🗺️, van 🚐, bug 🐛, web 🕸️, pen 🖊️, nut 🥜, rat 🐀, leg 🦵, six 6️⃣, cup 🥤, red 🔴, ' +
    'pin 📌, tin 🥫, bin 🗑️, lip 👄, log 🪵, pot 🍲, mug ☕, hen 🐔, pan 🍳, cap 🧢, jet ✈️'
  );

  // Rhyming word families for reading: the ending stays the same and the first letter changes.
  const fam = (end, list) => ({ end, words: parse(list) });
  const families = [
    fam('at', 'cat 🐱, hat 🎩, bat 🦇, rat 🐀'),
    fam('an', 'van 🚐, pan 🍳, man 👨'),
    fam('ap', 'cap 🧢, map 🗺️, tap 🚰, nap 😴'),
    fam('ug', 'bug 🐛, mug ☕, hug 🤗'),
    fam('en', 'pen 🖊️, ten 🔟, hen 🐔'),
    fam('og', 'dog 🐶, log 🪵, frog 🐸'),
    fam('ox', 'box 📦, fox 🦊, ox 🐂'),
    fam('in', 'pin 📌, bin 🗑️, tin 🥫, win 🏆'),
    fam('et', 'net 🥅, jet ✈️, wet 💦'),
    fam('ed', 'bed 🛏️, red 🔴, sled 🛷'),
    fam('un', 'sun ☀️, run 🏃'),
  ];

  // Words that are the same apart from the middle vowel: pan, pin, pen.
  const vowelSwaps = [
    parse('pan 🍳, pin 📌, pen 🖊️'),
    parse('cap 🧢, cup 🥤'),
    parse('log 🪵, leg 🦵'),
    parse('net 🥅, nut 🥜'),
    parse('ten 🔟, tin 🥫'),
    parse('bag 👜, bug 🐛'),
  ];

  // Four-letter words with blends, for the later Build a Word levels.
  const cvcc = parse(
    'frog 🐸, drum 🥁, crab 🦀, milk 🥛, tent ⛺, hand ✋, gift 🎁, flag 🚩, sled 🛷, clap 👏, lamp 🪔, swim 🏊'
  );

  // Days of the week, in order. Every name ends in "day", so that part is filled in already
  // and children only spell the beginning (`pre`).
  const days = [
    { w: 'Monday', pre: 'mon' },
    { w: 'Tuesday', pre: 'tues' },
    { w: 'Wednesday', pre: 'wednes' },
    { w: 'Thursday', pre: 'thurs' },
    { w: 'Friday', pre: 'fri' },
    { w: 'Saturday', pre: 'satur' },
    { w: 'Sunday', pre: 'sun' },
  ];

  // Letter groups in a common phonics teaching order.
  const sets = [
    { label: 'All letters', letters },
    { label: 's a t p i n', letters: [...'satpin'] },
    { label: 'c k e h r m d', letters: [...'ckehrmd'] },
    { label: 'g o u l f b', letters: [...'goulfb'] },
    { label: 'j z w v y x q', letters: [...'jzwvyxq'] },
  ];

  // Letters that make the same first sound, so they are never offered as a wrong answer for each other.
  const soundAlikes = [['c', 'k', 'q']];

  // Letters that are easy to mix up by shape, used to make later levels trickier.
  const lookAlikes = {
    a: 'eo', b: 'dpq', c: 'eo', d: 'bpq', e: 'ca', f: 't', g: 'qy', h: 'nb', i: 'lj', j: 'ig', k: 'hx', l: 'it', m: 'nw',
    n: 'mhu', o: 'ac', p: 'qbd', q: 'pdg', r: 'n', s: 'z', t: 'fl', u: 'nv', v: 'uwy', w: 'mv', x: 'k', y: 'vg', z: 's',
  };

  return { letters, names, sounds, words, rhymes, cvc, cvcc, families, vowelSwaps, days, sets, soundAlikes, lookAlikes };
})();
