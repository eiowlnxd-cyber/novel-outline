(() => {
  const KEY = 'novel_outline';
  const ctx = () => SillyTavern.getContext();
  const STATES = ['构思中', '进行中', '已完成'];
  const DEF = { layout: 'zig', dots: true, ai: '' };
  let S = { nodes: [], ideas: [], themes: [], chat: [], active: null };
  let tab = 'timeline', busy = false, openId = null, cfgOpen = false, curTheme = 'all', curTag = null, justDragged = false;
  const editing = new Set();

  /* ---------- styles (injected, prefixed so ST themes can't override) ---------- */
  const CSS = `
#no-panel{position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;height:100dvh !important;max-width:none !important;margin:0 !important;z-index:99999 !important;background:#fff !important;color:#111 !important;overflow:hidden !important;display:none !important;font-family:"Noto Serif SC","Songti SC",Georgia,serif;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box;opacity:0}
#no-panel.open{display:flex !important;flex-direction:column !important;animation:no-panel-in .28s cubic-bezier(.2,.75,.25,1) both}
@keyframes no-panel-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
#no-panel *{box-sizing:border-box}
#no-panel button,#no-panel input,#no-panel textarea,#no-panel select{font-family:inherit;color:inherit;-webkit-appearance:none;appearance:none;margin:0;border-radius:0;text-shadow:none;box-shadow:none}
.no-head{flex:none;display:flex;justify-content:space-between;align-items:center;padding:10px 20px;border-bottom:1px solid #e8e8e8}
.no-title{font-size:15px;font-weight:600;letter-spacing:.28em}
.no-x{position:relative;width:42px;height:42px;flex:none;cursor:pointer;margin:0 -10px 0 0;transition:opacity .2s}
.no-x:active{opacity:.45}
.no-x::before,.no-x::after{content:"";position:absolute;left:12px;top:20.5px;width:18px;height:1px;background:#111}
.no-x::before{transform:rotate(45deg)}.no-x::after{transform:rotate(-45deg)}
.no-tabs{flex:none;display:flex;border-bottom:1px solid #eee}
.no-tab{flex:1;text-align:center;padding:13px 0;font-size:13px;letter-spacing:.2em;color:#aaa;cursor:pointer;border-bottom:1px solid transparent;margin-bottom:-1px;transition:color .25s,border-color .25s}
.no-tab.on{color:#111;border-color:#111}
.no-body{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;width:100%;max-width:720px;margin:0 auto;padding:24px 20px 48px;scroll-behavior:smooth}
.no-body.chat{display:flex;flex-direction:column;padding-bottom:14px}
.no-btn{background:none;border:0;padding:2px 0;font-size:12px;cursor:pointer;opacity:.62;color:#111;transition:opacity .2s,transform .2s}
.no-btn:hover{opacity:1}.no-btn:active{transform:translateY(1px)}
.no-empty{text-align:center;color:#aaa;font-size:13px;line-height:2.2;padding:48px 0}
.no-tool{display:flex;flex-wrap:wrap;gap:18px;margin-bottom:24px}
.no-cfg{border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8;padding:14px 0;margin-bottom:28px;display:flex;flex-direction:column;gap:14px}
.no-seg{display:flex;align-items:center;gap:12px;font-size:12px;color:#888;flex-wrap:wrap}
.no-sb{border:0;border-bottom:1px solid transparent;background:none;color:#888;padding:4px 2px;font-size:12px;cursor:pointer;transition:color .2s,border-color .2s}
.no-sb+.no-sb{margin-left:0}.no-sb.on{color:#111;border-color:#111;background:none}
.no-tl{position:relative;padding:8px 0 4px}
.no-tl::before{content:"";position:absolute;top:0;bottom:0;width:1px;background:#111}
.m-zig::before{left:50%}.m-left::before{left:7px}.m-right::before{right:7px}
.no-n{position:relative;margin:0 0 34px;min-height:26px}
.no-c{position:relative;font-size:14px;min-width:0}
.m-zig .no-n .no-c{width:calc(50% - 25px)}
.m-zig .no-n.L .no-c{margin-right:auto;text-align:right}.m-zig .no-n.R .no-c{margin-left:auto}
.m-left .no-n .no-c{margin-left:30px}.m-right .no-n .no-c{margin-right:30px;text-align:right}
.no-dot{position:absolute;top:5px;width:7px;height:7px;border-radius:50%;background:#111;z-index:1}
.m-zig .no-dot{left:calc(50% - 3px)}.m-left .no-dot{left:4px}.m-right .no-dot{right:4px}
.no-n.s1 .no-dot{background:#fff;border:1px solid #111}.no-n.s2 .no-dot{background:#111}
.nodots .no-dot{display:none}
.no-lab{font-size:10px;letter-spacing:.16em;color:#999;margin-bottom:5px}
.no-name{font-size:17px;font-weight:600;line-height:1.55;letter-spacing:.02em}
.no-n.active .no-name{ text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px }
.no-sum{font-size:13px;line-height:1.9;color:#666;white-space:pre-wrap;margin-top:5px}
.no-cnt{font-size:11px;color:#aaa;margin-top:5px}.no-n.act{margin-top:38px}.no-n.act:first-child{margin-top:0}
.no-n.act .no-name{font-size:18px;letter-spacing:.1em}.no-n.act .no-dot{width:7px;height:7px}
.m-zig .no-n.act .no-c{width:calc(50% - 25px);max-width:none;margin-left:0;text-align:right;padding:0;background:transparent;z-index:1}
.m-zig .no-n.act.L .no-c{margin-right:auto}.m-zig .no-n.act.R .no-c{margin-left:auto;text-align:left}
.no-act{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}.m-right .no-act,.m-zig .no-n.L .no-act{justify-content:flex-end}.m-zig .no-n.act .no-act{justify-content:flex-end}
.no-st{font-size:11px;border:0;border-bottom:1px solid #aaa;padding:1px 0;cursor:pointer;background:none;color:#111}
.no-n.ed{padding:2px 0 12px}.no-n.ed .no-dot{display:none}.no-n.ed .no-c{width:100% !important;margin:0 !important;text-align:left !important;background:transparent;border:0;padding:0;z-index:2;max-width:none !important}.no-n.ed .no-act{justify-content:flex-start !important}
.no-adds{display:flex;gap:24px;margin-top:10px}.no-add{flex:1;padding:12px 4px;border:0;border-top:1px solid #bbb;background:none;color:#333;font-size:12px;letter-spacing:.15em;cursor:pointer;transition:border-color .2s,color .2s}.no-add:hover{border-color:#111;color:#111;background:none}
input.no-in,textarea.no-in{width:100%;border:0;border-bottom:1px solid #bbb;background:transparent;padding:7px 0;font-size:15px;line-height:1.8;outline:none;resize:vertical;text-align:left}
textarea.no-in{border:0;border-bottom:1px solid #bbb;padding:8px 0;margin-top:8px}
.no-cap{border:0;border-bottom:1px solid #ddd;background:transparent;padding:8px 0 12px;margin-bottom:24px}
.no-cap textarea{width:100%;border:0;background:transparent;outline:none;resize:none;font-size:14px;line-height:1.9;min-height:52px;color:#111}
.no-cap-bar{display:flex;align-items:center;justify-content:space-between;margin-top:8px}.no-thumbs{display:flex;gap:8px;flex-wrap:wrap}.no-thumbs img{width:42px;height:42px;object-fit:cover;filter:grayscale(1)}
.no-post{background:#111;color:#fff;border:1px solid #111;padding:7px 18px;font-size:12px;letter-spacing:.15em;cursor:pointer;transition:background .2s,color .2s}.no-post:active{background:#fff;color:#111}
.no-chips{display:none}.no-sub{display:flex;gap:16px;margin-bottom:14px;align-items:center;font-size:12px;color:#888}
.no-grid{display:flex;flex-direction:column;gap:0;align-items:stretch}
.no-idea{position:relative;background:transparent;border:0;border-bottom:1px solid #e8e8e8;padding:17px 4px 16px 28px;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:opacity .22s,transform .22s,border-color .22s;font-size:13px;line-height:1.9;overflow:visible;word-break:break-word}
.no-idea::before{content:"";position:absolute;left:5px;top:23px;width:5px;height:5px;border-radius:50%;background:#111;opacity:.65}
.no-idea:hover{border-color:#aaa}.no-idea.drag{z-index:20;opacity:.88;transform:scale(1.015);background:#fff;box-shadow:0 8px 22px rgba(0,0,0,.08);transition:none;cursor:grabbing}
.no-idea.over{border-top:1px solid #111}.no-idea.ed{border:0;border-bottom:1px solid #111;user-select:text;-webkit-user-select:text;cursor:default;padding-left:4px}.no-idea.ed::before{display:none}
.no-img{display:block;max-width:100%;max-height:260px;object-fit:contain;margin:0 0 10px;filter:grayscale(1)}.no-idea:hover .no-img{filter:grayscale(.35)}
.no-md>div{margin-bottom:2px}.no-h{font-weight:650;font-size:15px}.no-q{border-left:1px solid #777;padding-left:10px;color:#666}.no-li::before{content:"— "}.no-tag{color:#666;border-bottom:1px solid #aaa;padding:0 1px;font-size:12px;cursor:pointer}
.no-meta{margin-top:8px;font-size:10px;color:#aaa;letter-spacing:.08em}.no-ed-in{width:100%;border:0;background:transparent;outline:none;resize:vertical;font-size:14px;line-height:1.9;min-height:90px;user-select:text;-webkit-user-select:text}
.no-edimgs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.no-edimgs div{position:relative}.no-edimgs img{width:64px;height:64px;object-fit:cover;filter:grayscale(1)}.no-edimgs span{position:absolute;top:-6px;right:-6px;width:18px;height:18px;background:#111;color:#fff;font-size:12px;line-height:18px;text-align:center;cursor:pointer}
.no-sel{width:100%;flex:none;border:0;border-bottom:1px solid #bbb;background:#fff;padding:9px 0;font-size:13px;margin-bottom:16px;outline:none}
.no-msgs{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:18px;padding:8px 0 16px;scroll-behavior:smooth}
.no-m{max-width:88%;padding:4px 0;font-size:14px;line-height:1.95;white-space:pre-wrap;border:0 !important;background:transparent !important;color:#222 !important}
.no-m.u{align-self:flex-end;text-align:right;border-right:1px solid #aaa !important;padding-right:12px}.no-m.a{align-self:flex-start;border-left:1px solid #111 !important;padding-left:12px}
.no-bar{flex:none;display:flex;gap:12px;align-items:flex-end;border-top:1px solid #e5e5e5;padding-top:12px}
.no-bar textarea{flex:1;border:0;border-bottom:1px solid #aaa;background:transparent;padding:8px 2px;font-size:14px;line-height:1.7;resize:none;outline:none;max-height:120px}
.no-send{background:#111;color:#fff;border:1px solid #111;padding:10px 17px;font-size:12px;letter-spacing:.15em;cursor:pointer;transition:background .2s,color .2s}.no-send:active{background:#fff;color:#111}.no-send:disabled{opacity:.4}
#no-panel .no-body>*{animation:no-content-in .24s ease both}@keyframes no-content-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){#no-panel *,#no-panel *::before,#no-panel *::after{animation:none !important;transition:none !important;scroll-behavior:auto !important}}
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
    S.nodes = S.nodes.filter(n => n.type !== 'vol');
    S.ideas.forEach(d => { if (!d.t) d.t = Date.now(); if (!d.imgs) d.imgs = []; if (d.text == null) d.text = ''; });
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
    const c = cfg();
    b.append(h('div', { class: 'no-tool' }, btn(cfgOpen ? '收起排版' : '排版设置', () => { cfgOpen = !cfgOpen; render(); }),
      S.nodes.some(n => n.type === 'act') ? [btn('只看幕', () => foldAll(true)), btn('全部展开', () => foldAll(false))] : null));
    if (cfgOpen) b.append(h('div', { class: 'no-cfg' },
      seg('文字排布', [['zig', '左右交错'], ['left', '靠左'], ['right', '靠右']], c.layout, v => { c.layout = v; saveCfg(); render(); }),
      seg('时间线节点', [[true, '有节点'], [false, '无节点']], c.dots, v => { c.dots = v; saveCfg(); render(); })));
    if (!S.nodes.length) b.append(h('div', { class: 'no-empty' }, '还没有剧情节点', h('br'), '先建一幕，再往里排章节'));
    const tl = h('div', { class: `no-tl m-${c.layout}${c.dots ? '' : ' nodots'}` });
    let ha = false, cn = 0, an = 0, side = 0;
    S.nodes.forEach((n, i) => {
      const t = n.type || 'ch';
      let vis, label;
      if (t === 'act') { ha = !!n.fold; vis = true; an++; label = `第 ${an} 幕`; }
      else { cn++; vis = !ha; label = `第 ${cn} 章`; }
      if (!vis) return;
      const ed = editing.has(n.id), body = h('div', { class: 'no-c' });
      if (ed) {
        const ti = h('input', { class: 'no-in', placeholder: '标题', value: n.title });
        const sm = h('textarea', { class: 'no-in', rows: 4, placeholder: t === 'ch' ? '这一段发生了什么……' : '一句话概述这一幕' });
        sm.value = n.summary;
        body.append(h('div', { class: 'no-lab' }, label), ti, sm, h('div', { class: 'no-act' },
          btn('保存', () => { n.title = ti.value.trim() || '未命名'; n.summary = sm.value; editing.delete(n.id); save(); inject(); render(); }),
          btn('取消', () => { editing.delete(n.id); render(); })));
      } else {
        const cnt = t === 'act' && n.fold ? S.nodes.slice(i + 1, blockEnd(i)).length : 0;
        body.append(h('div', { class: 'no-lab' }, label + (S.active === n.id ? ' · 当前' : '')), h('div', { class: 'no-name' }, n.title),
          n.summary ? h('div', { class: 'no-sum' }, n.summary) : null,
          cnt ? h('div', { class: 'no-cnt' }, `已折叠 ${cnt} 章`) : null);
        if (openId === n.id) {
          const acts = [];
          if (t === 'ch') acts.push(h('button', { class: 'no-st', type: 'button', onclick: () => { n.st = ((n.st || 0) + 1) % 3; save(); render(); } }, STATES[n.st || 0]));
          else acts.push(btn(n.fold ? '展开' : '折叠', () => { n.fold = !n.fold; save(); render(); }));
          acts.push(btn('编辑', () => { editing.add(n.id); render(); }), btn('上移', () => moveNode(i, -1)), btn('下移', () => moveNode(i, 1)));
          if (t === 'ch') acts.push(btn(S.active === n.id ? '取消当前' : '设为当前', () => { S.active = S.active === n.id ? null : n.id; save(); inject(); render(); }));
          acts.push(btn('删除', () => {
            if (!confirm(t === 'ch' ? '删除这个章节？' : '删除这一幕？其下章节会保留')) return;
            if (S.active === n.id) S.active = null;
            S.nodes.splice(i, 1); save(); inject(); render();
          }));
          body.append(h('div', { class: 'no-act' }, ...acts));
        }
        body.addEventListener('click', e => { if (e.target.closest('button')) return; openId = openId === n.id ? null : n.id; render(); });
      }
      const cls = `no-n ${t}${t === 'ch' ? ' s' + (n.st || 0) + (side++ % 2 ? ' R' : ' L') : ' L'}${S.active === n.id ? ' active' : ''}${ed ? ' ed' : ''}`;
      tl.append(h('div', { class: cls }, h('div', { class: 'no-dot' }), body));
    });
    const add = (type, title, label) => h('button', { class: 'no-add', type: 'button', onclick: () => { const n = { id: uid(), type, title, summary: '', st: 0 }; S.nodes.push(n); editing.add(n.id); save(); render(); } }, label);
    b.append(tl, h('div', { class: 'no-adds' }, add('ch', '新章节', '＋ 章节'), add('act', '新的一幕', '＋ 幕')));
  }

  /* ---------- ideas (Timo-style notes) ---------- */
  const tagsOf = t => [...new Set(t.match(/#[^\s#]+/g) || [])];
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

  function enableDrag(grid) {
    grid.querySelectorAll('.no-idea:not(.ed)').forEach(card => {
      let timer = null, sx = 0, sy = 0;
      const stop = () => { clearTimeout(timer); timer = null; };
      card.addEventListener('contextmenu', e => e.preventDefault());
      card.addEventListener('pointerdown', e => { if (e.button > 0) return; sx = e.clientX; sy = e.clientY; timer = setTimeout(begin, 260); });
      card.addEventListener('pointermove', e => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) stop(); });
      card.addEventListener('pointerup', stop);
      card.addEventListener('pointercancel', stop);
      function begin() {
        timer = null;
        const body = document.getElementById('no-body'), st0 = body.scrollTop;
        let tgt = null, cx = sx, cy = sy;
        card.classList.add('drag');
        navigator.vibrate && navigator.vibrate(12);
        const block = ev => ev.preventDefault();
        document.addEventListener('touchmove', block, { passive: false });
        const place = () => { card.style.transform = `translate(${cx - sx}px,${cy - sy + body.scrollTop - st0}px) scale(1.03)`; };
        const mv = ev => {
          cx = ev.clientX; cy = ev.clientY; place();
          const el = document.elementsFromPoint(cx, cy).find(x => x !== card && x.classList && x.classList.contains('no-idea'));
          if (tgt !== el) { if (tgt) tgt.classList.remove('over'); tgt = el || null; if (tgt) tgt.classList.add('over'); }
          const r = body.getBoundingClientRect();
          if (cy < r.top + 60) { body.scrollTop -= 12; place(); } else if (cy > r.bottom - 60) { body.scrollTop += 12; place(); }
        };
        const up = () => {
          document.removeEventListener('pointermove', mv);
          document.removeEventListener('pointerup', up);
          document.removeEventListener('pointercancel', up);
          document.removeEventListener('touchmove', block);
          if (tgt) {
            const from = S.ideas.findIndex(x => x.id === card.dataset.id), to = S.ideas.findIndex(x => x.id === tgt.dataset.id);
            if (from > -1 && to > -1) { const [it] = S.ideas.splice(from, 1); S.ideas.splice(to, 0, it); save(); }
          }
          justDragged = true; setTimeout(() => { justDragged = false; }, 80);
          render();
        };
        document.addEventListener('pointermove', mv);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
      }
    });
  }

  function rIdeas(b) {
    // quick capture
    let pending = [];
    const ta = h('textarea', { placeholder: '记下一个想法……支持 Markdown 和 #标签' });
    const thumbs = h('div', { class: 'no-thumbs' });
    const drawThumbs = () => { thumbs.replaceChildren(...pending.map(s => h('img', { src: s }))); };
    const file = h('input', { type: 'file', accept: 'image/*', multiple: 'multiple', style: 'display:none' });
    file.addEventListener('change', async () => { for (const f of file.files) { const s = await shrink(f); if (s) pending.push(s); } file.value = ''; drawThumbs(); });
    const post = () => {
      const text = ta.value.trim();
      if (!text && !pending.length) return;
      S.ideas.push({ id: uid(), text, imgs: pending, t: Date.now(), theme: null });
      save(); render();
    };
    b.append(h('div', { class: 'no-cap' }, ta, thumbs, h('div', { class: 'no-cap-bar' }, btn('＋ 图片', () => file.click()), file, h('button', { class: 'no-post', type: 'button', onclick: post }, '记录'))));

    // A single ordered stream of idea fragments; no category tabs or theme filters.
    const list = S.ideas;
    if (!list.length) b.append(h('div', { class: 'no-empty' }, '这里还空着', h('br'), '想法会按顺序排列，长按任意片段即可上下拖动'));
    const grid = h('div', { class: 'no-grid' });
    list.forEach(d => {
      const el = h('div', { class: 'no-idea', 'data-id': d.id });
      if (editing.has(d.id)) {
        el.classList.add('ed');
        const t = h('textarea', { class: 'no-ed-in', placeholder: '想法……' });
        t.value = d.text; t.addEventListener('input', () => grow(t));
        const sync = () => { d.text = t.value; };
        const file2 = h('input', { type: 'file', accept: 'image/*', multiple: 'multiple', style: 'display:none' });
        file2.addEventListener('change', async () => { sync(); for (const f of file2.files) { const s = await shrink(f); if (s) d.imgs.push(s); } save(); render(); });
        el.append(
          d.imgs.length ? h('div', { class: 'no-edimgs' }, d.imgs.map((s, k) => h('div', {}, h('img', { src: s }), h('span', { onclick: () => { sync(); d.imgs.splice(k, 1); save(); render(); } }, '×')))) : null,
          t,
          h('div', { class: 'no-act' },
            btn('完成', () => { sync(); d.text = d.text.trim(); if (!d.text && !d.imgs.length) S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); render(); }),
            btn('＋ 图片', () => file2.click()), file2,
            btn('转为章节', () => { sync(); S.nodes.push({ id: uid(), title: (d.text.split('\n')[0].replace(/^[#>\-*\s]+/, '') || '新章节').slice(0, 20), summary: d.text, st: 0 }); S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); tab = 'timeline'; render(); }),
            btn('删除', () => { if (!confirm('删除这条想法？')) return; S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); render(); })));
        requestAnimationFrame(() => { grow(t); });
      } else {
        d.imgs.forEach(s => el.append(h('img', { class: 'no-img', src: s })));
        if (d.text) el.append(md(d.text));
        el.append(h('div', { class: 'no-meta' }, fmt(d.t)));
        el.addEventListener('click', () => { if (justDragged) return; editing.add(d.id); render(); });
      }
      grid.append(el);
    });
    b.append(grid);
    enableDrag(grid);
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
      const el = h('div', { class: `no-m ${m.r === 'u' ? 'u' : 'a'}` }, m.t);
      if (m.r === 'a' && !m.pending) el.append(h('div', { class: 'no-act' }, btn('存为灵感', () => { S.ideas.push({ id: uid(), text: m.t, imgs: [], t: Date.now(), theme: null }); save(); tab = 'ideas'; render(); })));
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
    b.replaceChildren();
    b.classList.toggle('chat', tab === 'chat');
    document.querySelectorAll('#no-panel .no-tab').forEach(t => t.classList.toggle('on', t.dataset.t === tab));
    ({ timeline: rTimeline, ideas: rIdeas, chat: rChat })[tab](b);
    if (tab !== 'chat') b.scrollTop = st;
  }

  function init() {
    if (!document.getElementById('no-style')) {
      const s = document.createElement('style'); s.id = 'no-style'; s.textContent = prefix(CSS); document.head.append(s);
    }
    const panel = h('div', { id: 'no-panel' },
      h('div', { class: 'no-head' }, h('div', { class: 'no-title' }, '大纲'), h('div', { class: 'no-x', role: 'button', 'aria-label': '关闭', onclick: () => panel.classList.remove('open') })),
      h('div', { class: 'no-tabs' }, ...[['timeline', '时间线'], ['ideas', '灵感'], ['chat', '讨论']].map(([k, v]) =>
        h('div', { class: 'no-tab', 'data-t': k, onclick: () => { tab = k; render(); } }, v))),
      h('div', { id: 'no-body', class: 'no-body' }));
    const open = () => { load(); render(); panel.classList.add('open'); };
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
    const c = ctx();
    c.eventSource.on(c.eventTypes.CHAT_CHANGED, () => { load(); inject(); editing.clear(); render(); });
    load(); inject();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
