(() => {
  const KEY = 'novel_outline';
  const ctx = () => SillyTavern.getContext();
  const STATES = ['构思中', '进行中', '已完成'];
  const DEF = { layout: 'zig', dots: true, ai: '' };
  let S = { nodes: [], ideas: [], themes: [], chat: [], active: null };
  let tab = 'timeline', busy = false, openId = null, cfgOpen = false, justDragged = false;
  const editing = new Set();

  /* ---------- styles (injected, prefixed so ST themes can't override) ---------- */
  const CSS = `
#no-panel{position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;height:100dvh !important;max-width:none !important;margin:0 !important;z-index:99999 !important;background:#fff !important;color:#111 !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;visibility:hidden;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .24s ease,transform .34s cubic-bezier(.2,.75,.25,1),visibility 0s linear .34s;font-family:Inter,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box}
#no-panel.open{visibility:visible;opacity:1;pointer-events:auto;transform:translateY(0);transition:opacity .24s ease,transform .34s cubic-bezier(.2,.75,.25,1),visibility 0s}
*{box-sizing:border-box}
button,input,textarea,select{font-family:inherit;color:inherit;-webkit-appearance:none;appearance:none;margin:0;border-radius:0;text-shadow:none;box-shadow:none}
button{font-weight:400}
.no-head{flex:none;display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid #ededed;min-height:58px}
.no-title{font-family:"Noto Serif SC","Songti SC",serif;font-size:16px;font-weight:500;letter-spacing:.28em;color:#111}
.no-x{position:relative;width:42px;height:42px;flex:none;cursor:pointer;margin:0 -10px 0 0;opacity:.62;transition:opacity .22s ease,transform .28s ease}
.no-x:hover{opacity:1;transform:rotate(90deg)}
.no-x::before,.no-x::after{content:"";position:absolute;left:12px;top:20.5px;width:18px;height:1px;background:#111}
.no-x::before{transform:rotate(45deg)}
.no-x::after{transform:rotate(-45deg)}
.no-tabs{flex:none;display:flex;border-bottom:1px solid #ededed;padding:0 14px}
.no-tab{position:relative;flex:1;text-align:center;padding:14px 0 13px;font-size:13px;letter-spacing:.18em;color:#999;cursor:pointer;transition:color .24s ease}
.no-tab::after{content:"";position:absolute;left:50%;right:50%;bottom:-1px;height:1px;background:#111;transition:left .28s cubic-bezier(.2,.75,.25,1),right .28s cubic-bezier(.2,.75,.25,1)}
.no-tab.on{color:#111}
.no-tab.on::after{left:25%;right:25%}
.no-body{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;width:100%;max-width:760px;margin:0 auto;padding:24px 20px 52px;scroll-behavior:smooth}
.no-body.chat{display:flex;flex-direction:column;padding-bottom:16px}
.no-btn{background:none;border:0;border-bottom:1px solid transparent;padding:2px 0;font-size:12px;cursor:pointer;opacity:.66;color:#111;transition:opacity .2s ease,color .2s ease,border-color .2s ease,transform .2s ease}
.no-btn:hover{opacity:1;border-bottom-color:#111}
.no-btn:active{transform:translateY(1px)}
.no-empty{text-align:center;color:#999;font-size:13px;line-height:2.1;padding:56px 0}
.no-tool{display:flex;flex-wrap:wrap;gap:20px;margin-bottom:20px}
.no-cfg{border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8;padding:14px 0;margin-bottom:28px;display:flex;flex-direction:column;gap:14px}
.no-seg{display:flex;align-items:center;gap:16px;font-size:12px;color:#777;flex-wrap:wrap}
.no-sb{border:0;border-bottom:1px solid transparent;background:transparent;color:#888;padding:4px 0;font-size:12px;cursor:pointer;transition:color .2s ease,border-color .2s ease}
.no-sb+.no-sb{margin-left:0}
.no-sb.on{color:#111;border-bottom-color:#111;background:transparent}

/* Timeline: one continuous line, with unboxed text placed alongside it. */
.no-tl{position:relative;padding:14px 0 8px;display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr);column-gap:14px}
.no-tl::before{content:"";position:absolute;top:0;bottom:0;width:1px;background:#111}
.m-zig::before{left:50%;transform:translateX(-.5px)}
.m-left::before{left:8px}
.m-right::before{right:8px}
.no-n{position:relative;margin:0 0 34px;min-height:20px;grid-column:1 / 4;display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr);column-gap:14px;align-items:start}
.no-c{position:relative;font-size:14px;min-width:0}
.m-zig .no-n .no-c{width:auto;max-width:100%;grid-row:1}
.m-zig .no-n.L .no-c{grid-column:1;text-align:right}
.m-zig .no-n.R .no-c{grid-column:3;text-align:left}
.m-left .no-n .no-c{margin-left:30px}
.m-right .no-n .no-c{margin-right:30px;text-align:right}
.no-dot{display:none !important}
.no-lab{font-size:10px;letter-spacing:.16em;color:#999;margin-bottom:5px}
.no-name{font-family:"Noto Serif SC","Songti SC",serif;font-size:18px;font-weight:500;line-height:1.55;color:#111;overflow-wrap:anywhere}
.no-n.active .no-name{font-weight:700}
.no-sum{font-size:13px;line-height:1.9;color:#555;white-space:pre-wrap;margin-top:5px;overflow-wrap:anywhere}
.no-cnt{font-size:11px;color:#999;margin-top:8px;letter-spacing:.04em}.no-chapter-items{margin-top:10px;color:#666;font-size:12px;line-height:2}.no-chapter-item{padding-left:8px;border-left:1px solid #d8d8d5;margin:5px 0}
.no-n.act{margin-top:12px}
.no-n.act:first-child{margin-top:0}
.no-n.act .no-name{font-size:19px;letter-spacing:.08em}
.no-act{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}
.m-right .no-act,.m-zig .no-n.L .no-act{justify-content:flex-end}
.no-st{font-size:11px;border:0;border-bottom:1px solid #bbb;padding:1px 0;cursor:pointer;background:none;color:#111;transition:border-color .2s ease,opacity .2s ease}
.no-st:hover{border-color:#111}
.no-n.ed .no-c{background:transparent;border:0;padding:0;z-index:2;max-width:none !important}
.no-n.ed .no-act{justify-content:flex-start !important}
.no-adds{display:flex;gap:20px;margin-top:10px}
.no-add{flex:1;padding:13px 4px;border:0;border-bottom:1px solid #e2e2e2;background:transparent;color:#777;font-size:12px;letter-spacing:.12em;cursor:pointer;transition:color .22s ease,border-color .22s ease}
.no-add:hover{color:#111;border-bottom-color:#111;background:transparent}
input.no-in,textarea.no-in{width:100%;border:0;border-bottom:1px solid #dcdcdc;background:transparent;padding:7px 0;font-size:15px;line-height:1.8;outline:none;resize:vertical;text-align:left;transition:border-color .2s ease}
input.no-in:focus,textarea.no-in:focus{border-bottom-color:#111}
textarea.no-in{margin-top:9px}

/* Ideas: a single vertical sequence of quiet, lightly outlined cards. */
.no-cap{border:0;border-bottom:1px solid #e7e7e7;background:transparent;padding:0 0 16px;margin-bottom:22px}
.no-cap textarea{width:100%;border:0;border-bottom:1px solid #e4e4e4;background:transparent;outline:none;resize:vertical;font-size:14px;line-height:1.9;min-height:66px;padding:5px 0 8px;transition:border-color .2s ease}
.no-cap textarea:focus{border-bottom-color:#111}
.no-cap-bar{display:flex;align-items:center;justify-content:space-between;margin-top:10px}
.no-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.no-thumbs img{width:42px;height:42px;object-fit:cover;filter:grayscale(1)}
.no-post{background:transparent;color:#111;border:0;border-bottom:1px solid #111;padding:4px 0;font-size:12px;letter-spacing:.14em;cursor:pointer;transition:opacity .2s ease,transform .2s ease}
.no-post:hover{opacity:.62}
.no-post:active{transform:translateY(1px)}
.no-grid{display:flex;flex-direction:column;gap:12px;align-items:stretch}
.no-idea{position:relative;width:100%;background:#f7f7f5;border:0;border-radius:10px;padding:16px 18px 14px;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:border-color .26s ease,background-color .26s ease,opacity .26s ease,transform .26s cubic-bezier(.2,.75,.25,1);font-size:13px;line-height:1.9;overflow:hidden;word-break:break-word}
.no-idea:hover{background:#f1f1ee}
.no-idea.drag{z-index:20;opacity:.82;box-shadow:none;transition:none;cursor:grabbing}
.no-idea.over{background:#eaeae6}
.no-idea.ed{background:#f7f7f5;user-select:text;-webkit-user-select:text;cursor:default}
.no-idea-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px;color:#999}
.no-idea-index{font-size:10px;letter-spacing:.13em;font-variant-numeric:tabular-nums}
.no-idea-time{flex:1;font-size:10px;letter-spacing:.05em}
.no-idea-grip{border:0;background:transparent;color:#aaa;padding:0 2px;font-size:17px;line-height:1;letter-spacing:-.18em;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;transition:color .2s ease,transform .2s ease}
.no-idea-grip:hover{color:#111}
.no-idea-grip:active{cursor:grabbing}
.no-img{display:block;width:100%;max-height:240px;object-fit:cover;margin:0 0 9px;filter:grayscale(1)}
.no-md>div{margin-bottom:2px}
.no-h{font-family:"Noto Serif SC","Songti SC",serif;font-weight:600;font-size:15px}
.no-q{border-left:1px solid #999;padding-left:9px;color:#555}
.no-li::before{content:"– "}
.no-tag{color:#555;font-size:12px;text-decoration:underline;text-decoration-color:#ccc;text-underline-offset:2px;cursor:default}
.no-meta{margin-top:8px;font-size:10px;color:#aaa;letter-spacing:.06em}
.no-ed-in{width:100%;border:0;border-bottom:1px solid #ddd;background:transparent;outline:none;resize:vertical;font-size:14px;line-height:1.9;min-height:90px;padding:5px 0;user-select:text;-webkit-user-select:text}
.no-edimgs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.no-edimgs div{position:relative}
.no-edimgs img{width:64px;height:64px;object-fit:cover;filter:grayscale(1)}
.no-edimgs span{position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:#111;color:#fff;font-size:12px;line-height:18px;text-align:center;cursor:pointer}

/* Discussion: editorial message rows, not hard speech-bubble boxes. */
.no-sel{width:auto;max-width:100%;flex:none;border:0;border-bottom:1px solid #dedede;background:transparent;padding:6px 0;font-size:12px;margin-bottom:12px;outline:none;color:#555}
.no-sel:focus{border-bottom-color:#111}
.no-msgs{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:0;padding:4px 0 18px;overscroll-behavior:contain}
.no-m{width:100%;max-width:100%;display:flex;flex-direction:column;padding:14px 0;border:0;border-bottom:1px solid #ededed;background:transparent;color:#111;font-size:14px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere}
.no-m.u{align-self:stretch;align-items:flex-end;text-align:right;background:transparent;color:#111}
.no-m.a{align-self:stretch;align-items:flex-start;text-align:left;background:transparent;color:#111}
.no-role{font-size:10px;letter-spacing:.16em;color:#999;margin-bottom:5px}
.no-m-text{max-width:94%}
.no-bar{flex:none;display:flex;gap:12px;align-items:flex-end;border-top:1px solid #e7e7e7;padding-top:12px}
.no-bar textarea{flex:1;min-width:0;border:0;border-bottom:1px solid #dedede;background:transparent;padding:7px 0;font-size:14px;line-height:1.7;resize:none;outline:none;max-height:120px;transition:border-color .2s ease}
.no-bar textarea:focus{border-bottom-color:#111}
.no-send{background:transparent;color:#111;border:0;border-bottom:1px solid #111;padding:7px 0;font-size:12px;letter-spacing:.14em;cursor:pointer;transition:opacity .2s ease,transform .2s ease}
.no-send:hover{opacity:.62}
.no-send:active{transform:translateY(1px)}
.no-send:disabled{opacity:.3}
`;

  const prefix = css => css.replace(/(^|\})\s*([^{}]+)\{/g, (m, a, sel) =>
    a + sel.split(',').map(s => { s = s.trim(); return s.startsWith('#no-panel') ? s : '#no-panel ' + s; }).join(',') + '{');

  /* ---------- helpers ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const pad = n => String(n).padStart(2, '0');
  const fmt = t => { const d = new Date(t); return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
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
  const cfg = () => {
    const es = ctx().extensionSettings;
    if (!es[KEY]) es[KEY] = {};
    for (const k in DEF) if (es[KEY][k] === undefined) es[KEY][k] = DEF[k];
    return es[KEY];
  };
  const saveCfg = () => { const c = ctx(); c.saveSettingsDebounced && c.saveSettingsDebounced(); };
  const seg = (label, opts, cur, fn) => h('div', { class: 'no-seg' }, label,
    opts.map(([v, t]) => h('button', { class: 'no-sb' + (v === cur ? ' on' : ''), type: 'button', onclick: () => fn(v) }, t)));

  /* ---------- state ---------- */
  function load() {
    const m = ctx().chatMetadata;
    S = Object.assign({ nodes: [], ideas: [], themes: [], chat: [], active: null }, (m && m[KEY]) || {});
    // Metadata may be empty or partially written after a chat switch; normalize it
    // before any renderer touches it so a malformed field cannot abort panel startup.
    if (!Array.isArray(S.nodes)) S.nodes = [];
    if (!Array.isArray(S.ideas)) S.ideas = [];
    if (!Array.isArray(S.chat)) S.chat = [];
    if (!Array.isArray(S.themes)) S.themes = [];
    S.nodes = S.nodes.filter(n => n && typeof n === 'object' && n.type !== 'vol');
    S.ideas.forEach(d => { if (!d || typeof d !== 'object') return; if (!d.t) d.t = Date.now(); if (!Array.isArray(d.imgs)) d.imgs = []; if (d.text == null) d.text = ''; });
    S.ideas = S.ideas.filter(d => d && typeof d === 'object');
    S.chat = S.chat.filter(m => m && typeof m === 'object');
  }
  function save() {
    const c = ctx();
    if (!c.chatMetadata) return;
    c.chatMetadata[KEY] = S;
    c.saveMetadata && c.saveMetadata();
  }
  const rk = n => (n.type === 'act' ? 0 : 1);
  const blockEnd = i => { let j = i + 1; while (j < S.nodes.length && rk(S.nodes[j]) > rk(S.nodes[i])) j++; return j; };
  function moveNode(i, d) {
    const N = S.nodes, r = rk(N[i]);
    if (r === 1) { const j = i + d; if (j < 0 || j >= N.length) return; [N[i], N[j]] = [N[j], N[i]]; }
    else {
      const blk = N.splice(i, blockEnd(i) - i);
      if (d < 0) {
        let k = i - 1; while (k >= 0 && rk(N[k]) > r) k--;
        if (k < 0) N.splice(i, 0, ...blk); else N.splice(k, 0, ...blk);
      } else if (i >= N.length) N.splice(i, 0, ...blk);
      else N.splice(blockEnd(i), 0, ...blk);
    }
    save(); render();
  }
  const actOf = i => { for (let k = i; k >= 0; k--) if (S.nodes[k].type === 'act') return S.nodes[k]; return null; };
  function inject() {
    try {
      const i = S.nodes.findIndex(x => x.id === S.active), n = S.nodes[i];
      let t = '';
      if (n) {
        const a = actOf(i);
        t = `${a ? `[剧情背景\n幕「${a.title}」${a.summary ? '：' + a.summary : ''}]\n` : ''}[当前剧情节点「${n.title}」：${n.summary}\n请自然地朝这个方向推进剧情，不要提及此提示。]`;
      }
      ctx().setExtensionPrompt(KEY, t, 1, 3);
    } catch (e) { console.warn('[novel-outline]', e); }
  }
  function outlineText() {
    const N = S.nodes, a = N.findIndex(x => x.id === S.active);
    let cs = -1, ce = -1;
    if (a >= 0) { cs = a; while (cs > 0 && rk(N[cs]) > 0) cs--; ce = a + 1; while (ce < N.length && rk(N[ce]) > 0) ce++; }
    let c = 0;
    return N.map((n, i) => {
      const sm = n.summary ? '：' + n.summary : '';
      if (n.type === 'act') return `## 幕「${n.title}」${sm}`;
      c++;
      return `${c}. ${n.title}${a < 0 || (i >= cs && i < ce) ? sm : ''}`;
    }).join('\n') || '（暂无）';
  }

  /* ---------- AI ---------- */
  async function gen(q) {
    const c = ctx();
    try { return await c.generateQuietPrompt({ quietPrompt: q }); }
    catch (e) { return await c.generateQuietPrompt(q, false, false); }
  }
  function aiOptions() {
    const o = [['', '跟随当前设置（默认）']], c = ctx();
    try { ((c.extensionSettings.connectionManager || {}).profiles || []).forEach(p => o.push(['p:' + p.id, '连接配置 · ' + p.name])); } catch (e) { }
    try { const pm = c.getPresetManager && c.getPresetManager(); ((pm && pm.getAllPresets && pm.getAllPresets()) || []).forEach(n => o.push(['s:' + n, '预设 · ' + n])); } catch (e) { }
    return o;
  }
  async function ask(msgs, flat) {
    const a = cfg().ai || '', c = ctx();
    if (a.startsWith('p:') && c.ConnectionManagerRequestService) {
      const r = await c.ConnectionManagerRequestService.sendRequest(a.slice(2), msgs, 1200);
      return (r && r.content) || String(r);
    }
    if (a.startsWith('s:')) {
      const pm = c.getPresetManager(), old = pm.getSelectedPresetName && pm.getSelectedPresetName();
      try { pm.selectPreset(a.slice(2)); await new Promise(r => setTimeout(r, 400)); return await gen(flat); }
      finally { if (old) pm.selectPreset(old); }
    }
    return gen(flat);
  }

  /* ---------- timeline ---------- */
  function foldAll(f) { S.nodes.forEach(n => { if (n.type === 'act') n.fold = f; }); save(); render(); }
  function rTimeline(b) {
    b.append(h('div', { class: 'no-tool' },
      btn('＋ 新建一幕', () => addNode('act', '新的一幕')),
      btn('＋ 新建章节', () => addNode('ch', '新章节'))));
    if (!S.nodes.length) b.append(h('div', { class: 'no-empty' }, '时间线还没有内容', h('br'), '先记录一幕幕正在构思或待写的剧情；完成后的幕可以收进章节。'));
    const tl = h('div', { class: 'no-tl m-zig' });
    let actIndex = 0, chapterIndex = 0;
    const assigned = new Set(S.nodes.filter(n => n.type === 'ch').flatMap(n => Array.isArray(n.actIds) ? n.actIds : []));
    S.nodes.forEach((n, i) => {
      const t = n.type || 'ch';
      if (t === 'act' && assigned.has(n.id)) return;
      const ed = editing.has(n.id), body = h('div', { class: 'no-c' });
      let label;
      if (t === 'act') label = `幕 ${String(++actIndex).padStart(2, '0')} · ${STATES[n.st || 0]}`;
      else label = `章节 ${String(++chapterIndex).padStart(2, '0')} · 已归档`;
      if (ed) {
        const ti = h('input', { class: 'no-in', placeholder: '标题', value: n.title });
        const sm = h('textarea', { class: 'no-in', rows: 3, placeholder: t === 'ch' ? '章节梗概（可选）' : '这一幕的想法、待写剧情或剧情进展' }); sm.value = n.summary || '';
        body.append(h('div', { class: 'no-lab' }, label), ti, sm, h('div', { class: 'no-act' },
          btn('保存', () => { n.title = ti.value.trim() || (t === 'act' ? '未命名的一幕' : '未命名章节'); n.summary = sm.value; editing.delete(n.id); save(); render(); }),
          btn('取消', () => { editing.delete(n.id); render(); })));
      } else {
        body.append(h('div', { class: 'no-lab' }, label), h('div', { class: 'no-name' }, n.title || '未命名'),
          n.summary ? h('div', { class: 'no-sum' }, n.summary) : null);
        if (t === 'ch') {
          const members = (n.actIds || []).map(id => S.nodes.find(x => x.id === id)).filter(Boolean);
          if (members.length) body.append(h('div', { class: 'no-chapter-items' }, ...members.map((a, k) => h('div', { class: 'no-chapter-item' }, `${k + 1}. ${a.title}`))));
          else body.append(h('div', { class: 'no-cnt' }, '尚未收录幕'));
        }
        if (openId === n.id) {
          const actions = [btn('编辑', () => { editing.add(n.id); render(); })];
          if (t === 'act') {
            actions.push(h('button', { class: 'no-st', type: 'button', onclick: () => { n.st = ((n.st || 0) + 1) % STATES.length; save(); render(); } }, '标记：' + STATES[n.st || 0]));
            actions.push(btn('收进章节', () => {
              const chapters = S.nodes.filter(x => x.type === 'ch');
              if (!chapters.length) { alert('请先新建一个章节，再将这一幕收录进去。'); return; }
              const choices = chapters.map((x, k) => `${k + 1}. ${x.title}`).join('\n');
              const answer = prompt('输入要收录到的章节编号：\n' + choices, '1');
              const target = chapters[Number(answer) - 1];
              if (!target) return;
              target.actIds = Array.isArray(target.actIds) ? target.actIds : [];
              if (!target.actIds.includes(n.id)) target.actIds.push(n.id);
              save(); render();
            }));
          } else actions.push(btn('移出全部幕', () => { n.actIds = []; save(); render(); }));
          actions.push(btn('上移', () => moveNode(i, -1)), btn('下移', () => moveNode(i, 1)), btn('删除', () => {
            if (!confirm(t === 'act' ? '删除这一幕？' : '删除章节？章节内的幕会重新显示在时间线上')) return;
            if (t === 'ch') S.nodes.forEach(x => { if (x.type === 'ch' && Array.isArray(x.actIds)) x.actIds = x.actIds.filter(id => id !== n.id); });
            S.nodes.splice(i, 1); if (S.active === n.id) S.active = null; save(); inject(); render();
          }));
          body.append(h('div', { class: 'no-act' }, ...actions));
        }
        body.addEventListener('click', e => { if (e.target.closest('button')) return; openId = openId === n.id ? null : n.id; render(); });
      }
      const cls = `no-n ${i % 2 ? 'R' : 'L'}${S.active === n.id ? ' active' : ''}${ed ? ' ed' : ''}`;
      tl.append(h('div', { class: cls }, h('div', { class: 'no-dot' }), body));
    });
    b.append(tl);
  }
  function addNode(type, title) {
    const n = { id: uid(), type, title, summary: '', st: 0 };
    if (type === 'ch') n.actIds = [];
    S.nodes.push(n); editing.add(n.id); save(); render();
  }

  /* ---------- ideas (Timo-style notes) ---------- */
  function inline(text) {
    const out = [];
    text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|#[^\s#]+)/g).forEach(p => {
      if (!p) return;
      if (p.startsWith('**') && p.length > 4) out.push(h('b', {}, p.slice(2, -2)));
      else if (p.startsWith('*') && !p.startsWith('**') && p.length > 2) out.push(h('i', {}, p.slice(1, -1)));
      else if (/^#[^\s#]/.test(p)) out.push(h('span', { class: 'no-tag' }, p));
      else out.push(p);
    });
    return out;
  }
  function md(text) {
    const box = h('div', { class: 'no-md' });
    text.split('\n').forEach(l => {
      if (!l.trim()) return;
      let m;
      if ((m = l.match(/^#{1,3}\s+(.*)/))) box.append(h('div', { class: 'no-h' }, ...inline(m[1])));
      else if ((m = l.match(/^>\s?(.*)/))) box.append(h('div', { class: 'no-q' }, ...inline(m[1])));
      else if ((m = l.match(/^[-*]\s+(.*)/))) box.append(h('div', { class: 'no-li' }, ...inline(m[1])));
      else box.append(h('div', {}, ...inline(l)));
    });
    return box;
  }
  const shrink = f => new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 800 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = im.width * k; cv.height = im.height * k;
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', 0.7));
      };
      im.onerror = () => res(null); im.src = r.result;
    };
    r.onerror = () => res(null); r.readAsDataURL(f);
  });
  const grow = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };

  function enableDrag(listEl) {
    listEl.querySelectorAll('.no-idea:not(.ed)').forEach(card => {
      const grip = card.querySelector('.no-idea-grip');
      if (!grip) return;
      grip.addEventListener('click', e => e.stopPropagation());
      grip.addEventListener('contextmenu', e => e.preventDefault());
      grip.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        const pointerId = e.pointerId;
        const sx = e.clientX, sy = e.clientY;
        const body = document.getElementById('no-body');
        let timer = null, dragging = false, target = null, cx = sx, cy = sy, startScroll = 0;

        const cleanup = () => {
          clearTimeout(timer);
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', finish);
          document.removeEventListener('pointercancel', finish);
        };
        const begin = () => {
          dragging = true;
          startScroll = body ? body.scrollTop : 0;
          card.classList.add('drag');
          grip.classList.add('dragging');
          if (navigator.vibrate) navigator.vibrate(10);
        };
        const move = ev => {
          if (ev.pointerId !== pointerId) return;
          cx = ev.clientX; cy = ev.clientY;
          if (!dragging) {
            if (Math.hypot(cx - sx, cy - sy) > 12) cleanup();
            return;
          }
          ev.preventDefault();
          if (body) card.style.transform = `translate(${cx - sx}px,${cy - sy + body.scrollTop - startScroll}px) scale(1.015)`;
          const hit = document.elementsFromPoint(cx, cy).find(x => x !== card && x.classList && x.classList.contains('no-idea'));
          if (target !== hit) {
            if (target) target.classList.remove('over');
            target = hit || null;
            if (target) target.classList.add('over');
          }
          if (body) {
            const r = body.getBoundingClientRect();
            if (cy < r.top + 54) body.scrollTop -= 10;
            else if (cy > r.bottom - 54) body.scrollTop += 10;
          }
        };
        const finish = ev => {
          if (ev && ev.pointerId !== pointerId) return;
          cleanup();
          if (!dragging) return;
          if (target) target.classList.remove('over');
          card.classList.remove('drag');
          grip.classList.remove('dragging');
          card.style.transform = '';
          if (target) {
            const from = S.ideas.findIndex(x => x.id === card.dataset.id);
            let to = S.ideas.findIndex(x => x.id === target.dataset.id);
            if (from > -1 && to > -1 && from !== to) {
              const targetRect = target.getBoundingClientRect();
              const insertBefore = cy < targetRect.top + targetRect.height / 2;
              const [item] = S.ideas.splice(from, 1);
              if (from < to) to--;
              if (!insertBefore) to++;
              S.ideas.splice(Math.max(0, Math.min(to, S.ideas.length)), 0, item);
              save();
            }
          }
          justDragged = true;
          setTimeout(() => { justDragged = false; }, 120);
          render();
        };
        timer = setTimeout(begin, 140);
        document.addEventListener('pointermove', move, { passive: false });
        document.addEventListener('pointerup', finish);
        document.addEventListener('pointercancel', finish);
      });
    });
  }

  function rIdeas(b) {
    // Quick capture remains at the top; ideas below are kept in one manually ordered sequence.
    const ta = h('textarea', { placeholder: '记下一个想法……支持 Markdown 和 #标签' });
    const post = () => {
      const text = ta.value.trim();
      if (!text) return;
      S.ideas.unshift({ id: uid(), text, imgs: [], t: Date.now() });
      save();
      render();
    };
    b.append(h('div', { class: 'no-cap' }, ta,
      h('div', { class: 'no-cap-bar' }, h('span', { class: 'no-meta' }, '想法片段 · 可拖动排序'),
        h('button', { class: 'no-post', type: 'button', onclick: post }, '收录想法'))));

    if (!S.ideas.length) b.append(h('div', { class: 'no-empty' }, '这里还没有灵感片段', h('br'), '记录的内容会按顺序排列，长按右侧拖动标记即可调整顺序'));
    const list = h('div', { class: 'no-grid' });
    S.ideas.forEach((d, index) => {
      if (!d.imgs) d.imgs = [];
      if (d.text == null) d.text = '';
      const el = h('div', { class: 'no-idea', 'data-id': d.id });
      if (editing.has(d.id)) {
        el.classList.add('ed');
        const t = h('textarea', { class: 'no-ed-in', placeholder: '想法片段……' });
        t.value = d.text;
        t.addEventListener('input', () => grow(t));
        const sync = () => { d.text = t.value; };
        el.append(
          t,
          h('div', { class: 'no-act' },
            btn('完成', () => { sync(); d.text = d.text.trim(); if (!d.text) S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); render(); }),
            btn('转为章节', () => { sync(); S.nodes.push({ id: uid(), title: (d.text.split('\n')[0].replace(/^[#>\-*\s]+/, '') || '新章节').slice(0, 20), summary: d.text, st: 0 }); S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); tab = 'timeline'; render(); }),
            btn('删除', () => { if (!confirm('删除这条想法？')) return; S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); render(); })));
        requestAnimationFrame(() => { grow(t); });
      } else {
        const grip = h('button', { class: 'no-idea-grip', type: 'button', 'aria-label': '长按拖动排序', title: '长按拖动排序' }, '⋮⋮');
        el.append(h('div', { class: 'no-idea-head' },
          h('span', { class: 'no-idea-index' }, String(index + 1).padStart(2, '0')),
          h('span', { class: 'no-idea-time' }, fmt(d.t)), grip));
        if (d.text) el.append(md(d.text));
        el.addEventListener('click', () => { if (justDragged) return; editing.add(d.id); render(); });
      }
      list.append(el);
    });
    b.append(list);
    enableDrag(list);
  }

  /* ---------- chat ---------- */
  function rChat(b) {
    const sel = h('select', { class: 'no-sel' }, aiOptions().map(([v, t]) => h('option', { value: v }, t)));
    sel.value = cfg().ai || '';
    if (sel.value !== (cfg().ai || '')) sel.value = '';
    sel.addEventListener('change', () => { cfg().ai = sel.value; saveCfg(); });
    const box = h('div', { class: 'no-msgs' });
    if (!S.chat.length) box.append(h('div', { class: 'no-empty' }, '和 AI 聊聊剧情', h('br'), '它能看到你的大纲和灵感片段'));
    S.chat.forEach(m => {
      const el = h('div', { class: `no-m ${m.r === 'u' ? 'u' : 'a'}` }, h('div', { class: 'no-role' }, m.r === 'u' ? '你' : '剧情策划'), h('div', { class: 'no-m-text' }, m.t));
      if (m.r === 'a' && !m.pending) el.append(h('div', { class: 'no-act' }, btn('存为灵感', () => { S.ideas.unshift({ id: uid(), text: m.t, imgs: [], t: Date.now() }); save(); tab = 'ideas'; render(); })));
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
      const ideas = S.ideas.filter(d => d.text).slice(0, 30).map(d => `- ${d.text}`).join('\n') || '（暂无）';
      const sys = `【任务】暂停角色扮演，你现在是小说剧情策划助手，和用户讨论故事大纲。用中文回答，简洁、具体，给出可执行的建议。\n【当前大纲（当前幕展开，其余章节仅标题）】\n${outlineText()}\n【灵感片段】\n${ideas}`;
      const hist = S.chat.slice(-12, -2);
      const flat = `${sys}\n【讨论记录】\n${hist.map(m => `${m.r === 'u' ? '用户' : '助手'}：${m.t}`).join('\n')}\n用户：${text}\n请直接回复：`;
      const hm = hist.map(m => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t }));
      while (hm.length && hm[0].role === 'assistant') hm.shift();
      try { p.t = String(await ask([{ role: 'system', content: sys }, ...hm, { role: 'user', content: text }], flat)).trim() || '（没有返回内容）'; }
      catch (e) { p.t = '（生成失败，请检查 API 连接或所选预设）'; console.error(e); }
      delete p.pending; busy = false; save(); render();
    };
    send.onclick = go;
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); go(); } });
    b.append(sel, box, h('div', { class: 'no-bar' }, ta, S.chat.length ? btn('清空', () => { if (confirm('清空讨论记录？')) { S.chat = []; save(); render(); } }) : null, send));
    requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
  }

  function render() {
    const b = document.getElementById('no-body');
    if (!b) return;
    const st = b.scrollTop;
    try {
      b.replaceChildren();
      b.classList.toggle('chat', tab === 'chat');
      document.querySelectorAll('#no-panel .no-tab').forEach(t => t.classList.toggle('on', t.dataset.t === tab));
      const draw = ({ timeline: rTimeline, ideas: rIdeas, chat: rChat })[tab] || rTimeline;
      draw(b);
      if (tab !== 'chat') b.scrollTop = st;
    } catch (e) {
      console.error('[novel-outline] render failed:', e);
      b.replaceChildren(h('div', { class: 'no-empty' }, '界面加载失败，请打开浏览器控制台查看 [novel-outline] 错误。'));
    }
  }

  function init() {
    if (!document.getElementById('no-style')) {
      const s = document.createElement('style'); s.id = 'no-style'; s.textContent = prefix(CSS) + `\n@keyframes no-plugin-enter{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}\n#no-panel .no-body > *{animation:no-plugin-enter .28s cubic-bezier(.2,.75,.25,1) both}\n#no-panel .no-grid > .no-idea,#no-panel .no-msgs > .no-m{animation:no-plugin-enter .3s cubic-bezier(.2,.75,.25,1) both}\n@media(max-width:520px){#no-panel .no-tl{grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr);column-gap:8px}#no-panel .no-n{column-gap:8px}#no-panel .no-name{font-size:15px}#no-panel .no-sum{font-size:12px}}
@media(prefers-reduced-motion:reduce){#no-panel,#no-panel *{transition-duration:.01ms !important;animation-duration:.01ms !important;scroll-behavior:auto !important}}`; document.head.append(s);
    }
    const panel = h('div', { id: 'no-panel' },
      h('div', { class: 'no-head' }, h('div', { class: 'no-title' }, '大纲'), h('div', { class: 'no-x', role: 'button', 'aria-label': '关闭', onclick: () => panel.classList.remove('open') })),
      h('div', { class: 'no-tabs' }, ...[['timeline', '时间线'], ['ideas', '灵感'], ['chat', '讨论']].map(([k, v]) =>
        h('div', { class: 'no-tab', 'data-t': k, onclick: () => { tab = k; render(); } }, v))),
      h('div', { id: 'no-body', class: 'no-body' }));
    const open = () => {
      try {
        load();
        panel.classList.add('open');
        render();
      } catch (e) {
        console.error('[novel-outline] open failed:', e);
        panel.classList.add('open');
        const b = panel.querySelector('#no-body');
        if (b) b.replaceChildren(h('div', { class: 'no-empty' }, '插件打开失败，请检查控制台中的 [novel-outline] 错误。'));
      }
    };
    document.body.append(panel);
    const addMenu = () => {
      const menu = document.getElementById('extensionsMenu');
      if (!menu) return false;
      if (!document.getElementById('no-menu-item')) {
        menu.append(h('div', { id: 'no-menu-item', class: 'list-group-item flex-container flexGap5', onclick: open },
          h('div', { class: 'fa-solid fa-book-open extensionsMenuExtensionButton' }), '小说大纲'));
      }
      return true;
    };
    if (!addMenu()) {
      let tries = 0;
      const timer = setInterval(() => { if (addMenu() || ++tries > 60) clearInterval(timer); }, 500);
    }
    try {
      const c = ctx();
      const changed = c && c.eventTypes && c.eventTypes.CHAT_CHANGED;
      if (changed && c.eventSource && typeof c.eventSource.on === 'function') {
        c.eventSource.on(changed, () => {
          try { load(); inject(); editing.clear(); if (panel.classList.contains('open')) render(); }
          catch (e) { console.error('[novel-outline] chat-change handler failed:', e); }
        });
      }
      load(); inject();
    } catch (e) {
      // Do not let a context/event API mismatch prevent the menu item from working.
      console.error('[novel-outline] initialization context warning:', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
