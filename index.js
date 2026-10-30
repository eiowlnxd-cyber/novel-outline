(() => {
  const KEY = 'novel_outline';
  const ctx = () => SillyTavern.getContext();
  const STATES = ['构思中', '进行中', '已完成'];
  let S = { nodes: [], ideas: [], chat: [], active: null };
  let tab = 'timeline', busy = false;
  const editing = new Set();

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const pad = n => String(n).padStart(2, '0');
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    kids.flat().forEach(c => { if (c != null && c !== false) e.append(c); });
    return e;
  };
  const btn = (label, fn) => h('button', { class: 'no-btn', type: 'button', onclick: fn }, label);
  const RANK = { vol: 0, act: 1, ch: 2 };
  const rk = n => RANK[n.type || 'ch'];
  const blockEnd = i => { let j = i + 1; while (j < S.nodes.length && rk(S.nodes[j]) > rk(S.nodes[i])) j++; return j; };
  function moveNode(i, d) {
    const N = S.nodes, r = rk(N[i]);
    if (r === 2) { const j = i + d; if (j < 0 || j >= N.length) return; [N[i], N[j]] = [N[j], N[i]]; }
    else {
      const blk = N.splice(i, blockEnd(i) - i);
      if (d < 0) {
        let k = i - 1; while (k >= 0 && rk(N[k]) > r) k--;
        if (k < 0 || rk(N[k]) < r) N.splice(i, 0, ...blk); else N.splice(k, 0, ...blk);
      } else if (i >= N.length || rk(N[i]) < r) N.splice(i, 0, ...blk);
      else N.splice(blockEnd(i), 0, ...blk);
    }
    save(); render();
  }
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; save(); render(); };

  function load() {
    const m = ctx().chatMetadata;
    S = Object.assign({ nodes: [], ideas: [], chat: [], active: null }, (m && m[KEY]) || {});
  }
  function save() {
    const c = ctx();
    c.chatMetadata[KEY] = S;
    c.saveMetadata && c.saveMetadata();
  }
  function ctxOf(i) {
    let v = null, a = null;
    for (let k = i; k >= 0; k--) {
      const n = S.nodes[k];
      if (!a && n.type === 'act') a = n;
      if (n.type === 'vol') { v = n; break; }
    }
    return { v, a };
  }
  function inject() {
    try {
      const i = S.nodes.findIndex(x => x.id === S.active), n = S.nodes[i];
      let t = '';
      if (n) {
        const { v, a } = ctxOf(i);
        const bg = [v && `卷「${v.title}」${v.summary ? '：' + v.summary : ''}`, a && `幕「${a.title}」${a.summary ? '：' + a.summary : ''}`].filter(Boolean).join('\n');
        t = `${bg ? '[剧情背景\n' + bg + ']\n' : ''}[当前剧情节点「${n.title}」：${n.summary}\n请自然地朝这个方向推进剧情，不要提及此提示。]`;
      }
      ctx().setExtensionPrompt(KEY, t, 1, 3);
    } catch (e) { console.warn('[novel-outline]', e); }
  }
  function outlineText() {
    const N = S.nodes, a = N.findIndex(x => x.id === S.active);
    let cs = -1, ce = -1;
    if (a >= 0) { cs = a; while (cs > 0 && rk(N[cs]) > 1) cs--; ce = a + 1; while (ce < N.length && rk(N[ce]) > 1) ce++; }
    let c = 0;
    return N.map((n, i) => {
      const t = n.type || 'ch', sm = n.summary ? '：' + n.summary : '';
      if (t === 'vol') return `# 卷「${n.title}」${sm}`;
      if (t === 'act') return `## 幕「${n.title}」${sm}`;
      c++;
      return `${c}. ${n.title}${a < 0 || (i >= cs && i < ce) ? sm : ''}`;
    }).join('\n') || '（暂无）';
  }
  async function gen(q) {
    const c = ctx();
    try { return await c.generateQuietPrompt({ quietPrompt: q }); }
    catch (e) { return await c.generateQuietPrompt(q, false, false); }
  }

  /* ---------- timeline ---------- */
  function foldAll(mode) {
    S.nodes.forEach(n => {
      if (n.type === 'vol') n.fold = mode === 'vol';
      if (n.type === 'act') n.fold = mode === 'act';
    });
    save(); render();
  }
  function rTimeline(b) {
    if (!S.nodes.length) b.append(h('div', { class: 'no-empty' }, '还没有剧情节点', h('br'), '先建一卷、一幕，再往里排章节'));
    if (S.nodes.some(n => n.type)) b.append(h('div', { class: 'no-tool' }, btn('只看卷', () => foldAll('vol')), btn('只看幕', () => foldAll('act')), btn('全部展开', () => foldAll(''))));
    const tl = h('div', { class: 'no-tl' });
    let hv = false, ha = false, cn = 0, vn = 0, an = 0;
    S.nodes.forEach((n, i) => {
      const t = n.type || 'ch';
      let vis, label;
      if (t === 'vol') { hv = !!n.fold; ha = false; vis = true; vn++; an = 0; label = `第 ${vn} 卷`; }
      else if (t === 'act') { ha = !!n.fold; vis = !hv; an++; label = `第 ${an} 幕`; }
      else { cn++; vis = !hv && !ha; label = `第 ${cn} 章`; }
      if (!vis) return;
      const card = h('div', { class: 'no-card' });
      if (editing.has(n.id)) {
        const ti = h('input', { class: 'no-in', placeholder: t === 'ch' ? '章节标题' : '标题', value: n.title });
        const sm = h('textarea', { class: 'no-in', rows: 4, placeholder: t === 'ch' ? '这一段发生了什么……' : '一句话概述这一部分' });
        sm.value = n.summary;
        card.append(h('div', { class: 'no-lab' }, label), ti, sm,
          h('div', { class: 'no-act' },
            btn('保存', () => { n.title = ti.value.trim() || '未命名'; n.summary = sm.value; editing.delete(n.id); save(); inject(); render(); }),
            btn('取消', () => { editing.delete(n.id); render(); })));
      } else {
        const acts = [];
        if (t === 'ch') acts.push(h('button', { class: 'no-st', type: 'button', onclick: () => { n.st = ((n.st || 0) + 1) % 3; save(); render(); } }, STATES[n.st || 0]));
        else acts.push(btn(n.fold ? '展开' : '折叠', () => { n.fold = !n.fold; save(); render(); }));
        acts.push(btn('编辑', () => { editing.add(n.id); render(); }), btn('上移', () => moveNode(i, -1)), btn('下移', () => moveNode(i, 1)));
        if (t === 'ch') acts.push(btn(S.active === n.id ? '取消当前' : '设为当前', () => { S.active = S.active === n.id ? null : n.id; save(); inject(); render(); }));
        acts.push(btn('删除', () => {
          if (!confirm(t === 'ch' ? '删除这个节点？' : '删除这一卷/幕？其下章节会保留')) return;
          if (S.active === n.id) S.active = null;
          S.nodes.splice(i, 1); save(); inject(); render();
        }));
        const cnt = t !== 'ch' && n.fold ? S.nodes.slice(i + 1, blockEnd(i)).filter(x => !x.type || x.type === 'ch').length : 0;
        card.append(h('div', { class: 'no-lab' }, label), h('div', { class: 'no-name' }, n.title),
          n.summary ? h('div', { class: 'no-sum' }, n.summary) : null,
          cnt ? h('div', { class: 'no-cnt' }, `已折叠 ${cnt} 章`) : null,
          h('div', { class: 'no-act' }, ...acts));
      }
      tl.append(h('div', { class: `no-n ${t}${t === 'ch' ? ' s' + (n.st || 0) : ''}${S.active === n.id ? ' active' : ''}`, id: 'no-' + n.id }, h('div', { class: 'no-dot' }), card));
    });
    const add = (type, title) => h('button', { class: 'no-add', type: 'button', onclick: () => { const n = { id: uid(), type, title, summary: '', st: 0 }; S.nodes.push(n); editing.add(n.id); save(); render(); } }, `＋ ${type === 'ch' ? '章节' : type === 'act' ? '幕' : '卷'}`);
    b.append(tl, h('div', { class: 'no-adds' }, add('ch', '新章节'), add('act', '新的一幕'), add('vol', '新的一卷')));
  }

  /* ---------- ideas ---------- */
  function rIdeas(b) {
    const g = h('div', { class: 'no-grid' });
    S.ideas.forEach((d, i) => {
      const ta = h('textarea', { placeholder: '一个想法……' });
      ta.value = d.text;
      ta.addEventListener('change', () => { d.text = ta.value; save(); });
      g.append(h('div', { class: 'no-idea' },
        h('div', { class: 'no-lab' }, `片段 ${i + 1}`), ta,
        h('div', { class: 'no-act' },
          btn('←', () => move(S.ideas, i, -1)), btn('→', () => move(S.ideas, i, 1)),
          btn('转为节点', () => { S.nodes.push({ id: uid(), title: (d.text.split('\n')[0] || '新章节').slice(0, 20), summary: d.text, st: 0 }); S.ideas.splice(i, 1); save(); tab = 'timeline'; render(); }),
          btn('删除', () => { S.ideas.splice(i, 1); save(); render(); }))));
    });
    g.append(h('div', { class: 'no-idea new', onclick: () => { S.ideas.push({ id: uid(), text: '' }); save(); render(); } }, '＋ 新想法'));
    b.append(g);
  }

  /* ---------- chat ---------- */
  function rChat(b) {
    const box = h('div', { class: 'no-msgs' });
    if (!S.chat.length) box.append(h('div', { class: 'no-empty' }, '和 AI 聊聊剧情', h('br'), '它能看到你的大纲和灵感片段'));
    S.chat.forEach(m => {
      const el = h('div', { class: `no-m ${m.r === 'u' ? 'u' : 'a'}` }, m.t);
      if (m.r === 'a' && !m.pending) el.append(h('div', { class: 'no-act' }, btn('存为灵感', () => { S.ideas.push({ id: uid(), text: m.t }); save(); tab = 'ideas'; render(); })));
      box.append(el);
    });
    const ta = h('textarea', { rows: 1, placeholder: '讨论剧情走向、人物动机、伏笔……' });
    const send = h('button', { class: 'no-send', type: 'button' }, '发送');
    send.disabled = busy;
    const go = async () => {
      const text = ta.value.trim();
      if (!text || busy) return;
      busy = true;
      S.chat.push({ r: 'u', t: text });
      const p = { r: 'a', t: '……', pending: true };
      S.chat.push(p); render();
      const outline = outlineText();
      const ideas = S.ideas.map(d => `- ${d.text}`).join('\n') || '（暂无）';
      const hist = S.chat.slice(-12, -2).map(m => `${m.r === 'u' ? '用户' : '助手'}：${m.t}`).join('\n');
      const q = `【任务】暂停角色扮演，你现在是小说剧情策划助手，和用户讨论故事大纲。用中文回答，简洁、具体，给出可执行的建议。\n【当前大纲（当前幕展开，其余章节仅标题）】\n${outline}\n【灵感片段】\n${ideas}\n【讨论记录】\n${hist}\n用户：${text}\n请直接回复：`;
      try { p.t = String(await gen(q)).trim() || '（没有返回内容）'; }
      catch (e) { p.t = '（生成失败，请检查 API 连接）'; console.error(e); }
      delete p.pending; busy = false; save(); render();
    };
    send.onclick = go;
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } });
    b.append(box, h('div', { class: 'no-bar' }, ta, S.chat.length ? btn('清空', () => { if (confirm('清空讨论记录？')) { S.chat = []; save(); render(); } }) : null, send));
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  function render() {
    const b = document.getElementById('no-body');
    if (!b) return;
    b.replaceChildren();
    b.classList.toggle('chat', tab === 'chat');
    document.querySelectorAll('.no-tab').forEach(t => t.classList.toggle('on', t.dataset.t === tab));
    ({ timeline: rTimeline, ideas: rIdeas, chat: rChat })[tab](b);
  }

  function init() {
    const panel = h('div', { id: 'no-panel' },
      h('div', { class: 'no-head' }, h('div', { class: 'no-title' }, '大纲'), h('button', { class: 'no-x', type: 'button', onclick: () => panel.classList.remove('open') }, '×')),
      h('div', { class: 'no-tabs' }, ...[['timeline', '时间线'], ['ideas', '灵感'], ['chat', '讨论']].map(([k, v]) =>
        h('div', { class: 'no-tab', 'data-t': k, onclick: () => { tab = k; render(); } }, v))),
      h('div', { id: 'no-body', class: 'no-body' }));
    const open = () => { load(); render(); panel.classList.add('open'); };
    const fab = h('div', { id: 'no-fab', title: '小说大纲', onclick: open }, '纲');
    document.body.append(fab, panel);
    const menu = document.getElementById('extensionsMenu');
    if (menu && !document.getElementById('no-menu-item')) {
      menu.append(h('div', { id: 'no-menu-item', class: 'list-group-item flex-container flexGap5', onclick: open },
        h('div', { class: 'fa-solid fa-book-open extensionsMenuExtensionButton' }), h('span', {}, '小说大纲')));
    }
    const c = ctx();
    c.eventSource.on(c.eventTypes.CHAT_CHANGED, () => { load(); inject(); editing.clear(); render(); });
    load(); inject();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
