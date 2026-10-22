// Speech (spoken instructions, letter names and sounds) and little sound effects.
const Sound = (() => {
  const synth = window.speechSynthesis || null;
  const recordings = {}; // letter -> Audio element, or false when there is no recording
  let seq = 0;           // bumps whenever speech is interrupted, so old sequences stop
  let stopCurrent = null;
  let audioCtx = null;
  let unlocked = false;
  let keepAlive = null;  // Chrome can drop utterances that get garbage collected

  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ---- choosing a voice ----
  const ACCENT_LANGS = {
    gb: ['en-gb', 'en-ie', 'en-nz', 'en-au'],
    us: ['en-us', 'en-ca'],
    au: ['en-au', 'en-nz', 'en-gb'],
  };
  const ACCENT_DEFAULT_LANG = { gb: 'en-GB', us: 'en-US', au: 'en-AU' };
  const langOf = v => v.lang.replace('_', '-').toLowerCase();
  const accent = () => (ACCENT_LANGS[Settings.get('accent')] ? Settings.get('accent') : 'gb');

  function englishVoices() {
    if (!synth) return [];
    return synth.getVoices().filter(v => /^en([-_]|$)/i.test(v.lang));
  }

  // Higher is friendlier: child voices, then natural (neural) voices, then good phone voices.
  function quality(v) {
    const n = v.name;
    let s = 0;
    if (/\b(maisie|ana)\b/i.test(n)) s += 120;
    if (/natural|neural/i.test(n)) s += 80;
    if (/enhanced|premium/i.test(n)) s += 60;
    if (/google|network/i.test(n)) s += 50;
    if (/libby|sonia|natasha|jenny|aria|emma|ava|molly|emily|karen|catherine|samantha|serena|kate|martha|tessa|moira/i.test(n)) s += 25;
    if (/multilingual/i.test(n)) s -= 10;
    if (/desktop|\b(david|zira|hazel|mark|george|susan)\b/i.test(n)) s -= 60;
    if (/\b(ryan|thomas|william|guy|andrew|brian|christopher|eric|roger|steffan|daniel|arthur|gordon|fred|alex|liam|connor|mitchell)\b/i.test(n)) s -= 10;
    return s;
  }

  // English voices for the chosen accent, best first (nearby accents if there are none).
  function voicesFor(which = accent()) {
    const all = englishVoices();
    for (const lang of ACCENT_LANGS[which] || ACCENT_LANGS.gb) {
      const list = all.filter(v => langOf(v) === lang);
      if (list.length) return list.sort((a, b) => quality(b) - quality(a));
    }
    return all.sort((a, b) => quality(b) - quality(a));
  }

  function bestVoice() {
    const chosen = Settings.get('voice');
    if (chosen) {
      const v = englishVoices().find(v => v.voiceURI === chosen);
      if (v) return v;
    }
    return voicesFor()[0] || null;
  }

  const hasNaturalVoice = () => { const v = bestVoice(); return !!v && quality(v) >= 80; };

  const rate = () => (Settings.get('rate') === 'slow' ? 0.75 : 0.95);

  function letterName(l) {
    l = l.toLowerCase();
    if (l === 'z') return accent() === 'us' ? 'zee' : 'zed';
    return DATA.names[l];
  }

  // `l` is a single letter, or a pair of letters that make one sound: sh, oo, ee…
  function soundText(l) {
    const mine = (Settings.get('spellings') || {})[l];
    if (mine) return mine;
    if (l === 'o' && accent() === 'us') return 'ah';
    return DATA.sounds[l] || DATA.pairSounds[l] || l;
  }

  function speakOne(text) {
    return new Promise(resolve => {
      if (!synth || !text) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const v = bestVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = ACCENT_DEFAULT_LANG[accent()];
      u.rate = rate();
      // A slightly brighter voice sounds friendlier, but shifting the pitch far makes a
      // synthetic voice sound more synthetic still, so keep the change small.
      const q = v ? quality(v) : 0;
      u.pitch = q >= 120 ? 1 : q >= 80 ? 1.05 : 1.1;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(guard);
        if (stopCurrent === finish) stopCurrent = null;
        resolve();
      };
      const guard = setTimeout(finish, 3000 + text.length * 200);
      u.onend = finish;
      u.onerror = finish;
      stopCurrent = finish;
      keepAlive = u;
      synth.speak(u);
    });
  }

  // Plays audio/sounds/<letter>.mp3 if it exists. Resolves true if it played.
  function playRecording(l) {
    return new Promise(resolve => {
      const a = recordings[l] || new Audio(`audio/sounds/${l}.mp3`);
      let finished = false;
      let started = false;
      let startGuard = null;
      let guard = null;
      const end = played => {
        if (finished) return;
        finished = true;
        clearTimeout(startGuard);
        clearTimeout(guard);
        a.onended = a.onerror = a.onplaying = null;
        if (stopCurrent === stop) stopCurrent = null;
        resolve(played);
      };
      // interrupted: it only counts as played if it had actually started
      const stop = () => { a.pause(); end(started); };
      // A missing or stalled recording must not leave the child in silence: if nothing is
      // playing after a moment, give up and let the computer voice say the sound instead.
      startGuard = setTimeout(() => { if (!started) { a.pause(); end(false); } }, 900);
      guard = setTimeout(stop, 5000);
      a.onplaying = () => { started = true; };
      a.onended = () => end(true);
      a.onerror = () => { recordings[l] = false; end(false); };
      stopCurrent = stop;
      try { a.currentTime = 0; } catch (e) { /* not loaded yet */ }
      a.play().then(() => { recordings[l] = a; }).catch(err => {
        if (finished) return;
        if (!err || err.name !== 'NotAllowedError') recordings[l] = false;
        end(false);
      });
    });
  }

  async function letterSound(l, my) {
    l = l.toLowerCase();
    if (recordings[l] !== false) {
      const played = await playRecording(l);
      if (played || my !== seq) return;
    }
    await speakOne(soundText(l));
  }

  function stop() {
    seq++;
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    if (stopCurrent) { const s = stopCurrent; stopCurrent = null; s(); }
  }

  // say('Find', { sound: 'b' }, 300, { name: 'b' }, () => highlight())
  // strings are spoken, numbers are pauses (ms), functions run in order.
  // Resolves true when finished, false if something else started talking.
  async function say(...parts) {
    const busy = synth && (synth.speaking || synth.pending);
    stop();
    const my = seq;
    if (busy) await wait(120);
    for (const p of parts.flat()) {
      if (my !== seq) return false;
      if (p == null || p === '') continue;
      if (typeof p === 'number') await wait(Settings.get('rate') === 'slow' ? p * 1.4 : p);
      else if (typeof p === 'function') p();
      else if (typeof p === 'string') await speakOne(p);
      else if (p.sound) await letterSound(p.sound, my);
      else if (p.name) await speakOne(letterName(p.name));
    }
    return my === seq;
  }

  // ---- soft, toy-like sound effects ----
  function ctx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // a glockenspiel-like bell note
  function bell(freq, start = 0, dur = 0.6, vol = 0.1) {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime + start;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(c.destination);
    [[1, 1], [2.76, 0.22], [5.4, 0.06]].forEach(([ratio, amp]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / ratio);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  // a smooth sliding note (bubbles, boings, swishes)
  function glide(from, to, start = 0, dur = 0.15, vol = 0.12) {
    const c = ctx();
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const effects = {
    tap: () => bell(1320, 0, 0.25, 0.05),
    pop: () => { glide(280, 1200, 0, 0.1, 0.2); bell(1760, 0.04, 0.3, 0.04); },
    correct: () => { bell(1047, 0, 0.5); bell(1319, 0.09, 0.5); bell(1568, 0.18, 0.8); },
    wrong: () => { glide(440, 250, 0, 0.3, 0.09); glide(330, 200, 0.16, 0.3, 0.06); },
    flip: () => glide(500, 950, 0, 0.09, 0.06),
    win: () => {
      [1047, 1319, 1568, 2093].forEach((f, i) => bell(f, i * 0.11, 0.7, 0.09));
      [2637, 3136, 2349, 3520].forEach((f, i) => bell(f, 0.5 + i * 0.07, 0.4, 0.03));
    },
  };

  function sfx(name) {
    try { effects[name] && effects[name](); } catch (e) { /* audio not available */ }
  }

  // Browsers only allow sound after the first tap.
  function unlock() {
    ctx();
    if (unlocked || !synth) return;
    unlocked = true;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  }

  function onVoices(cb) {
    if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', cb);
  }
  if (synth) synth.getVoices();

  return { say, stop, sfx, unlock, voicesFor, hasNaturalVoice, onVoices, letterName, soundText };
})();
