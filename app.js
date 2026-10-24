(() => {
  'use strict';
  const { LEVELS, TOPICS, QUESTION_COUNT, pick, score, maxScore, rank, prepare } = GameCore;
  const bank = window.QUESTION_BANK;
  const $ = s => document.querySelector(s);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    trophy: '<path d="M8 3h8v7a4 4 0 0 1-8 0V3Z"/><path d="M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8m-7-2h6"/>',
    book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5Z"/><path d="M6 8h3m6 0h3M6 12h3m6 0h3"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/><path d="M9 7h6m-6 4h6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1.2-1.5 2M12 17h.01"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    sprout: '<path d="M12 21v-9M12 14C6 15 3 11 4 6c5-1 9 2 8 8Zm0-3c-1-5 2-9 7-8 1 5-2 9-7 8Z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cards: '<rect x="5" y="6" width="15" height="15" rx="2"/><path d="M16 3H5a3 3 0 0 0-3 3v11M9 11h7m-7 4h5"/>',
    spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
    truck: '<path d="M3 6h11v11H3V6Zm11 5h4l3 4v2h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    box: '<path d="m12 3 9 5v10l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5m-9 5v10M7.5 5.5l9 5"/>',
    shield: '<path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    checkcircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    cross: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    bulb: '<path d="M8 16c0-2-3-3-3-7a7 7 0 0 1 14 0c0 4-3 5-3 7H8Zm1 4h6m-5 2h4M9 9l3 3 3-3m-3 3v4"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M19 10a7 7 0 0 0-12-5L4 8m16 8-3 3A7 7 0 0 1 5 15"/>',
    qr: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h3v3h3v3h-6v-3m6-6v3M3 12h9V3m0 12v6"/>',
    flag: '<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  const topicIcon = t => ({ ai: 'spark', b2b: 'truck', b2c: 'box', all: 'grid' })[t];
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const STORE = `ai-logistics-lab-v1:${window.FEISHU_USER.open_id}`;
  const blank = () => ({ name: window.FEISHU_USER.name || '飞书用户', records: [], sessions: [], mistakes: [] });
  let storageAvailable = true;
  let data = blank();
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (raw && typeof raw === 'object') {
      const validRun = r => r && LEVELS[r.level] && TOPICS[r.topic] && Number.isFinite(r.score) && r.score >= 0 && (r.total === 6 || r.total === QUESTION_COUNT) && r.score <= maxScore(LEVELS[r.level].base, r.total) && Number.isFinite(r.duration) && r.duration >= 0 && Number.isFinite(r.correct) && r.correct >= 0 && r.correct <= r.total && Number.isFinite(r.date) && typeof r.id === 'string';
      data.name = window.FEISHU_USER.name || (typeof raw.name === 'string' ? raw.name.slice(0, 40) : '飞书用户');
      data.records = Array.isArray(raw.records) ? raw.records.filter(r => validRun(r) && typeof r.name === 'string').slice(-200) : [];
      data.sessions = Array.isArray(raw.sessions) ? raw.sessions.filter(validRun).slice(-500) : [];
      data.mistakes = Array.isArray(raw.mistakes) ? raw.mistakes.filter(m => m && bank.some(q => q.id === m.id) && typeof m.wrongAnswer === 'string').slice(-100) : [];
    }
    const probe = `${STORE}-probe`; localStorage.setItem(probe, '1'); localStorage.removeItem(probe);
  } catch { storageAvailable = false; }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(data)); }
    catch { storageAvailable = false; toast('当前浏览器无法保存数据；本次可继续体验，刷新后可能丢失。'); }
  }
  const sharedBoards = new Map();
  const sharedBoardErrors = new Map();
  const pendingBoards = new Map();
  const boardKey = (level, topic) => `${level}:${topic}`;
  let migrationPromise;
  async function migrateLocalScores() {
    const migrationKey = `${STORE}:shared-leaderboard-v1`;
    try { if (localStorage.getItem(migrationKey) === '1') return; }
    catch { return; }
    if (!data.records.length) { try { localStorage.setItem(migrationKey, '1'); } catch {} return; }
    const response = await fetch('/api/leaderboard', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ migration: true, records: data.records.slice(-200).map(record => ({ ...record, duration: Math.max(1, record.duration), total: record.total || 6 })) }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '旧成绩同步失败');
    try { localStorage.setItem(migrationKey, '1'); } catch {}
  }
  async function refreshSharedBoard(level, topic, force = false) {
    const key = boardKey(level, topic);
    const cached = sharedBoards.get(key);
    if (!force && cached && Date.now() - cached.fetchedAt < 30000) return cached.records;
    if (!force && sharedBoardErrors.has(key)) return [];
    if (pendingBoards.has(key)) return pendingBoards.get(key);
    if (migrationPromise === undefined) migrationPromise = migrateLocalScores().catch(error => { migrationPromise = undefined; throw error; });
    const request = (async () => {
      try {
        await migrationPromise;
        const params = new URLSearchParams({ level, topic });
        const response = await fetch(`/api/leaderboard?${params}`, { credentials: 'same-origin', cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '共享排行榜读取失败');
        const records = Array.isArray(result.records) ? result.records : [];
        sharedBoards.set(key, { records, fetchedAt: Date.now() });
        sharedBoardErrors.delete(key);
        return records;
      } catch (error) {
        sharedBoardErrors.set(key, error.message || '共享排行榜暂不可用');
        return [];
      } finally { pendingBoards.delete(key); }
    })();
    pendingBoards.set(key, request);
    return request;
  }
  function ensureSharedBoard(level, topic, page) {
    const key = boardKey(level, topic);
    const cached = sharedBoards.get(key);
    if ((cached && Date.now() - cached.fetchedAt < 30000) || sharedBoardErrors.has(key) || pendingBoards.has(key)) return;
    refreshSharedBoard(level, topic).then(() => { if (state.page === page) render(); });
  }
  const boardStatus = (level, topic) => sharedBoardErrors.get(boardKey(level, topic)) || '正在读取全员共享榜单…';
  const state = { page: 'home', level: 'easy', topic: 'all', boardLevel: 'easy', boardTopic: 'all', quiz: null, result: null };
  const names = { home: '挑战大厅', leaderboard: '排行榜', knowledge: '知识补给站', videos: '视频学习', mistakes: '我的错题本', admin: '用户访问记录', challenge: '正在挑战', result: '挑战成绩' };
  const avatarContents = user => {
    const url = /^https:\/\//i.test(user?.avatar_url || '') ? user.avatar_url : '';
    return url ? `<img src="${esc(url)}" alt="${esc(user.name || '飞书用户')}的飞书头像">` : esc((user?.name || '飞').slice(0, 1));
  };
  const avatarMarkup = (user, large = false) => `<span class="avatar ${large ? 'large' : ''}">${avatarContents(user)}</span>`;
  const duration = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  let toastTimer;
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3500); }
  function modal(html) { $('#modal-content').innerHTML = `<div class="modal-inner">${html}</div>`; if (!$('#modal').open) $('#modal').showModal(); $('#modal-content').querySelectorAll('[data-close]').forEach(b => b.onclick = () => $('#modal').close()); }
  const modalHead = title => `<div class="modal-head"><h2>${title}</h2><button class="modal-close" data-close aria-label="关闭弹窗">×</button></div>`;
  function showRules() {
    modal(`${modalHead('把学习，变成一次小挑战')}<p>每个难度每局需完成 20 道单选题。选好后点击“确认答案”；每题答完都会显示解释和知识总结。</p><ul><li>Easy / Normal / Hard 每题基础分为 100 / 150 / 200 分。</li><li>连续答对从第 2 题起加 10、20、30 分，之后每题最多加 30 分；答错得 0 分并重置连击。</li><li>不倒计时、不按速度加分；同分按完成用时排序。20 题全对满分为 2540 / 3540 / 4540 分。</li><li>综合练习从 AI、To B、To C 各抽题；专项练习从所选方向抽满 20 题。题目和选项顺序随机。</li><li>排行榜按难度和方向分别比较，同一昵称保留最佳成绩。错题练习不上榜。</li></ul><p>题目属于教学场景；涉及时间、指标和业务规则时，以题内约定为准。本版使用预设题库，没有连接大模型或业务系统。</p><button class="primary-button full-width" data-close>明白了，去挑战 ${icon('arrow')}</button>`);
  }
  function showProfile() {
    modal(`${modalHead('你的飞书学习身份')}${avatarMarkup(window.FEISHU_USER, true)}<h3 class="identity-name">${esc(data.name)}</h3><p>已通过飞书扫码验证。学习进度和错题保存在当前浏览器；排行榜成绩保存在企业共享数据库，并按飞书身份归属。</p><button class="secondary-button full-width" id="clear-data">清除本机学习记录 ${icon('refresh')}</button><button class="text-button logout-button" id="logout-button">退出飞书登录 ↗</button>`);
    $('#clear-data').onclick = () => {
      modal(`${modalHead('清除本机学习记录？')}<p>这会清除本浏览器的学习进度和错题。已发布到企业共享排行榜的成绩会继续保留。</p><button class="secondary-button full-width" data-close>保留记录</button><button class="primary-button full-width" id="confirm-clear">确认清除</button>`);
      $('#confirm-clear').onclick = () => { localStorage.removeItem(`${STORE}:shared-leaderboard-v1`); data = blank(); persist(); state.quiz = null; state.result = null; $('#modal').close(); go('home', true); toast('本机学习记录已清除'); };
    };
    $('#logout-button').onclick = async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      window.location.replace('/');
    };
  }
  $('#rules-button').onclick = $('#sidebar-rules').onclick = showRules;
  $('#profile-button').onclick = showProfile;
  $('#modal').addEventListener('click', e => { const rect = $('#modal').getBoundingClientRect(); if (e.target === $('#modal') && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) $('#modal').close(); });
  function syncChrome() {
    $('#profile-name').textContent = data.name || '体验学员';
    $('.profile-button .avatar').innerHTML = avatarContents(window.FEISHU_USER);
    $('#mistake-badge').textContent = data.mistakes.length;
    $('#breadcrumb-current').textContent = names[state.page];
    document.querySelectorAll('[data-page]').forEach(a => { const active = a.dataset.page === state.page || (a.dataset.page === 'home' && ['challenge', 'result'].includes(state.page)); a.classList.toggle('active', active); if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }
  function go(page, force = false) {
    if (state.page === 'challenge' && state.quiz && !force) {
      modal(`${modalHead('暂时离开挑战？')}<p>这一局还没有完成，离开后本局成绩不会记录。已经加入错题本的题目会保留。</p><button class="secondary-button full-width" data-close>继续答题</button><button class="primary-button full-width" id="confirm-leave">离开本局</button>`);
      $('#confirm-leave').onclick = () => { $('#modal').close(); state.quiz = null; go(page, true); };
      return;
    }
    state.page = names[page] ? page : 'home';
    if (location.hash !== `#${state.page}`) history.pushState(null, '', `#${state.page}`);
    render(); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  document.querySelectorAll('[data-page], .brand').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.page || 'home'); });
  window.addEventListener('popstate', () => { let page = location.hash.slice(1); if (page === 'challenge' && !state.quiz) page = 'home'; if (page === 'result' && !state.result) page = 'home'; state.page = names[page] ? page : 'home'; render(); });
  const heading = (eyebrow, title, desc, aside = '') => `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${aside}</div>`;
  const chips = (selected, attr = 'topic') => Object.keys(TOPICS).map(t => `<button class="chip ${selected === t ? 'active' : ''}" data-${attr}="${t}" aria-pressed="${selected === t}">${icon(topicIcon(t))}${TOPICS[t]}</button>`).join('');
  const segments = selected => `<div class="segmented" aria-label="筛选难度">${Object.keys(LEVELS).map(l => `<button data-board-level="${l}" class="${selected === l ? 'active' : ''}" aria-pressed="${selected === l}">${LEVELS[l].display}</button>`).join('')}</div>`;
  const warning = () => !storageAvailable ? '<div class="storage-warning">当前浏览器的本地存储不可用，记录仅保留到刷新前。请在允许本地存储的浏览器中体验。</div>' : '';
  const heroArt = `<div class="hero-art" aria-hidden="true"><svg viewBox="0 0 300 260" fill="none"><defs><linearGradient id="parcel" x1="110" y1="90" x2="200" y2="185" gradientUnits="userSpaceOnUse"><stop stop-color="#b39be3"/><stop offset="1" stop-color="#8b6ac9"/></linearGradient><linearGradient id="truck" x1="120" y1="155" x2="220" y2="240"><stop stop-color="#d1bceb"/><stop offset="1" stop-color="#b296d8"/></linearGradient></defs><circle cx="183" cy="139" r="95" stroke="#e3daf3"/><circle cx="183" cy="139" r="77" stroke="#e3daf3"/><path d="M7 199c28-46 60 22 93-18s56 37 89 14 83-28 97 5" stroke="#c9b5e5" stroke-width="1.8" stroke-dasharray="5 7"/><ellipse cx="183" cy="240" rx="89" ry="10" fill="#e1d7ef"/><g transform="rotate(-7 170 120)"><rect x="117" y="67" width="99" height="95" rx="22" fill="url(#parcel)"/><rect x="131" y="92" width="72" height="43" rx="14" fill="#f8f4ff"/><ellipse cx="151" cy="112" rx="3.6" ry="5.6" fill="#8260ba"/><ellipse cx="182" cy="112" rx="3.6" ry="5.6" fill="#8260ba"/><path d="M160 123c4 3 9 3 13-1" stroke="#b195d8" stroke-width="2.5" stroke-linecap="round"/><path d="M164 68V53m0 0 4-4" stroke="#aa8ed3" stroke-width="4" stroke-linecap="round"/><circle cx="169" cy="48" r="5" fill="#cbb5e8"/><rect x="108" y="101" width="10" height="23" rx="5" fill="#b399da"/><rect x="216" y="101" width="10" height="23" rx="5" fill="#a185cc"/></g><path d="m111 176 23-12 75 4 5 55-103-2v-45Z" fill="url(#truck)"/><path d="m111 176 82 4 21-12-80-4-23 12Z" fill="#dbc9ef"/><path d="m193 180 21-12v55l-21 8v-51Z" fill="#a88acb"/><path d="m148 167 23 2-1 24-9-5-8 4v-24Z" fill="#eee4f9"/><path d="M212 187h28l19 21v21h-47v-42Z" fill="#b198d2"/><path d="M222 194h15l13 15h-28v-15Z" fill="#eee7f8"/><rect x="218" y="216" width="9" height="3" rx="1.5" fill="#ddd0ec"/><circle cx="135" cy="231" r="13" fill="#8c74a9"/><circle cx="135" cy="231" r="6" fill="#dbceec"/><circle cx="235" cy="231" r="13" fill="#8c74a9"/><circle cx="235" cy="231" r="6" fill="#dbceec"/><path d="m244 63 4 10 11 4-11 4-4 10-4-10-10-4 10-4 4-10Z" fill="#c5b0e5"/><path d="m88 97 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#d5c3ec"/><g transform="rotate(9 251 136)"><rect x="223" y="120" width="56" height="30" rx="9" fill="#fff" fill-opacity=".8"/><path d="m234 134 4 4 7-9" stroke="#aa8ecb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M252 130h17m-17 6h12" stroke="#d4c7e5" stroke-width="2" stroke-linecap="round"/></g><circle cx="94" cy="193" r="5" fill="#d5c5ea"/><path d="M94 189v8m-4-4h8" stroke="#aa91c9" stroke-width="1.5"/><g transform="rotate(-12 92 151)"><rect x="66" y="132" width="50" height="31" rx="9" fill="white" fill-opacity=".65"/><path d="m78 142-4 4 4 4m24-8 4 4-4 4m-9-9-3 10" stroke="#bda6da" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g></svg></div>`;
  function home() {
    const sessions = data.sessions;
    const totalCorrect = sessions.reduce((n, r) => n + r.correct, 0);
    const totalAnswers = sessions.reduce((n, r) => n + r.total, 0);
    const seen = new Set(sessions.flatMap(r => r.questionIds || []));
    const board = (sharedBoards.get(boardKey(state.level, state.topic))?.records || []).slice(0, 3);
    const level = LEVELS[state.level];
    $('#main').innerHTML = `${heading('LEARN · PLAY · GROW', `${data.name ? `${esc(data.name)}，` : ''}今天，也学点 AI 吧 <span style="font-size:21px">✧</span>`, '把工作里的小场景，变成掌握 AI 的第一步。', `<span class="subtle-pill">${icon('shield')}零基础友好 · 随时开始</span>`)}${warning()}<div class="home-grid fade-in"><div class="main-column"><section class="hero"><div class="hero-copy"><div class="hero-label"><span>✦</span> AI × LOGISTICS</div><h2>把 AI 变成你的<br><em>物流工作搭子。</em></h2><p>从写好一句提示词，到解决真实业务问题。<br>不用背概念，在每一次选择中学会应用。</p></div>${heroArt}<span class="hero-doodle">SMALL STEPS, BIG IDEAS</span></section><section aria-labelledby="difficulty-title"><div class="section-head"><h2 id="difficulty-title">选择你的挑战</h2><span>从适合自己的难度出发</span></div><div class="difficulty-grid">${Object.entries(LEVELS).map(([l, d]) => `<button class="difficulty-card ${l} ${state.level === l ? 'selected' : ''}" data-level="${l}" aria-pressed="${state.level === l}"><div class="difficulty-top"><span class="difficulty-icon">${icon(d.icon)}</span><span class="radio-mark"></span></div><h3>${d.display}<span>${d.label}</span></h3><p>${d.subtitle}</p><div class="difficulty-bottom"><span>${QUESTION_COUNT} 道题 · ${d.time}</span><span class="difficulty-bars" aria-label="${d.label}"><i></i><i></i><i></i></span></div></button>`).join('')}</div><div class="challenge-settings"><div class="settings-label">这次想探索什么？<small>选择练习方向</small></div><div class="topic-chips">${chips(state.topic)}</div><div class="start-line"><div class="start-meta"><span>${icon('cards')}每题 ${level.base} 基础分</span><span>${icon('clock')}共 ${QUESTION_COUNT} 题 · 不设倒计时</span></div><button class="primary-button" id="start-game">开始挑战 ${icon('arrow')}</button></div></div></section><div class="how-to"><div class="how-to-item"><span class="step-number">01</span><div><strong>选一个挑战</strong><p>三档难度，自由出发</p></div></div><div class="how-to-item"><span class="step-number">02</span><div><strong>边答边学习</strong><p>每题都有知识解析</p></div></div><div class="how-to-item"><span class="step-number">03</span><div><strong>点亮新技能</strong><p>记录进步，挑战自己</p></div></div></div></div><aside class="right-column"><section class="panel score-panel"><div class="hello">YOUR LEARNING JOURNEY</div><h3>每一点进步，都算数</h3><div class="personal-level"><span class="level-emblem">${icon(sessions.length >= 3 ? 'flag' : 'sprout')}</span><div><strong>${sessions.length >= 10 ? 'AI 场景探索者' : sessions.length >= 3 ? 'AI 练习生' : 'AI 新芽学员'}</strong><small>${sessions.length ? '继续探索，解锁更多可能' : '你的第一场挑战，等你开启'}</small></div></div><div class="personal-stats"><div><strong>${sessions.length}</strong><small>完成挑战</small></div><div><strong>${sessions.reduce((n, r) => n + r.score, 0)}</strong><small>累计积分</small></div><div><strong>${totalAnswers ? Math.round(totalCorrect / totalAnswers * 100) : 0}<span style="font-size:11px">%</span></strong><small>答题正确率</small></div></div><div class="achievement-line"><span>知识探索进度</span><span>${seen.size} / ${bank.length}</span></div><div class="thin-track"><span style="width:${seen.size / bank.length * 100}%"></span></div></section><section class="panel board-panel"><div class="panel-title"><span>${icon('trophy')}挑战排行榜</span><span class="local-tag">企业共享</span></div>${board.length ? board.map((r, i) => `<div class="mini-rank"><span class="rank-number">0${i + 1}</span><span class="mini-name">${esc(r.name)}</span><span class="points">${r.score}<small> 分</small></span></div>`).join('') : `<div class="mini-empty"><div class="empty-trophy">${icon('trophy')}</div><strong>${sharedBoardErrors.has(boardKey(state.level, state.topic)) ? '排行榜暂时无法读取' : '首席挑战者，虚位以待'}</strong><p>${sharedBoardErrors.has(boardKey(state.level, state.topic)) ? esc(boardStatus(state.level, state.topic)) : '完成挑战，留下你的名字'}</p><button id="empty-start">去赢得第一份积分 ↗</button></div>`}<div class="board-foot">${LEVELS[state.level].display} · ${TOPICS[state.topic]} <button id="view-board" style="color:var(--purple);margin-left:6px">查看全部 →</button></div></section><section class="knowledge-teaser"><div class="teaser-orbit"></div><div class="teaser-label">${icon('bulb')} A LITTLE AI TIP</div><h3>好问题，<br>是 AI 好答案的起点。</h3><p>任务 + 背景 + 约束 + 输出格式</p><button id="open-knowledge">领取你的提示词小抄 ${icon('arrow')}</button></section></aside></div>`;
    document.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { state.level = b.dataset.level; home(); });
    document.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => { state.topic = b.dataset.topic; home(); });
    $('#start-game').onclick = startGame;
    if ($('#empty-start')) $('#empty-start').onclick = startGame;
    $('#view-board').onclick = () => { state.boardLevel = state.level; state.boardTopic = state.topic; go('leaderboard'); };
    $('#open-knowledge').onclick = () => go('knowledge');
    ensureSharedBoard(state.level, state.topic, 'home');
  }
  function startGame() { begin(pick(bank, state.level, state.topic), false); }
  function begin(questions, practice) {
    if (!questions.length) return toast('目前没有可练习的错题。');
    state.quiz = { questions, index: 0, selected: null, answered: false, score: 0, streak: 0, bestStreak: 0, answers: [], started: Date.now(), level: state.level, topic: state.topic, practice };
    go('challenge', true);
  }
  function quiz() {
    const run = state.quiz;
    if (!run) return go('home', true);
    const q = run.questions[run.index];
    const base = LEVELS[q.level].base;
    const last = run.answers[run.index];
    $('#main').innerHTML = `<div class="quiz-top"><button class="back-button" id="exit-game">${icon('back')}返回大厅</button><div class="quiz-meta"><span class="level-pill">${run.practice ? '错题练习' : LEVELS[run.level].display}</span><span>${run.practice ? '不计排行榜' : TOPICS[run.topic]}</span></div></div>${warning()}<div class="quiz-layout fade-in"><section class="question-panel"><div class="progress-label"><strong>QUESTION ${String(run.index + 1).padStart(2, '0')}</strong><span>${run.index + 1} / ${run.questions.length}</span></div><div class="quiz-progress"><span style="width:${(run.index + (run.answered ? 1 : 0)) / run.questions.length * 100}%"></span></div><div class="question-topic">${icon(topicIcon(q.topic))}${TOPICS[q.topic]} · ${LEVELS[q.level].display}</div><h2 id="question-title">${esc(q.title)}</h2>${q.context ? `<div class="question-context">${esc(q.context)}</div>` : ''}<p class="question-instruction">单项选择 · 选择你认为最合适的答案</p><div class="options" role="group" aria-labelledby="question-title">${q.options.map((option, i) => `<button class="option ${run.selected === i ? 'selected' : ''} ${run.answered && i === q.answer ? 'correct' : ''} ${run.answered && i === run.selected && i !== q.answer ? 'wrong' : ''}" data-option="${i}" ${run.answered ? 'disabled' : ''} aria-pressed="${run.selected === i}"><span class="option-letter">${'ABCD'[i]}</span><span>${esc(option)}</span>${run.answered && i === q.answer ? '<span class="option-state">正确答案 ✓</span>' : run.answered && i === run.selected ? '<span class="option-state">你的选择</span>' : ''}</button>`).join('')}</div>${run.answered ? `<div class="feedback ${last.correct ? '' : 'is-wrong'}" role="status"><div class="feedback-title">${icon(last.correct ? 'checkcircle' : 'bulb')}${last.correct ? ['答对了，继续保持！', '很棒，抓住了关键！', '这一步，学会了！'][run.index % 3] : '换个角度，一起看懂这道题'}<span class="gain">+${last.points} 分</span></div><p>${esc(q.explanation)}</p><p class="takeaway">✧ 记住这一点：${esc(q.takeaway)}</p></div>` : ''}<div class="quiz-actions"><span class="keyboard-tip">快捷键 <kbd>1–4</kbd> 选择 <kbd>Enter</kbd> ${run.answered ? '继续' : '确认'}</span><button class="primary-button" id="quiz-submit" ${run.selected === null ? 'disabled' : ''}>${run.answered ? run.index === run.questions.length - 1 ? '查看成绩' : '下一题' : '确认答案'}${icon('arrow')}</button></div></section><aside class="quiz-side"><section class="panel live-score"><small>本局积分</small><strong>${run.score}</strong><span>答题用时 <span id="quiz-clock">${duration((Date.now() - run.started) / 1000)}</span></span><div class="live-detail"><div><strong>${run.answers.filter(a => a.correct).length}<small> / ${run.questions.length}</small></strong><small>已答对</small></div><div><strong>${run.streak}<small> 连击</small></strong><small>保持好状态</small></div></div></section><section class="panel score-rules"><h3>积分小贴士</h3><p>本题答对 +${base} 基础分</p><p>连续答对有额外奖励：<br>第 2 题 +10，第 3 题 +20，<br>第 4 题起每题 +30。</p><p>答错会重置连击，<br>但每一次理解都算收获。</p></section><div class="encouragement"><strong>不必着急，先想一想。</strong>这里没有倒计时。用你在工作里的经验，做出自己的判断。</div></aside></div>`;
    $('#exit-game').onclick = () => go('home');
    document.querySelectorAll('[data-option]').forEach(b => b.onclick = () => choose(Number(b.dataset.option)));
    $('#quiz-submit').onclick = run.answered ? nextQuestion : submitAnswer;
  }
  function choose(index) {
    const run = state.quiz;
    if (!run || run.answered || index < 0 || index > 3) return;
    run.selected = index;
    document.querySelectorAll('[data-option]').forEach(b => { const active = Number(b.dataset.option) === index; b.classList.toggle('selected', active); b.setAttribute('aria-pressed', String(active)); });
    $('#quiz-submit').disabled = false;
  }
  function submitAnswer() {
    const run = state.quiz;
    if (!run || run.answered || run.selected === null) return;
    const q = run.questions[run.index]; const correct = q.answer === run.selected;
    run.streak = correct ? run.streak + 1 : 0;
    run.bestStreak = Math.max(run.bestStreak, run.streak);
    const points = score(LEVELS[q.level].base, run.streak, correct);
    run.score += points; run.answered = true;
    run.answers.push({ id: q.id, selected: run.selected, correct, points });
    if (!correct) {
      const old = data.mistakes.find(m => m.id === q.id);
      if (old) { old.wrongAnswer = q.options[run.selected]; old.date = Date.now(); }
      else data.mistakes.push({ id: q.id, wrongAnswer: q.options[run.selected], date: Date.now() });
      persist(); syncChrome();
    }
    quiz();
    $('#quiz-submit').focus({ preventScroll: true });
    if (window.innerWidth < 700) $('.feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function nextQuestion() {
    const run = state.quiz;
    if (!run || !run.answered) return;
    if (run.index === run.questions.length - 1) return finishGame();
    run.index++; run.selected = null; run.answered = false; quiz(); window.scrollTo({ top: 0, behavior: 'instant' }); $('#question-title').setAttribute('tabindex', '-1'); $('#question-title').focus({ preventScroll: true });
  }
  function finishGame() {
    const run = state.quiz;
    if (!run) return;
    const record = { id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, level: run.level, topic: run.topic, score: run.score, duration: Math.max(1, Math.round((Date.now() - run.started) / 1000)), correct: run.answers.filter(a => a.correct).length, total: run.questions.length, date: Date.now(), practice: run.practice, questionIds: run.questions.map(q => q.id) };
    state.result = { run, record, saved: false };
    if (!run.practice) { data.sessions.push(record); data.sessions = data.sessions.slice(-500); persist(); }
    state.quiz = null;
    go('result', true);
  }
  function result() {
    const res = state.result;
    if (!res) return go('home', true);
    const { run, record } = res;
    const percent = Math.round(record.correct / record.total * 100);
    const title = percent === 100 ? '全答对了，漂亮的一局！' : percent >= 66 ? '做得不错，又进步了一点！' : '第一步迈出，就有了收获！';
    $('#main').innerHTML = `<div class="result-banner fade-in">${percent === 100 ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 20 }, (_, i) => `<i style="left:${i * 5}%;animation-delay:${i % 5 * .08}s"></i>`).join('')}</div>` : ''}<div class="result-icon">${icon(percent === 100 ? 'trophy' : 'flag')}</div><h1>${title}</h1><p>${run.practice ? '错题练习完成 · 本次成绩不上排行榜' : `${run.level} · ${TOPICS[run.topic]} · 挑战完成`}</p><div class="result-score">${record.score}<small>积分</small></div><div class="result-stats"><div><strong>${record.correct} / ${record.total}</strong><small>答对题数</small></div><div><strong>${percent}%</strong><small>正确率</small></div><div><strong>${duration(record.duration)}</strong><small>完成用时</small></div><div><strong>${run.bestStreak}</strong><small>最高连击</small></div></div><div class="result-actions"><button class="primary-button" id="play-again">${icon('refresh')}再挑战一次</button><button class="secondary-button" id="result-home">返回大厅 ${icon('arrow')}</button></div></div>${warning()}<div class="result-layout"><section><div class="section-head"><h2>这一局，带走这些知识</h2><span>${run.questions.length} 道题 · 完整回顾</span></div><div class="answer-review">${run.questions.map((q, i) => `<article class="review-item"><div class="review-top ${run.answers[i].correct ? 'is-correct' : ''}">${icon(run.answers[i].correct ? 'checkcircle' : 'cross')}<h3>${i + 1}. ${esc(q.title)}</h3></div><p class="answer-label">正确答案：${esc(q.options[q.answer])}</p>${!run.answers[i].correct ? `<p>你的选择：${esc(q.options[run.answers[i].selected])}</p>` : ''}<p>${esc(q.explanation)}</p><p>✧ ${esc(q.takeaway)}</p></article>`).join('')}</div></section><aside><section class="panel"><div class="panel-title"><span>${icon('trophy')}${run.practice ? '把知识带回工作' : '留下你的挑战记录'}</span></div>${run.practice ? '<p class="form-note">错题练习不参与排行。理解后，可在错题本点击“已掌握”移除该题。</p><button class="secondary-button full-width" id="result-mistakes" style="margin-top:15px">打开错题本</button>' : res.saved ? `<div class="saved-message">${icon('checkcircle')}成绩已保存到企业共享排行榜。<br>${esc(res.savedName)}，下次继续加油！</div><button class="secondary-button full-width" id="result-board" style="margin-top:15px">查看排行榜 ${icon('arrow')}</button>` : `<form class="save-form" id="save-score-form"><p class="verified-identity">以飞书身份 <strong>${esc(window.FEISHU_USER.name)}</strong> 保存本次成绩</p><button class="primary-button full-width" type="submit">保存成绩 ${icon('arrow')}</button><p class="form-note">成绩将保存到企业共享排行榜，按飞书身份展示每个分组的最佳成绩。</p></form>`}</section>${record.correct < record.total ? `<section class="knowledge-teaser" style="margin-top:18px;display:block"><div class="teaser-label">${icon('bookmark')} LEARN FROM MISTAKES</div><h3>没关系，知识正在生长。</h3><p>本局错题已加入错题本，<br>随时再练一遍。</p><button id="review-mistakes">去巩固一下 ${icon('arrow')}</button></section>` : ''}</aside></div>`;
    $('#play-again').onclick = () => run.practice ? begin(run.questions.map(q => prepare(bank.find(x => x.id === q.id))), true) : (state.level = run.level, state.topic = run.topic, startGame());
    $('#result-home').onclick = () => go('home');
    if ($('#save-score-form')) {
      $('#save-score-form').onsubmit = e => { e.preventDefault(); if (res.saved) return; const submitButton = $('#save-score-form button[type=submit]'); submitButton.disabled = true; const name = window.FEISHU_USER.name; fetch('/api/leaderboard', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ record }) }).then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || '成绩保存失败'); data.name = name; data.records.push({ ...record, name }); data.records = data.records.slice(-200); persist(); res.saved = true; res.savedName = name; await refreshSharedBoard(record.level, record.topic, true); syncChrome(); result(); toast('成绩已保存到企业排行榜！'); }).catch(error => { toast(error.message || '成绩保存失败，请稍后重试。'); $('#save-score-form button[type=submit]')?.removeAttribute('disabled'); }); };
    }
    if ($('#result-board')) $('#result-board').onclick = () => { state.boardLevel = record.level; state.boardTopic = record.topic; go('leaderboard'); };
    if ($('#review-mistakes')) $('#review-mistakes').onclick = () => go('mistakes');
    if ($('#result-mistakes')) $('#result-mistakes').onclick = () => go('mistakes');
  }
  function leaderboard() {
    const key = boardKey(state.boardLevel, state.boardTopic);
    const rows = sharedBoards.get(key)?.records || [];
    $('#main').innerHTML = `${heading('A LITTLE FRIENDLY COMPETITION', '每一次挑战，都值得被看见', '和自己比一比，也让下一次多一点动力。', `<span class="subtle-pill">${icon('trophy')}企业共享排行榜</span>`)}${warning()}<div class="filters-bar">${segments(state.boardLevel)}<select class="select" id="board-topic" aria-label="排行榜练习方向">${Object.entries(TOPICS).map(([k, v]) => `<option value="${k}" ${state.boardTopic === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div><section class="board-wrap fade-in"><div class="board-caption"><strong>${LEVELS[state.boardLevel].display} · ${TOPICS[state.boardTopic]}</strong><span>每人最佳成绩 · 积分降序 · 同分用时短者优先 · 前 20 名</span></div>${rows.length ? `<div class="table-scroll"><table><thead><tr><th>排名</th><th>挑战者</th><th>积分</th><th>答对题数</th><th>用时</th><th>挑战日期</th></tr><tbody>${rows.map((r, i) => `<tr><td><span class="rank-medal">${String(i + 1).padStart(2, '0')}</span></td><td>${esc(r.name)}</td><td class="table-score">${r.score}</td><td>${r.correct} / ${r.total}</td><td>${duration(r.duration)}</td><td>${new Date(r.date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit' })}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><div class="empty-symbol">${icon('trophy')}</div><h2>这里的第一名，会是你吗？</h2><p>${sharedBoardErrors.has(key) ? esc(sharedBoardErrors.get(key)) : '当前分组还没有成绩。完成 20 道题并保存成绩，就能留下你的挑战记录。'}</p>${sharedBoardErrors.has(key) ? '<button class="secondary-button" id="board-retry">重试读取</button>' : `<button class="primary-button" id="board-start">去挑战 ${icon('arrow')}</button>`}</div>`}</section><p class="board-note">成绩保存在企业共享数据库，所有飞书登录员工可查看。每人按飞书身份保留各难度和练习方向的最佳成绩。</p>`;
    document.querySelectorAll('[data-board-level]').forEach(b => b.onclick = () => { state.boardLevel = b.dataset.boardLevel; leaderboard(); });
    $('#board-topic').onchange = e => { state.boardTopic = e.target.value; leaderboard(); };
    if ($('#board-start')) $('#board-start').onclick = () => { state.level = state.boardLevel; state.topic = state.boardTopic; startGame(); };
    if ($('#board-retry')) $('#board-retry').onclick = async () => { sharedBoardErrors.delete(key); await refreshSharedBoard(state.boardLevel, state.boardTopic, true); leaderboard(); };
    ensureSharedBoard(state.boardLevel, state.boardTopic, 'leaderboard');
  }
  async function admin() {
    if (!window.FEISHU_IS_ADMIN) { go('home', true); return; }
    $('#main').innerHTML = `${heading('ADMINISTRATION', '用户访问记录', '查看飞书成员成功扫码登录这套学习游戏的时间。') }<section class="panel"><div class="admin-toolbar"><span id="visit-count">正在读取访问记录…</span><button class="secondary-button" id="visits-refresh">刷新记录 ${icon('refresh')}</button></div><div id="visits-content" class="admin-visits"></div></section>`;
    const content = $('#visits-content');
    const load = async () => {
      content.innerHTML = '<div class="empty-state"><p>正在读取记录…</p></div>';
      try {
        const response = await fetch('/api/admin/visits?limit=500', { credentials: 'same-origin', cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '读取失败');
        const visits = result.visits || [];
        $('#visit-count').textContent = `最近 ${visits.length} 条成功登录记录`;
        content.innerHTML = visits.length ? `<table><thead><tr><th>用户</th><th>访问时间</th></tr></thead><tbody>${visits.map(v => `<tr><td><div class="visit-user">${avatarMarkup({ name: v.name, avatar_url: v.avatar_url })}<strong>${esc(v.name || '飞书用户')}</strong></div></td><td>${new Date(v.visited_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state"><p>还没有成功登录记录。</p></div>';
      } catch (error) {
        $('#visit-count').textContent = '记录读取失败';
        content.innerHTML = `<div class="empty-state"><p>${esc(error.message || '读取失败，请重试。')}</p></div>`;
      }
    };
    $('#visits-refresh').onclick = load;
    await load();
  }
  const template = '任务：请把以下物流异常记录整理成跟进清单。\n背景：供内部业务同事核对与处理。\n输入：粘贴已经获得授权、去掉个人敏感信息的记录。\n约束：只依据输入，不补造时间、原因、责任人或客户承诺；缺失写“待确认”；区分事实与推测。\n输出：表格，列为记录标识、异常事实、业务影响、待确认事项、下一步；保留来源标识。\n校验：列出已处理记录数、重复或冲突记录，以及需要人工确认的内容。';
  function knowledge() {
    const cards = [
      { t: 'ai', title: '先把问题，问清楚', subtitle: 'AI 与提示词 · 从 0 到 1', items: ['任务：你希望 AI 具体做什么？', '背景：给谁看，用于什么场景？', '约束：不能猜什么，哪些内容需确认？', '格式：需要表格、清单还是一段话？'] },
      { t: 'b2b', title: '看懂一次企业交付', subtitle: 'To B · 从订单到交接', items: ['分清订单、商品行、运单与交付任务。', '预约、容量和收货条件需要明确。', '到达不等于签收，状态需有证据。', '统计先定范围、唯一键与完成条件。'] },
      { t: 'b2c', title: '读懂一个包裹的旅程', subtitle: 'To C · 从揽收到签收', items: ['一笔订单可能对应多个包裹。', '关注事件时间、最新轨迹与来源。', '无新轨迹不直接等于丢件。', '客户沟通用事实，承诺需要依据。'] }
    ];
    $('#main').innerHTML = `${heading('A REFILL FOR YOUR CURIOSITY', '知识补给站', '不用一次记住所有概念。带着一个方法，回到下一个场景。')}<div class="knowledge-grid fade-in">${cards.map(c => `<article class="knowledge-card"><div class="knowledge-icon">${icon(topicIcon(c.t))}</div><h2>${c.title}</h2><p>${c.subtitle}</p><ul class="knowledge-list">${c.items.map(x => `<li>${x}</li>`).join('')}</ul><button class="secondary-button" data-learn-topic="${c.t}">试试这类题目 ${icon('arrow')}</button></article>`).join('')}</div><section class="prompt-box"><h2>你的第一份物流提示词小抄 <button id="copy-template">复制模板 ↗</button></h2><pre id="prompt-text">${esc(template)}</pre></section><div class="source-links">延伸阅读：<a href="https://www.ibm.com/think/topics/prompt-engineering-techniques" target="_blank" rel="noopener noreferrer">IBM · 提示词的清晰指令、背景与示例</a> <span class="footer-dot">·</span> <a href="https://www.gs1.org/standards/epcis" target="_blank" rel="noopener noreferrer">GS1 · 物流事件中的对象、时间、地点与业务上下文</a><br>本页为入门教学整理；题目中的企业流程与指标均以题内约定为准，具体工作以公司已批准的业务规则为准。</div>`;
    document.querySelectorAll('[data-learn-topic]').forEach(b => b.onclick = () => { state.topic = b.dataset.learnTopic; go('home'); });
    $('#copy-template').onclick = async () => {
      try { await navigator.clipboard.writeText(template); toast('提示词模板已复制'); }
      catch { modal(`${modalHead('复制提示词模板')}<p>浏览器未允许自动复制。请选中下方文字后手动复制。</p><textarea class="text-input" id="manual-copy" rows="10" readonly>${esc(template)}</textarea><button class="primary-button full-width" data-close>完成</button>`); $('#manual-copy').select(); }
    };
  }
  function videoLearning() {
    const lessons = [
      { file: '01_AI零基础_认识人工智能', title: '认识人工智能', level: '入门', duration: '约 1 分 48 秒', goal: '知道 AI 能做什么、容易在哪里答错，以及如何安全核对。', points: ['生成式 AI 擅长整理和起草，不是业务系统。', '材料没有提供的信息要标成“待核实”。', '输入前保护隐私，输出后复核事实与承诺。'] },
      { file: '02_提示词入门_让AI听懂任务', title: '提示词入门', level: '基础', duration: '约 1 分 45 秒', goal: '用任务、背景、限制和输出格式四部分说明需求。', points: ['任务说清楚要完成的动作。', '背景只提供完成任务所需的事实。', '限制和格式帮助检查答案是否越界。'] },
      { file: '03_ToB物流_异常整理与处理清单', title: 'To B 物流异常处理', level: '应用', duration: '约 1 分 46 秒', goal: '从企业物流记录整理事实、未知项和下一步核实清单。', points: ['分开记录已知事实与缺失信息。', 'AI 可以草拟待办，不能把建议写成已完成动作。', '客户承诺与责任判断由业务负责人确认。'] },
      { file: '04_ToC物流_包裹查询与客服回复', title: 'To C 包裹查询与客服回复', level: '进阶', duration: '约 1 分 48 秒', goal: '根据追踪信息拟写友好、准确且不过度承诺的回复。', points: ['先说明已确认的物流进度。', '没有预计时间就不承诺送达日期。', '投诉和高风险情况按公司流程升级。'] },
    ];
    $('#main').innerHTML = `${heading('LEARN STEP BY STEP', '视频学习', '从认识 AI 开始，循序练习提示词，再把方法用在 To B 和 To C 物流场景。')}<div class="video-course-intro"><strong>建议按顺序学习</strong><span>4 节 · 约 7 分钟 · 简体中文字幕 · 配套 WPS / Word 手册</span><a class="secondary-button" href="learning-videos/AI物流视频学习手册.docx" download>下载学习手册 ${icon('arrow')}</a></div><div class="video-course-grid fade-in">${lessons.map((lesson, i) => `<article class="video-course-card"><div class="video-course-head"><span class="video-course-number">0${i + 1}</span><div><span class="video-course-level">${lesson.level} · ${lesson.duration}</span><h2>${lesson.title}</h2></div></div><video controls preload="metadata" playsinline aria-label="课程视频：${lesson.title}"><source src="learning-videos/${lesson.file}.mp4" type="video/mp4"><track kind="captions" src="learning-videos/${lesson.file}.vtt" srclang="zh-CN" label="简体中文字幕" default>当前浏览器无法播放此视频。</video><p class="video-course-goal">${lesson.goal}</p><ul>${lesson.points.map(point => `<li>${point}</li>`).join('')}</ul><div class="video-course-links"><a href="learning-videos/${lesson.file}.srt" download>下载字幕</a><a href="learning-videos/${lesson.file}.mp4" download>下载视频</a></div></article>`).join('')}</div><p class="video-course-note">案例中的客户、订单代号和状态均为教学虚构内容。视频以画面文字和中文字幕呈现；涉及真实工作时，请按已批准的业务规则处理。</p>`;
  }
  function mistakes() {
    const list = [...data.mistakes].reverse().map(m => ({ ...m, q: bank.find(q => q.id === m.id) })).filter(m => m.q);
    $('#main').innerHTML = `${heading('EVERY MISTAKE IS A NEW START', '把没懂的，再学一遍', '错题不是扣分项，是留给下一次的进步空间。')}${warning()}${list.length ? `<div class="mistake-actions"><button class="primary-button" id="practice-mistakes">${icon('refresh')}练习全部错题</button><span class="counter">共 ${list.length} 道错题 · 练习不计排行榜</span></div><div class="mistake-list fade-in">${list.map(({ q, wrongAnswer }) => `<article class="review-item"><div class="section-head"><span class="topic-tag">${q.level} · ${TOPICS[q.topic]}</span></div><h3>${esc(q.title)}</h3><p>上次选择：${esc(wrongAnswer)}</p><div class="mistake-item-actions"><details><summary>展开答案与解析</summary><p><span class="answer-label">正确答案：${esc(q.options[q.answer])}</span><br>${esc(q.explanation)}<br>✧ ${esc(q.takeaway)}</p></details><button data-mastered="${q.id}" class="remove">已掌握，移出错题本 ✓</button></div></article>`).join('')}</div>` : `<section class="panel"><div class="empty-state"><div class="empty-symbol">${icon('bookmark')}</div><h2>这里暂时还是空白的</h2><p>答错的题目会自动收进来。完成一次挑战，看看自己已经掌握了多少。</p><button class="primary-button" id="mistake-start">去挑战 ${icon('arrow')}</button></div></section>`}`;
    if ($('#practice-mistakes')) $('#practice-mistakes').onclick = () => begin(GameCore.shuffle(list).map(({ q }) => prepare(q)), true);
    if ($('#mistake-start')) $('#mistake-start').onclick = () => go('home');
    document.querySelectorAll('[data-mastered]').forEach(b => b.onclick = () => { data.mistakes = data.mistakes.filter(m => m.id !== b.dataset.mastered); persist(); syncChrome(); mistakes(); toast('已移出错题本，继续保持！'); });
  }
  function render() { syncChrome(); ({ home, challenge: quiz, result, leaderboard, knowledge, videos: videoLearning, mistakes, admin }[state.page] || home)(); }
  document.addEventListener('keydown', e => {
    if (state.page !== 'challenge' || !state.quiz || $('#modal').open || e.altKey || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (['1', '2', '3', '4'].includes(e.key) && !state.quiz.answered) { e.preventDefault(); choose(Number(e.key) - 1); }
    if (e.key === 'Enter' && (e.target.tagName !== 'BUTTON' || e.target.closest('[data-option]'))) { e.preventDefault(); state.quiz.answered ? nextQuestion() : submitAnswer(); }
  });
  setInterval(() => { if (state.page === 'challenge' && state.quiz && $('#quiz-clock')) $('#quiz-clock').textContent = duration((Date.now() - state.quiz.started) / 1000); }, 1000);
  const initialPage = location.hash.slice(1);
  state.page = ['home', 'leaderboard', 'knowledge', 'mistakes'].includes(initialPage) || (initialPage === 'admin' && window.FEISHU_IS_ADMIN) ? initialPage : 'home';
  render();
})();
