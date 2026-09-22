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

  // Approximate letter SOUNDS for text-to-speech. Recordings in audio/sounds/ replace these.
  const sounds = {
    a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fuh', g: 'guh', h: 'huh', i: 'ih',
    j: 'juh', k: 'kuh', l: 'luh', m: 'mmm', n: 'nuh', o: 'aw', p: 'puh', q: 'kwuh', r: 'ruh',
    s: 'sss', t: 'tuh', u: 'uh', v: 'vuh', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz',
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

  // Three-letter words for Build a Word.
  const cvc = parse(
    'cat 🐱, dog 🐶, pig 🐷, sun ☀️, bus 🚌, hat 🎩, bed 🛏️, box 📦, fox 🦊, ten 🔟, net 🥅, ' +
    'bat 🦇, map 🗺️, van 🚐, bug 🐛, web 🕸️, pen 🖊️, nut 🥜, rat 🐀, leg 🦵, six 6️⃣, cup 🥤, red 🔴'
  );

  // Four-letter words with blends, for the later Build a Word levels.
  const cvcc = parse(
    'frog 🐸, drum 🥁, crab 🦀, milk 🥛, tent ⛺, hand ✋, gift 🎁, flag 🚩, sled 🛷, clap 👏, lamp 🪔, swim 🏊'
  );

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

  return { letters, names, sounds, words, rhymes, cvc, cvcc, sets, soundAlikes, lookAlikes };
})();
