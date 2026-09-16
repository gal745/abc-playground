// Small helpers shared by all games.
const UI = (() => {
  const COLORS = ['#ff5c5c', '#4d96ff', '#9b5de5', '#f15bb5', '#f77f00', '#2a9d8f'];
  const BALLOON_COLORS = ['#ff5c5c', '#4d96ff', '#9b5de5', '#f15bb5', '#ff8c1a', '#2ec4b6', '#43aa8b'];
  const PRAISE = ['Yay!', 'Woohoo!', 'Well done!', 'Brilliant!', 'You did it!', 'Super star!'];

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'style') node.style.cssText = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null && c !== '') node.append(c);
    return node;
  }

  const rand = n => Math.floor(Math.random() * n);
  const pick = list => list[rand(list.length)];
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const sample = (list, n) => shuffle(list).slice(0, n);

  // Restart a CSS animation class on an element.
  function replayClass(node, cls) {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    node.addEventListener('animationend', () => node.classList.remove(cls), { once: true });
  }

  const showLetter = l => (Settings.get('letterCase') === 'upper' ? l.toUpperCase() : l);

  function activeLetters() {
    const chosen = Settings.get('letters').filter(l => DATA.letters.includes(l));
    return chosen.length ? chosen : DATA.letters.slice();
  }

  const sameSound = (a, b) => a === b || DATA.soundAlikes.some(g => g.includes(a) && g.includes(b));

  // `n` wrong-answer letters for `target`, taken from `pool` first, then from the whole alphabet.
  function distractors(target, n, pool) {
    const ok = l => !sameSound(l, target);
    let out = shuffle(pool.filter(ok)).slice(0, n);
    if (out.length < n) {
      out = out.concat(shuffle(DATA.letters.filter(l => ok(l) && !out.includes(l))).slice(0, n - out.length));
    }
    return out;
  }

  // Animate a copy of `from` flying onto `to`, then call done().
  function flyTo(from, to, done) {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const ghost = from.cloneNode(true);
    Object.assign(ghost.style, {
      position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
      margin: '0', zIndex: '50', animation: 'none', visibility: 'visible', pointerEvents: 'none',
      transition: 'transform .38s cubic-bezier(.3,1.3,.5,1)',
    });
    document.body.append(ghost);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const scale = Math.min(b.width / a.width, b.height / a.height);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    }));
    setTimeout(() => { ghost.remove(); if (done) done(); }, 400);
  }

  let confettiFrame = 0;
  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.getElementById('confetti');
    const c = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = innerWidth, H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bits = Array.from({ length: 170 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.4,
      y: H * 0.4,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 15 - 5,
      w: 7 + Math.random() * 8,
      h: 9 + Math.random() * 10,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      color: pick([...BALLOON_COLORS, '#ffd93d']),
    }));
    const start = performance.now();
    cancelAnimationFrame(confettiFrame);
    const frame = t => {
      c.clearRect(0, 0, W, H);
      for (const p of bits) {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.r);
        c.fillStyle = p.color;
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c.restore();
      }
      if (t - start < 3500) confettiFrame = requestAnimationFrame(frame);
      else c.clearRect(0, 0, W, H);
    };
    confettiFrame = requestAnimationFrame(frame);
  }

  return {
    COLORS, BALLOON_COLORS, PRAISE,
    el, rand, pick, shuffle, sample, replayClass, showLetter, activeLetters, distractors, flyTo, confetti,
  };
})();
