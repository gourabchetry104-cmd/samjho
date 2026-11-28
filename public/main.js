(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  const S = { mode: 'topic', ui: store.get('samjho_ui') || 'en', lessonLang: store.get('samjho_lang') || null,
    files: [], url: '', user: null, board: null, current: null, seed: 0 };
  if (!S.lessonLang) S.lessonLang = S.ui;

  const t = (k) => (I18N[S.ui] && I18N[S.ui][k]) || I18N.en[k] || k;

  function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast.h);
    toast.h = setTimeout(() => { el.hidden = true; }, ms || 3500);
  }

  /* ---------- language / text ---------- */
  function applyI18n() {
    document.documentElement.lang = S.ui;
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-en]').forEach((el) => { el.textContent = el.dataset[S.ui] || el.dataset.en; });
    $('#langLabel').textContent = S.ui === 'hi' ? 'हिं' : 'EN';
    $('#lessonLang').value = S.lessonLang;
    setPlaceholders();
    renderIdeas();
    renderHistory();
    if (S.board) renderControls({ i: S.board.i, len: S.board.steps.length, playing: S.board.playing, muted: S.board.muted, speed: S.board.speed });
    if (!$('#installSub').dataset.ios) $('#installSub').textContent = t('installSub');
  }
  function setPlaceholders() {
    const key = { topic: 'phTopic', exam: 'phExam', homework: 'phHw' }[S.mode];
    $('#prompt').placeholder = t(key);
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $('#prompt').placeholder = t(key);
  }
  $('#langBtn').onclick = () => {
    S.ui = S.ui === 'en' ? 'hi' : 'en';
    S.lessonLang = S.ui;
    store.set('samjho_ui', S.ui); store.set('samjho_lang', S.lessonLang);
    applyI18n();
  };
  $('#lessonLang').onchange = (e) => { S.lessonLang = e.target.value; store.set('samjho_lang', S.lessonLang); };

  /* ---------- views ---------- */
  function showView(name) {
    $('#home').hidden = name !== 'home';
    $('#lesson').hidden = name !== 'lesson';
    window.scrollTo(0, 0);
  }

  /* ---------- tabs, input ---------- */
  $$('.tab').forEach((b) => {
    b.onclick = () => {
      S.mode = b.dataset.mode;
      $$('.tab').forEach((x) => x.classList.toggle('active', x === b));
      setPlaceholders();
    };
  });
  function refreshStart() {
    $('#startBtn').disabled = !($('#prompt').value.trim() || S.files.length || S.url);
  }
  $('#prompt').addEventListener('input', refreshStart);
  $('#prompt').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !$('#startBtn').disabled) start();
  });

  /* ---------- ideas ---------- */
  function renderIdeas() {
    const list = I18N.ideas[S.ui];
    const ul = $('#ideaList'); ul.innerHTML = '';
    for (let k = 0; k < 4; k++) {
      const [sub, q] = list[(S.seed * 4 + k) % list.length];
      const li = document.createElement('li');
      const i = document.createElement('i'); i.textContent = sub;
      const span = document.createElement('span'); span.textContent = q;
      li.append(i, span);
      li.onclick = () => { $('#prompt').value = q; refreshStart(); $('#prompt').focus(); };
      ul.appendChild(li);
    }
  }
  $('#moreIdeas').onclick = () => { S.seed++; renderIdeas(); };

  /* ---------- attachments ---------- */
  const MAX_TOTAL = 3.2 * 1024 * 1024; // keeps the request under the 4.5 MB serverless limit
  const b64size = (f) => (f.data ? f.data.length : (f.text || '').length);
  function renderChips() {
    const box = $('#chips'); box.innerHTML = '';
    S.files.forEach((f, idx) => {
      const c = document.createElement('div'); c.className = 'chip';
      const s = document.createElement('span'); s.textContent = (f.kind === 'image' ? '🖼 ' : f.kind === 'pdf' ? '📄 ' : '📝 ') + f.name;
      const x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label', 'Remove');
      x.onclick = () => { S.files.splice(idx, 1); renderChips(); refreshStart(); };
      c.append(s, x); box.appendChild(c);
    });
    if (S.url) {
      const c = document.createElement('div'); c.className = 'chip';
      const s = document.createElement('span'); s.textContent = '🔗 ' + S.url;
      const x = document.createElement('button'); x.textContent = '×';
      x.onclick = () => { S.url = ''; renderChips(); refreshStart(); };
      c.append(s, x); box.appendChild(c);
    }
  }
  function readAsDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  }
  async function shrinkImage(file) {
    const url = await readAsDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 1500, sc = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82).split(',')[1];
  }
  async function addFiles(list) {
    for (const file of Array.from(list)) {
      try {
        let f;
        if (file.type.startsWith('image/')) {
          f = { kind: 'image', mime: 'image/jpeg', name: file.name, data: await shrinkImage(file) };
        } else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          if (file.size > 2.4 * 1024 * 1024) { toast(t('tooBig')); continue; }
          f = { kind: 'pdf', mime: 'application/pdf', name: file.name, data: (await readAsDataURL(file)).split(',')[1] };
        } else if (file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name)) {
          f = { kind: 'text', name: file.name, text: (await file.text()).slice(0, 20000) };
        } else { toast(t('fileBad')); continue; }
        const total = S.files.reduce((n, x) => n + b64size(x), 0) + b64size(f);
        if (total > MAX_TOTAL) { toast(t('tooBig')); continue; }
        S.files.push(f);
      } catch (e) { toast(t('fileBad')); }
    }
    renderChips(); refreshStart();
  }
  $('#fileBtn').onclick = () => $('#fileInput').click();
  $('#fileInput').onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
  $('#urlBtn').onclick = () => { const b = $('#urlBar'); b.hidden = !b.hidden; if (!b.hidden) $('#urlInput').focus(); };
  function addUrl() {
    let v = $('#urlInput').value.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { new URL(v); } catch (e) { toast(t('err')); return; }
    S.url = v; $('#urlInput').value = ''; $('#urlBar').hidden = true; renderChips(); refreshStart();
  }
  $('#urlAdd').onclick = addUrl;
  $('#urlInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } });

  /* ---------- voice input ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function listen(btn, onText, onFinal) {
    if (!SR) { toast('Voice input is not supported in this browser. Try Chrome.'); return; }
    if (btn._rec) { btn._rec.stop(); return; }
    const rec = new SR();
    rec.lang = S.lessonLang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = true; rec.continuous = false;
    let finalText = '';
    rec.onresult = (e) => {
      let txt = '';
      for (let k = 0; k < e.results.length; k++) txt += e.results[k][0].transcript;
      finalText = txt; onText(txt);
    };
    rec.onend = () => { btn.classList.remove('on'); btn._rec = null; if (finalText && onFinal) onFinal(finalText); };
    rec.onerror = (e) => { btn.classList.remove('on'); btn._rec = null; if (e.error === 'not-allowed') toast('Please allow the microphone.'); };
    btn._rec = rec; btn.classList.add('on');
    try { rec.start(); } catch (e) { btn._rec = null; btn.classList.remove('on'); }
  }
  if (!SR) { $('#micBtn').style.opacity = '.6'; }
  $('#micBtn').onclick = () => listen($('#micBtn'), (txt) => { $('#prompt').value = txt; refreshStart(); });

  /* ---------- auth ---------- */
  let auth = null;
  const cfg = window.SAMJHO_CONFIG || {};
  const guestOnly = typeof firebase === 'undefined' || !cfg.firebase || !cfg.firebase.apiKey;

  function setUser(u) {
    S.user = u;
    $('#signinBtn').hidden = !!u; $('#startFreeBtn').hidden = !!u; $('#userBox').hidden = !u;
    if (u) {
      const av = $('#avatar');
      av.textContent = ''; av.style.backgroundImage = '';
      if (u.photo) av.style.backgroundImage = 'url("' + u.photo.replace(/"/g, '') + '")';
      else av.textContent = (u.name || '?').trim().charAt(0).toUpperCase();
      closeAuth();
    }
    renderHistory();
  }
  function initAuth() {
    if (guestOnly) {
      if (store.get('samjho_guest') === '1') setUser({ uid: 'guest', name: 'Guest' });
      return;
    }
    firebase.initializeApp(cfg.firebase);
    auth = firebase.auth();
    auth.onAuthStateChanged((u) => setUser(u ? { uid: u.uid, name: u.displayName || u.email || 'User', email: u.email, photo: u.photoURL } : null));
    if (auth.isSignInWithEmailLink(location.href)) {
      const em = store.get('samjho_email') || prompt(t('confirmEmail'));
      if (em) auth.signInWithEmailLink(em, location.href).then(() => { store.del('samjho_email'); history.replaceState({}, '', location.pathname); }).catch((e) => toast(e.message));
    }
    auth.getRedirectResult().catch((e) => { if (e && e.message) toast(e.message); });
  }
  async function getToken() {
    if (auth && auth.currentUser) return auth.currentUser.getIdToken();
    if (S.user && S.user.uid === 'guest') return 'guest';
    return null;
  }
  function openAuth(msg) {
    $('#authModal').hidden = false;
    $('#guestBtn').hidden = !guestOnly;
    setMsg(guestOnly ? t('noLogin') : (msg || ''), guestOnly);
  }
  function closeAuth() { $('#authModal').hidden = true; setMsg(''); }
  function setMsg(m, err) { const e = $('#authMsg'); e.textContent = m; e.classList.toggle('err', !!err); }
  async function social(provider) {
    if (guestOnly) { setMsg(t('noLogin'), true); return; }
    try { await auth.signInWithPopup(provider); }
    catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return auth.signInWithRedirect(provider);
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') setMsg(e.message, true);
    }
  }
  $('#googleBtn').onclick = () => { if (!guestOnly) social(new firebase.auth.GoogleAuthProvider()); else setMsg(t('noLogin'), true); };
  $('#emailBtn').onclick = async () => {
    if (guestOnly) return setMsg(t('noLogin'), true);
    const em = $('#emailInput').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) return setMsg('Please enter a valid email.', true);
    try {
      await auth.sendSignInLinkToEmail(em, { url: location.origin + location.pathname, handleCodeInApp: true });
      store.set('samjho_email', em); setMsg(t('checkInbox'));
    } catch (e) { setMsg(e.message, true); }
  };
  $('#guestBtn').onclick = () => { store.set('samjho_guest', '1'); setUser({ uid: 'guest', name: 'Guest' }); };
  $('#authClose').onclick = closeAuth;
  $('#authModal').addEventListener('click', (e) => { if (e.target.id === 'authModal') closeAuth(); });
  $('#signinBtn').onclick = () => openAuth();
  $('#startFreeBtn').onclick = () => openAuth();
  $('#signoutBtn').onclick = async () => {
    if (auth) await auth.signOut(); else { store.del('samjho_guest'); setUser(null); }
    backHome();
  };

  /* ---------- history (saved on this device) ---------- */
  const histKey = () => 'samjho_hist_' + (S.user ? S.user.uid : '');
  function loadHist() { try { return JSON.parse(store.get(histKey()) || '[]'); } catch (e) { return []; } }
  function saveHist(entry) {
    if (!S.user) return;
    const h = loadHist().filter((x) => x.id !== entry.id);
    h.unshift(entry);
    store.set(histKey(), JSON.stringify(h.slice(0, 25)));
  }
  function renderHistory() {
    const h = S.user ? loadHist() : [];
    $('#historyBox').hidden = !h.length;
    const ul = $('#histList'); ul.innerHTML = '';
    h.forEach((e) => {
      const li = document.createElement('li');
      const i = document.createElement('i'); i.textContent = { topic: t('tabTopic'), exam: t('tabExam'), homework: t('tabHw') }[e.mode] || '';
      const span = document.createElement('span'); span.textContent = e.lesson.title;
      const small = document.createElement('small'); small.textContent = new Date(e.ts).toLocaleDateString();
      li.append(i, span, small);
      li.onclick = () => openLesson(e.lesson, e.lang, e.id, e.mode);
      ul.appendChild(li);
    });
  }
  $('#clearHist').onclick = () => { store.del(histKey()); renderHistory(); };

  /* ---------- lesson player UI ---------- */
  const ICON = {
    play: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
    pause: '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    sound: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.500 8.500a5 5 0 0 1 0 7M19 6a8.500 8.500 0 0 1 0 12"/></svg>',
    muted: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  };
  function renderControls(st) {
    $('#playBtn').innerHTML = st.playing ? ICON.pause : ICON.play;
    $('#playBtn').setAttribute('aria-label', st.playing ? t('pause') : t('play'));
    $('#muteBtn').innerHTML = st.muted ? ICON.muted : ICON.sound;
    $('#muteBtn').classList.toggle('on', st.muted);
    $('#speedBtn').textContent = st.speed + '×';
    const shown = Math.max(0, st.i + 1);
    $('#stepLabel').textContent = st.len ? t('step') + ' ' + shown + ' ' + t('of') + ' ' + st.len : '';
    $('#progressBar').style.width = (st.len ? (shown / st.len) * 100 : 0) + '%';
  }
  function makeBoard() {
    S.board = new Board($('#board'), {
      t,
      onState: renderControls,
      onCaption: (txt) => { $('#caption').textContent = txt; },
      onNoVoice: () => { if (!makeBoard.warned) { makeBoard.warned = true; toast(t('noHindiVoice'), 5000); } },
      onFinish: () => { /* already saved on load */ },
    });
  }
  makeBoard();
  $('#playBtn').onclick = () => S.board.toggle();
  $('#nextBtn').onclick = () => S.board.next();
  $('#prevBtn').onclick = () => S.board.prev();
  $('#replayBtn').onclick = () => S.board.replay();
  $('#speedBtn').onclick = () => { const o = [0.8, 1, 1.25, 1.5]; S.board.setSpeed(o[(o.indexOf(S.board.speed) + 1) % o.length]); };
  $('#muteBtn').onclick = () => S.board.setMuted(!S.board.muted);
  /* voice picker: choose among the voices installed on this device */
  function fillVoices() {
    const sel = $('#voiceSel');
    const lang = S.board.lang;
    const list = (window.Board && Board.listVoices) ? Board.listVoices(lang) : [];
    sel.innerHTML = '';
    sel.hidden = list.length < 2;
    const auto = document.createElement('option'); auto.value = ''; auto.textContent = S.ui === 'hi' ? 'आवाज़: अपने-आप' : 'Voice: Auto';
    sel.appendChild(auto);
    list.forEach((v) => { const o = document.createElement('option'); o.value = v.name; o.textContent = v.name.replace(/^(Microsoft|Google)\s+/, '').slice(0, 34); sel.appendChild(o); });
    const saved = store.get('samjho_voice_' + lang) || '';
    sel.value = list.some((v) => v.name === saved) ? saved : '';
    S.board.voiceName = sel.value || null;
  }
  $('#voiceSel').onchange = (e) => {
    store.set('samjho_voice_' + S.board.lang, e.target.value);
    S.board.voiceName = e.target.value || null;
    if (S.board.steps.length) S.board.replay(); // preview the new voice
  };
  if ('speechSynthesis' in window) speechSynthesis.addEventListener('voiceschanged', fillVoices);
  function backHome() { S.board.stop(); S.board.emit(); showView('home'); }
  $('#backBtn').onclick = backHome;
  $('#logo').onclick = (e) => { e.preventDefault(); backHome(); };

  function openLesson(lesson, lang, id, mode) {
    S.current = { lesson, lang, id, mode };
    showView('lesson');
    $('#loading').hidden = true;
    $('#lessonTitle').textContent = lesson.title;
    S.board.load(lesson, lang);
    fillVoices();
    S.board.setMuted(S.board.muted);
    S.board.play();
  }

  async function callApi(payload) {
    const token = await getToken();
    if (!token) { openAuth(); throw new Error('login'); }
    let r;
    try {
      r = await fetch('/api/teach', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(payload) });
    } catch (e) { throw new Error(navigator.onLine ? t('err') : t('offline')); }
    let j = {};
    try { j = await r.json(); } catch (e) { /* ignore */ }
    if (r.status === 401 && !S.user) { openAuth(); throw new Error('login'); }
    if (!r.ok) throw new Error(j.error || t('err'));
    return j;
  }

  async function start() {
    const prompt = $('#prompt').value.trim();
    if (!prompt && !S.files.length && !S.url) return toast(t('needInput'));
    if (!S.user) { openAuth(t('needLogin')); return; }
    S.board.stop();
    showView('lesson');
    $('#board').innerHTML = ''; $('#caption').textContent = ''; $('#lessonTitle').textContent = '';
    $('#loading').hidden = false;
    S.board.steps = []; S.board.i = -1; S.board.emit();
    try {
      const lesson = await callApi({ mode: S.mode, prompt, lang: S.lessonLang, files: S.files, url: S.url });
      const id = 'l' + Date.now();
      saveHist({ id, ts: Date.now(), mode: S.mode, lang: S.lessonLang, lesson });
      openLesson(lesson, S.lessonLang, id, S.mode);
      S.files = []; S.url = ''; $('#prompt').value = ''; renderChips(); refreshStart(); renderHistory();
    } catch (e) {
      $('#loading').hidden = true;
      showView('home');
      if (e.message !== 'login') toast(e.message, 5000);
    }
  }
  $('#startBtn').onclick = start;

  /* ---------- doubts + voice commands ---------- */
  const CMD = [
    [/^(next|continue|go on|आगे|अगला|आगे बढ़ो)$/i, () => S.board.next()],
    [/^(previous|back|पिछला|पीछे)$/i, () => S.board.prev()],
    [/^(pause|stop|wait|रुको|रुकिए|रुक जाओ|ठहरो)$/i, () => S.board.pause()],
    [/^(play|resume|start|चलाओ|शुरू करो|चालू करो)$/i, () => S.board.play()],
    [/^(repeat|replay|again|दोबारा|फिर से|दोहराओ)$/i, () => S.board.replay()],
  ];
  function handleCommand(txt) {
    const clean = txt.trim().replace(/[.!?।]+$/g, '');
    for (const [re, fn] of CMD) if (re.test(clean)) { fn(); return true; }
    return false;
  }
  async function askDoubt(q) {
    q = q.trim();
    if (!q) return;
    if (handleCommand(q)) { $('#doubtInput').value = ''; return; }
    $('#doubtInput').value = '';
    S.board.pause();
    $('#loading').hidden = false;
    const L = S.current.lesson;
    const ctx = 'Title: ' + L.title + '\n' + S.board.steps.map((s, k) => (k + 1) + '. ' + s.heading + ': ' + (s.say || '')).join('\n');
    try {
      const more = await callApi({ mode: 'followup', prompt: q, lang: S.current.lang, context: ctx });
      $('#loading').hidden = true;
      L.steps = L.steps.concat(more.steps);
      S.board.lesson = L;
      S.board.append(more);
      const h = loadHist(); const e = h.find((x) => x.id === S.current.id);
      if (e) { e.lesson = L; store.set(histKey(), JSON.stringify(h)); }
    } catch (e) {
      $('#loading').hidden = true;
      if (e.message !== 'login') toast(e.message, 5000);
    }
  }
  $('#doubtForm').onsubmit = (e) => { e.preventDefault(); askDoubt($('#doubtInput').value); };
  $('#doubtMic').onclick = () => {
    S.board.silence();
    listen($('#doubtMic'), (txt) => { $('#doubtInput').value = txt; }, (txt) => askDoubt(txt));
  };

  /* ---------- install (PWA) ---------- */
  let deferred = null;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const dismissed = () => Date.now() - Number(store.get('samjho_install_dismiss') || 0) < 7 * 864e5;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferred = e;
    if (!standalone && !dismissed()) $('#installBar').hidden = false;
  });
  $('#installBtn').onclick = async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; $('#installBar').hidden = true; }
    else toast(t('iosHow'), 6000);
  };
  $('#installClose').onclick = () => { $('#installBar').hidden = true; store.set('samjho_install_dismiss', String(Date.now())); };
  window.addEventListener('appinstalled', () => { $('#installBar').hidden = true; });
  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone && !dismissed()) {
    $('#installSub').dataset.ios = '1';
    $('#installSub').textContent = t('iosHow');
    $('#installBar').hidden = false;
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* ---------- go ---------- */
  initAuth();
  applyI18n();
  refreshStart();
  renderControls({ i: -1, len: 0, playing: false, muted: false, speed: 1 });
  window.__samjho = { S, openLesson };
})();
