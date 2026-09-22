// Trace It: trace a big letter with a finger. The game checks the child covered the letter
// without scribbling all over the box.
App.register({
  id: 'trace',
  name: 'Trace It',
  emoji: '✏️',
  color: '#0081a7',
  levels: ['Thick guide, big brush', 'Thinner brush', 'Capital letters', 'Dotted outline only', 'Faint guide'],

  create(stage, api) {
    const GOAL = 5;
    const L = api.level;
    const BRUSH = [0.12, 0.09, 0.09, 0.08, 0.08][L - 1]; // brush width, as a share of the box
    const NEED = [0.7, 0.75, 0.75, 0.78, 0.78][L - 1];   // share of the letter that must be covered
    const N = 90;                                          // size of the checking grid
    const COLOR = '#0081a7';
    const INK = '#ff8c1a';
    const letters = UI.activeLetters();
    const font = px => `700 ${px}px Andika, "Comic Sans MS", sans-serif`;

    let queue = [];
    let round = 0;
    let letter = null;
    let face = null;
    let locked = true;
    let hinted = false;
    let strokes = [];   // each stroke is a list of [x, y] points from 0 to 1
    let drawing = null;
    let size = 300;
    let glyph = null;   // grid cells inside the letter
    let glyphCount = 1;
    let near = null;    // grid cells on or close to the letter

    const canvas = UI.el('canvas', { class: 'trace-canvas', 'aria-label': 'Tracing area' });
    const box = UI.el('div', { class: 'trace-box' }, canvas);
    const clearBtn = UI.el('button', { class: 'round-btn trace-clear', 'aria-label': 'Start the letter again' }, UI.el('span', { class: 'emoji', text: '🧽' }));
    stage.append(box, clearBtn);
    const ctx = canvas.getContext('2d');

    function layout() {
      const w = stage.clientWidth - 24;
      const h = stage.clientHeight - 120;
      size = Math.max(180, Math.min(w, h, 520));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // set up the font on context c for a box of size s; returns where to draw the letter
    function placeGlyph(c, s) {
      c.font = font(s * 0.72);
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      const m = c.measureText(face);
      const up = m.actualBoundingBoxAscent || s * 0.5;
      const down = m.actualBoundingBoxDescent || 0;
      return [s / 2, s / 2 + (up - down) / 2];
    }

    function buildMask() {
      const off = document.createElement('canvas');
      off.width = N;
      off.height = N;
      const c = off.getContext('2d');
      c.fillStyle = '#000';
      const [x, y] = placeGlyph(c, N);
      c.fillText(face, x, y);
      const data = c.getImageData(0, 0, N, N).data;
      glyph = new Uint8Array(N * N);
      glyphCount = 0;
      for (let i = 0; i < N * N; i++) if (data[i * 4 + 3] > 100) { glyph[i] = 1; glyphCount++; }
      glyphCount = Math.max(1, glyphCount);
      near = new Uint8Array(N * N);
      const r = 5;
      for (let gy = 0; gy < N; gy++) {
        for (let gx = 0; gx < N; gx++) {
          if (!glyph[gy * N + gx]) continue;
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              const xx = gx + dx;
              const yy = gy + dy;
              if (xx >= 0 && yy >= 0 && xx < N && yy < N) near[yy * N + xx] = 1;
            }
          }
        }
      }
    }

    function strokePaths(c, s) {
      for (const st of strokes) {
        c.beginPath();
        st.forEach((p, i) => (i ? c.lineTo(p[0] * s, p[1] * s) : c.moveTo(p[0] * s, p[1] * s)));
        if (st.length === 1) c.lineTo(st[0][0] * s + 0.1, st[0][1] * s);
        c.stroke();
      }
    }

    function draw(success) {
      ctx.clearRect(0, 0, size, size);
      const [x, y] = placeGlyph(ctx, size);
      if (success) {
        ctx.fillStyle = COLOR;
        ctx.fillText(face, x, y);
      } else {
        if (L !== 4) {
          ctx.fillStyle = L === 5 ? 'rgba(0, 129, 167, .08)' : 'rgba(0, 129, 167, .17)';
          ctx.fillText(face, x, y);
        }
        if (L <= 4) {
          ctx.save();
          ctx.setLineDash([size * 0.02, size * 0.024]);
          ctx.lineWidth = Math.max(2, size * 0.008);
          ctx.strokeStyle = 'rgba(0, 129, 167, .6)';
          ctx.strokeText(face, x, y);
          ctx.restore();
        }
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = BRUSH * size;
      ctx.strokeStyle = success ? 'rgba(255, 255, 255, .35)' : INK;
      strokePaths(ctx, size);
      ctx.restore();
    }

    function check() {
      const off = document.createElement('canvas');
      off.width = N;
      off.height = N;
      const c = off.getContext('2d');
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.lineWidth = BRUSH * N;
      c.strokeStyle = '#000';
      strokePaths(c, N);
      const d = c.getImageData(0, 0, N, N).data;
      let inked = 0;
      let covered = 0;
      let outside = 0;
      for (let i = 0; i < N * N; i++) {
        if (d[i * 4 + 3] <= 100) continue;
        inked++;
        if (glyph[i]) covered++;
        if (!near[i]) outside++;
      }
      return { cover: covered / glyphCount, outside: inked ? outside / inked : 0 };
    }

    const point = e => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    };

    canvas.addEventListener('pointerdown', e => {
      if (locked) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* keep drawing without capture */ }
      drawing = [point(e)];
      strokes.push(drawing);
      draw();
    });
    canvas.addEventListener('pointermove', e => {
      if (!drawing) return;
      drawing.push(point(e));
      draw();
    });
    const endStroke = () => {
      if (!drawing) return;
      drawing = null;
      evaluate();
    };
    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    clearBtn.addEventListener('click', () => {
      if (locked) return;
      strokes = [];
      Sound.sfx('flip');
      draw();
    });

    function evaluate() {
      const { cover, outside } = check();
      box.dataset.score = `${cover.toFixed(2)} ${outside.toFixed(2)}`; // handy when checking the game
      if (cover >= NEED && outside <= 0.35) {
        success();
      } else if (outside > 0.5 && strokes.length >= 2 && !hinted) {
        hinted = true;
        Sound.say('Try to stay on the letter!', 200, 'Tap the sponge to start again.');
      }
    }

    function success() {
      locked = true;
      round++;
      api.progress(round, GOAL);
      Sound.sfx('correct');
      draw(true);
      UI.replayClass(box, 'bounce');
      const spoken = Sound.say(UI.pick(UI.PRAISE), 150, `That's ${Sound.letterName(letter)}!`, 150, 'It says', { sound: letter });
      api.after(spoken, () => (round >= GOAL ? api.win() : next()), 1600);
    }

    const ask = () => Sound.say(`Trace the letter ${Sound.letterName(letter)}!`, 200, 'It says', { sound: letter });

    function next() {
      if (!queue.length) queue = UI.shuffle(letters);
      letter = queue.pop();
      const upper = L === 3 || (L === 5 && Math.random() < 0.5);
      face = upper ? letter.toUpperCase() : UI.showLetter(letter);
      strokes = [];
      hinted = false;
      locked = false;
      buildMask();
      draw();
      UI.replayClass(box, 'pop-in');
      ask();
    }

    const onResize = () => { layout(); draw(); };

    api.progress(0, GOAL);
    layout();
    const fontReady = document.fonts && document.fonts.load ? document.fonts.load(font(100)) : Promise.resolve();
    fontReady.catch(() => {}).then(() => {
      if (!api.alive) return;
      window.addEventListener('resize', onResize);
      next();
    });

    return {
      replay: () => { if (!locked) ask(); },
      destroy() { window.removeEventListener('resize', onResize); },
    };
  },
});
