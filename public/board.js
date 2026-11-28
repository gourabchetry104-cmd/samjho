// Whiteboard player: draws each step (text + SVG diagram) and speaks it aloud.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const OK_TAGS = new Set(['g', 'line', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'text']);
  const OK_ATTR = new Set(['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'd', 'points',
    'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'font-size', 'text-anchor', 'opacity', 'transform', 'font-weight']);
  const COLOR = /^(none|#[0-9a-f]{3,8}|[a-z]{3,20}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/i;
  const PATHDATA = /^[\d\s.,\-eE+MmLlHhVvCcSsQqTtAaZz]+$/;
  const INK = '#1b2440';

  // Only whitelisted shapes and attributes get through, so AI output can never inject scripts.
  function cleanSvg(markup) {
    if (!markup || typeof markup !== 'string' || markup.length > 8000) return null;
    let doc;
    try { doc = new DOMParser().parseFromString('<svg xmlns="' + NS + '">' + markup + '</svg>', 'image/svg+xml'); } catch (e) { return null; }
    if (doc.querySelector('parsererror')) return null;
    let count = 0;
    const walk = (src, dst) => {
      for (const n of Array.from(src.children)) {
        const tag = n.localName.toLowerCase();
        if (!OK_TAGS.has(tag) || ++count > 60) continue;
        const el = document.createElementNS(NS, tag);
        for (const a of Array.from(n.attributes)) {
          const k = a.name, v = a.value;
          if (!OK_ATTR.has(k)) continue;
          if (k === 'fill' || k === 'stroke') { if (!COLOR.test(v)) continue; }
          else if (k === 'transform') { if (!/^[a-z0-9 ().,\-]+$/i.test(v)) continue; }
          else if (k === 'd' || k === 'points') { if (!PATHDATA.test(v)) continue; }
          else if (k === 'text-anchor') { if (!/^(start|middle|end)$/.test(v)) continue; }
          else if (k === 'stroke-linecap') { if (!/^(butt|round|square)$/.test(v)) continue; }
          else if (k === 'stroke-linejoin') { if (!/^(miter|round|bevel)$/.test(v)) continue; }
          else if (k === 'font-weight') { if (!/^(normal|bold|\d{3})$/.test(v)) continue; }
          else if (!/^-?[\d.]+(px|%)?$/.test(v)) continue;
          el.setAttribute(k, v);
        }
        if (tag === 'text') el.textContent = (n.textContent || '').slice(0, 80);
        if (tag === 'g') walk(n, el);
        dst.appendChild(el);
      }
    };
    const g = document.createElementNS(NS, 'g');
    walk(doc.documentElement, g);
    return count ? g : null;
  }

  function buildDiagram(markup, baseDelay) {
    const g = cleanSvg(markup);
    if (!g) return null;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 600 300');
    svg.setAttribute('class', 'diagram');
    svg.setAttribute('role', 'img');
    let i = 0;
    g.querySelectorAll('*').forEach((el) => {
      const tag = el.localName;
      if (tag === 'g') return;
      const delay = (baseDelay + i * 0.3).toFixed(2) + 's';
      el.style.animationDelay = delay;
      if (tag === 'text') {
        if (!el.getAttribute('fill')) el.setAttribute('fill', INK);
      } else {
        el.setAttribute('pathLength', '1');
        if (!el.getAttribute('fill')) el.setAttribute('fill', 'none');
        const filled = el.getAttribute('fill') !== 'none';
        if (!el.getAttribute('stroke')) el.setAttribute('stroke', filled ? 'none' : INK);
        if (!el.getAttribute('stroke-linecap')) el.setAttribute('stroke-linecap', 'round');
        el.classList.add(filled ? 'pop' : 'draw');
      }
      i++;
    });
    svg.appendChild(g);
    return svg;
  }

  const hasTTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  function voicesFor(lang) {
    if (!hasTTS) return [];
    const base = lang === 'hi' ? 'hi' : 'en';
    const score = (v) => {
      const n = v.name.toLowerCase(), l = v.lang.replace('_', '-').toLowerCase();
      let sc = 0;
      if (/natural|neural/.test(n)) sc += 50;      // Edge "Natural" voices sound best
      if (/online/.test(n)) sc += 20;
      if (/google/.test(n)) sc += 15;
      if (/microsoft/.test(n)) sc += 5;
      if (l === (base === 'hi' ? 'hi-in' : 'en-in')) sc += 10;
      return sc;
    };
    return speechSynthesis.getVoices()
      .filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base))
      .sort((a, b) => score(b) - score(a));
  }

  function pickVoice(lang, name) {
    const list = voicesFor(lang);
    if (name) { const v = list.find((x) => x.name === name); if (v) return v; }
    return list[0] || null;
  }

  class Board {
    constructor(root, hooks) {
      this.root = root;
      this.hooks = hooks || {};
      this.steps = [];
      this.i = -1;
      this.playing = false;
      this.speed = 1;
      this.muted = false;
      this.lang = 'en';
      this.token = 0;
      this.timers = [];
      this.title = '';
      if (hasTTS) speechSynthesis.getVoices();
    }

    load(lesson, lang) {
      this.stop();
      this.root.innerHTML = '';
      this.steps = (lesson.steps || []).slice();
      this.lesson = lesson;
      this.lang = lang === 'hi' ? 'hi' : 'en';
      this.i = -1;
      this.title = lesson.title || '';
      this.emit();
    }

    append(lesson) {
      const first = this.steps.length;
      this.steps.push(...(lesson.steps || []));
      if (this.steps.length > first) { this.playing = true; this.run(first); }
    }

    emit() {
      if (this.hooks.onState) this.hooks.onState({ i: this.i, len: this.steps.length, playing: this.playing, muted: this.muted, speed: this.speed });
    }

    clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
    silence() { if (hasTTS) speechSynthesis.cancel(); }

    stop() {
      this.token++;
      this.playing = false;
      this.clearTimers();
      this.silence();
    }

    play() {
      if (!this.steps.length) return;
      this.playing = true;
      const at = this.i < 0 ? 0 : (this.i >= this.steps.length - 1 && this.endShown ? 0 : this.i);
      this.run(at);
    }
    pause() { this.stop(); this.emit(); }
    toggle() { this.playing ? this.pause() : this.play(); }

    go(i) {
      if (i < 0) i = 0;
      if (i >= this.steps.length) { this.finish(); return; }
      if (this.playing) this.run(i); else this.show(i);
    }
    next() { this.go(this.i + 1); }
    prev() { this.go(this.i - 1); }
    replay() { this.playing = true; this.run(Math.max(0, this.i)); }
    setSpeed(s) { this.speed = s; this.emit(); }
    setMuted(m) {
      this.muted = m;
      if (m) this.silence();
      this.emit();
    }

    // Render step i as the newest section (earlier steps are static, step i animates).
    show(i) {
      this.token++;
      this.clearTimers();
      this.silence();
      this.i = i;
      this.endShown = false;
      const kids = Array.from(this.root.children);
      kids.slice(i).forEach((k) => k.remove());
      for (let k = this.root.children.length; k < i; k++) this.root.appendChild(this.section(k, false));
      const sec = this.section(i, true);
      this.root.appendChild(sec);
      this.root.scrollTop = sec.offsetTop - 12;
      if (this.hooks.onCaption) this.hooks.onCaption(this.steps[i].say || '');
      this.emit();
      return sec;
    }

    section(k, animate) {
      const s = this.steps[k];
      const sp = this.speed;
      const el = document.createElement('section');
      el.className = 'step' + (animate ? '' : ' static');
      const num = document.createElement('div'); num.className = 'num'; num.textContent = k + 1; el.appendChild(num);
      const h = document.createElement('h3'); h.className = 'reveal'; h.textContent = s.heading || ''; el.appendChild(h);
      let t = 0.5;
      if (s.lines && s.lines.length) {
        const ul = document.createElement('ul');
        s.lines.forEach((line) => {
          const li = document.createElement('li');
          li.className = 'reveal';
          li.style.animationDelay = (t / sp).toFixed(2) + 's';
          li.textContent = line;
          ul.appendChild(li);
          t += 1.1;
        });
        el.appendChild(ul);
      }
      const d = buildDiagram(s.svg, t / sp);
      if (d) el.appendChild(d);
      return el;
    }

    speakText(text, onDone, token) {
      const parts = (text.match(/[^.!?।]+[.!?।]*/g) || [text]).map((x) => x.trim()).filter(Boolean);
      const voice = pickVoice(this.lang, this.voiceName);
      const loc = this.lang === 'hi' ? 'hi-IN' : 'en-IN';
      let idx = 0;
      const nextPart = () => {
        if (token !== this.token) return;
        if (idx >= parts.length) return onDone();
        const u = new SpeechSynthesisUtterance(parts[idx++]);
        u.lang = voice ? voice.lang : loc;
        if (voice) { try { u.voice = voice; } catch (e) { /* use default voice */ } }
        u.rate = Math.min(1.6, 0.95 * this.speed);
        u.onend = nextPart;
        u.onerror = () => nextPart();
        speechSynthesis.speak(u);
      };
      nextPart();
    }

    run(i) {
      if (i >= this.steps.length) { this.finish(); return; }
      this.playing = true;
      const sec = this.show(i);
      const token = this.token;
      const step = this.steps[i];
      const advance = () => {
        if (token !== this.token) return;
        this.timers.push(setTimeout(() => {
          if (token !== this.token || !this.playing) return;
          if (i + 1 < this.steps.length) this.run(i + 1); else this.finish();
        }, 700 / this.speed));
      };
      const text = step.say || step.lines.join('. ');
      const voiceOk = hasTTS && !this.muted && (this.lang !== 'hi' || pickVoice('hi', this.voiceName));
      if (hasTTS && !this.muted && this.lang === 'hi' && !pickVoice('hi', this.voiceName) && this.hooks.onNoVoice) this.hooks.onNoVoice();
      if (voiceOk) {
        this.speakText(text, advance, token);
      } else {
        const words = text.split(/\s+/).length;
        const ms = Math.max(3500, words * (this.lang === 'hi' ? 430 : 360) / this.speed);
        this.timers.push(setTimeout(advance, ms));
      }
      return sec;
    }

    finish() {
      this.stop();
      this.i = this.steps.length - 1;
      if (!this.endShown) {
        this.endShown = true;
        const end = this.endSection();
        if (end) { this.root.appendChild(end); this.root.scrollTop = end.offsetTop - 12; }
      }
      if (this.hooks.onCaption) this.hooks.onCaption('');
      this.emit();
      if (this.hooks.onFinish) this.hooks.onFinish(this.lesson);
    }

    endSection() {
      const L = this.lesson || {};
      const tr = (this.hooks.t || ((k) => k));
      if (!(L.summary && L.summary.length) && !(L.quiz && L.quiz.length)) return null;
      const el = document.createElement('section');
      el.className = 'step end static';
      if (L.summary && L.summary.length) {
        const h = document.createElement('h3'); h.textContent = tr('summary'); el.appendChild(h);
        const ul = document.createElement('ul'); ul.className = 'sum';
        L.summary.forEach((s) => { const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); });
        el.appendChild(ul);
      }
      if (L.quiz && L.quiz.length) {
        const h = document.createElement('h3'); h.textContent = tr('quickCheck'); h.style.marginTop = '22px'; el.appendChild(h);
        L.quiz.forEach((q) => {
          const box = document.createElement('div'); box.className = 'quiz-q';
          const p = document.createElement('p'); p.textContent = q.q; box.appendChild(p);
          const why = document.createElement('small'); why.hidden = true;
          q.options.forEach((o, oi) => {
            const b = document.createElement('button'); b.type = 'button'; b.textContent = o;
            b.onclick = () => {
              if (box.dataset.done) return;
              box.dataset.done = '1';
              const ok = oi === q.answer;
              b.classList.add(ok ? 'right' : 'bad');
              if (!ok) box.querySelectorAll('button')[q.answer].classList.add('right');
              why.textContent = (ok ? tr('correct') : tr('wrong')) + ' ' + (q.why || '');
              why.hidden = false;
            };
            box.appendChild(b);
          });
          box.appendChild(why);
          el.appendChild(box);
        });
      }
      return el;
    }
  }

  Board.listVoices = voicesFor;
  window.Board = Board;
  window.__cleanSvg = cleanSvg;
})();
