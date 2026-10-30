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
#no-panel{position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;height:100dvh !important;max-width:none !important;margin:0 !important;z-index:99999 !important;background:#f7f6f1 !important;color:#41443c !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;visibility:hidden !important;opacity:0 !important;pointer-events:none !important;transform:translateY(8px) !important;transition:opacity .28s ease,transform .34s cubic-bezier(.2,.72,.22,1),visibility 0s linear .34s !important;font-family:"Noto Serif SC","Songti SC",Georgia,serif;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);box-sizing:border-box}
#no-panel.open{visibility:visible !important;opacity:1 !important;pointer-events:auto !important;transform:translateY(0) !important;transition:opacity .28s ease,transform .34s cubic-bezier(.2,.72,.22,1),visibility 0s !important}
#no-panel *{box-sizing:border-box}
#no-panel button,#no-panel input,#no-panel textarea,#no-panel select{font-family:inherit;color:inherit;text-shadow:none;box-shadow:none}
#no-panel button{ -webkit-tap-highlight-color:transparent }
.no-head{flex:none;display:flex;justify-content:space-between;align-items:center;padding:14px 20px 12px;border-bottom:1px solid #e8e5dc;background:rgba(255,254,250,.62)}
.no-title{font-size:16px;font-weight:600;letter-spacing:.18em;color:#45483f}
.no-x{position:relative;width:40px;height:40px;flex:none;cursor:pointer;border:0;background:transparent;margin:0 -8px 0 0;opacity:.65;transition:opacity .2s,transform .24s}
.no-x:hover{opacity:1;transform:rotate(90deg)}
.no-x::before,.no-x::after{content:"";position:absolute;left:12px;top:19.5px;width:17px;height:1.5px;background:#62675b;border-radius:2px}
.no-x::before{transform:rotate(45deg)}
.no-x::after{transform:rotate(-45deg)}
.no-tabs{flex:none;display:flex;justify-content:center;gap:30px;padding:0 18px;border-bottom:1px solid #e8e5dc;background:rgba(255,254,250,.38)}
.no-tab{position:relative;min-width:64px;text-align:center;padding:13px 2px 12px;font-size:14px;letter-spacing:.12em;color:#99998f;cursor:pointer;transition:color .22s ease}
.no-tab::after{content:"";position:absolute;left:50%;right:50%;bottom:-1px;height:2px;background:#84917c;border-radius:2px;transition:left .26s cubic-bezier(.2,.7,.2,1),right .26s cubic-bezier(.2,.7,.2,1)}
.no-tab.on{color:#515c4b}
.no-tab.on::after{left:5px;right:5px}
.no-body{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;width:100%;max-width:760px;margin:0 auto;padding:22px 20px 48px;scrollbar-width:thin;scrollbar-color:#d6d8cd transparent}
.no-body.chat{display:flex;flex-direction:column;padding-bottom:16px}
.no-btn{background:transparent;border:0;padding:4px 1px;font-size:12px;cursor:pointer;color:#78866f;opacity:.88;transition:color .2s,opacity .2s,transform .2s}
.no-btn:hover{color:#53664d;opacity:1;transform:translateY(-1px)}
.no-btn:active,.no-tab:active,.no-add:active,.no-post:active,.no-send:active{transform:scale(.98)}
.no-empty{text-align:center;color:#aaa99e;font-size:14px;line-height:2;padding:48px 0}
.no-tool{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:22px}
.no-cfg{border:1px solid #e7e5db;border-radius:15px;background:#fffefa;padding:14px 16px;margin-bottom:26px;display:flex;flex-direction:column;gap:14px}
.no-seg{display:flex;align-items:center;gap:10px;font-size:12px;color:#85867c;flex-wrap:wrap}
.no-sb{border:1px solid #e2e4da;border-radius:999px;background:#fffefa;color:#73796c;padding:5px 12px;font-size:12px;cursor:pointer;transition:all .22s ease}
.no-sb+.no-sb{margin-left:0}
.no-sb.on{background:#eaf0e6;border-color:#d8e1d2;color:#52644d}

.no-tl{position:relative;padding:8px 0 4px}
.no-tl::before{content:"";position:absolute;top:0;bottom:0;width:1.5px;background:#d8d9cf}
.m-zig::before{left:calc(50% - .75px)}
.m-left::before{left:7px}
.m-right::before{right:7px}
.no-n{position:relative;margin:0 0 34px;min-height:24px}
.no-c{position:relative;font-size:14px;min-width:0}
.m-zig .no-n .no-c{width:calc(50% - 26px)}
.m-zig .no-n.L .no-c{margin-right:auto;text-align:right}
.m-zig .no-n.R .no-c{margin-left:auto;text-align:left}
.m-left .no-n .no-c{margin-left:34px}
.m-right .no-n .no-c{margin-right:34px;text-align:right}
.no-dot{position:absolute;top:5px;width:11px;height:11px;border-radius:50%;background:#f7f6f1;border:2px solid #9ba591;z-index:1;transition:background .25s,border-color .25s,transform .25s}
.m-zig .no-dot{left:calc(50% - 5.5px)}
.m-left .no-dot{left:2px}
.m-right .no-dot{right:2px}
.no-n.s1 .no-dot{background:linear-gradient(90deg,#87957e 50%,#f7f6f1 50%);border-color:#87957e}
.no-n.s2 .no-dot{background:#87957e;border-color:#87957e}
.no-n.active .no-dot{background:#7f9076;border-color:#7f9076;transform:scale(1.25);box-shadow:0 0 0 4px rgba(127,144,118,.13)}
.nodots .no-dot{display:none}
.no-lab{font-size:11px;letter-spacing:.12em;color:#96978c;margin-bottom:4px}
.no-n.act .no-lab{color:#809075}
.no-name{font-size:17px;font-weight:600;line-height:1.55;color:#44483f;overflow-wrap:anywhere}
.no-n.active .no-name{display:inline-block;border-bottom:1px solid #91a087;color:#52654c}
.no-sum{font-size:13px;line-height:1.9;color:#77786f;white-space:pre-wrap;margin-top:5px;overflow-wrap:anywhere}
.no-cnt{font-size:11px;color:#9b9c91;margin-top:5px}
.no-n.act{margin-top:40px;margin-bottom:34px}
.no-n.act:first-child{margin-top:0}
.no-n.act .no-name{font-size:19px;letter-spacing:.08em;color:#59664f}
.no-n.act .no-dot{width:9px;height:9px;top:8px;border:0;background:#84937a;transform:rotate(45deg)}
.m-zig .no-n.act .no-dot{display:block}
.m-zig .no-n.act .no-c{width:auto;max-width:86%;margin:0 auto;text-align:center;background:transparent;padding:5px 0;z-index:1}
.no-act{display:flex;flex-wrap:wrap;gap:10px 14px;margin-top:10px;align-items:center}
.m-right .no-act,.m-zig .no-n.L .no-act{justify-content:flex-end}
.m-zig .no-n.act .no-act{justify-content:center}
.no-st{font-size:11px;border:1px solid #dce2d6;padding:4px 10px;border-radius:999px;cursor:pointer;background:#f1f4ed;color:#65745d;transition:all .2s ease}
.no-n.ed .no-dot{display:none}
.no-n.ed .no-c{width:100% !important;margin:0 !important;text-align:left !important;background:transparent;border:0;padding:6px 0;z-index:2;max-width:none !important}
.no-n.ed .no-act{justify-content:flex-start !important}
.no-adds{display:flex;gap:12px;margin-top:8px}
.no-add{flex:1;min-height:44px;padding:10px 8px;border:1px dashed #cfd4c8;border-radius:13px;background:rgba(255,254,250,.55);color:#78866f;font-size:13px;letter-spacing:.08em;cursor:pointer;transition:background .22s,border-color .22s,color .22s,transform .22s}
.no-add:hover{background:#edf1e9;border-color:#aebba6;color:#5c6c54}
input.no-in,textarea.no-in{width:100%;border:0;border-bottom:1px solid #d9ddd2;border-radius:0;background:transparent;padding:7px 0;font-size:15px;line-height:1.8;outline:none;resize:vertical;text-align:left;transition:border-color .2s}
input.no-in:focus,textarea.no-in:focus{border-color:#829277}
textarea.no-in{border:1px solid #e2e4da;border-radius:10px;padding:9px 11px;margin-top:8px;background:#fffefa}

.no-cap{border:1px solid #e8e5dc;border-radius:16px;background:#fffefa;padding:14px 16px;margin-bottom:22px;transition:border-color .22s,background .22s}
.no-cap:focus-within{border-color:#c5d0bd;background:#fff}
.no-cap textarea{width:100%;border:0;border-radius:0;background:transparent;outline:none;resize:vertical;font-size:14px;line-height:1.85;min-height:60px;color:#4b4d45}
.no-cap textarea::placeholder{color:#b1b0a6}
.no-cap-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:7px}
.no-thumbs{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.no-thumbs img{width:48px;height:48px;object-fit:cover;border-radius:9px}
.no-post{background:#7e8d75;color:#fff;border:0;border-radius:999px;padding:7px 19px;font-size:13px;letter-spacing:.1em;cursor:pointer;transition:background .2s,transform .2s}
.no-post:hover{background:#687a60}
.no-chips{display:flex;gap:9px;overflow-x:auto;margin:0 0 17px;padding:2px 1px 5px;white-space:nowrap;scrollbar-width:none}
.no-chips::-webkit-scrollbar{display:none}
.no-chip{flex:none;font-size:12px;color:#85877d;cursor:pointer;padding:6px 12px;border:1px solid transparent;border-radius:999px;transition:all .22s ease}
.no-chip.on{color:#5c6b54;background:#eaf0e6;border-color:#e0e8da}
.no-chip.add{color:#7e8d75;border:1px dashed #cbd3c4}
.no-sub{display:flex;gap:14px;margin:-5px 0 15px;align-items:center;flex-wrap:wrap;font-size:12px;color:#929287}
.no-grid{display:flex;flex-direction:column;gap:13px;align-items:stretch}
.no-idea{position:relative;width:100%;background:#fffefa;border:1px solid #e8e5dc;border-radius:15px;padding:14px 16px 12px;cursor:pointer;touch-action:pan-y;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:border-color .22s ease,background .22s ease,transform .24s cubic-bezier(.2,.7,.2,1);font-size:13px;line-height:1.85;overflow:hidden;word-break:break-word}
.no-idea::before{content:"";position:absolute;left:0;top:15px;bottom:15px;width:2px;border-radius:3px;background:#dce4d6;transition:background .2s}
.no-idea:hover{border-color:#cbd5c4;background:#fff}
.no-idea.drag{z-index:20;border-color:#aebca5;background:#fff;transition:none;cursor:grabbing;opacity:.94}
.no-idea.over{border-color:#91a285;background:#f2f5ef;outline:none}
.no-idea.ed{border-color:#cbd5c4;background:#fff;user-select:text;-webkit-user-select:text;cursor:default}
.no-idea.ed::before{background:#87977e}
.no-idea-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 8px;padding-left:3px}
.no-idea-index{font-size:10px;letter-spacing:.13em;color:#9a9e91}
.no-idea-theme{font-size:10px;color:#85917d;background:#f0f3ed;border-radius:999px;padding:2px 8px}
.no-img{display:block;width:100%;max-height:300px;object-fit:contain;object-position:left center;margin:7px 0 10px;border-radius:10px}
.no-md>div{margin:2px 0}
.no-h{font-weight:650;font-size:15px;color:#4a5145;margin:4px 0 6px !important}
.no-q{border-left:2px solid #b9c5b1;padding-left:10px;color:#77796f;margin:7px 0 !important}
.no-li::before{content:"· ";color:#85947c}
.no-tag{background:#edf1e9;color:#68775f;padding:1px 6px;border-radius:999px;font-size:11px;cursor:pointer}
.no-meta{margin-top:10px;padding-top:7px;border-top:1px solid #f0eee7;font-size:10px;color:#aaa99f;letter-spacing:.04em}
.no-ed-in{width:100%;border:0;border-radius:8px;background:transparent;outline:none;resize:vertical;font-size:14px;line-height:1.85;min-height:90px;user-select:text;-webkit-user-select:text;padding:4px 2px;color:#4b4d45}
.no-edimgs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.no-edimgs div{position:relative}
.no-edimgs img{width:64px;height:64px;object-fit:cover;border-radius:9px}
.no-edimgs span{position:absolute;top:-6px;right:-6px;width:20px;height:20px;background:#7d8975;color:#fff;border-radius:50%;font-size:12px;line-height:20px;text-align:center;cursor:pointer}

.no-sel{width:100%;flex:none;border:1px solid #e5e5dc;border-radius:12px;background:#fffefa;padding:10px 12px;font-size:13px;margin-bottom:14px;outline:none;transition:border-color .2s,background .2s}
.no-sel:focus{border-color:#b9c6b1;background:#fff}
.no-msgs{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:13px;padding:6px 2px 16px;scrollbar-width:thin;scrollbar-color:#d6d8cd transparent}
.no-m{max-width:90%;padding:11px 15px;font-size:14px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere;border-radius:17px}
.no-m.u{align-self:flex-end;background:#eaf0e6;color:#4e5949;border:1px solid #e0e8da;border-bottom-right-radius:6px}
.no-m.a{align-self:flex-start;background:#fffefa;color:#55574f;border:1px solid #ebe8df;border-bottom-left-radius:6px}
.no-bar{flex:none;display:flex;gap:9px;align-items:flex-end;border-top:1px solid #e8e5dc;padding-top:12px}
.no-bar textarea{flex:1;min-width:0;border:1px solid #e5e5dc;border-radius:15px;background:#fffefa;padding:10px 12px;font-size:14px;line-height:1.65;resize:none;outline:none;max-height:120px;transition:border-color .2s,background .2s}
.no-bar textarea:focus{border-color:#b9c6b1;background:#fff}
.no-bar textarea::placeholder{color:#aaa99f}
.no-send{background:#7e8d75;color:#fff;border:0;border-radius:999px;padding:10px 17px;font-size:13px;letter-spacing:.08em;cursor:pointer;white-space:nowrap;transition:background .2s,transform .2s}
.no-send:hover{background:#687a60}
.no-send:disabled{opacity:.4}
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
      card.addEventListener('pointerdown', e => { if (e.button > 0) return; sx = e.clientX; sy = e.clientY; timer = setTimeout(begin, 280); });
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
      S.ideas.unshift({ id: uid(), text, imgs: pending, t: Date.now(), theme: curTheme === 'all' ? null : curTheme });
      save(); render();
    };
    b.append(h('div', { class: 'no-cap' }, ta, thumbs, h('div', { class: 'no-cap-bar' }, btn('＋ 图片', () => file.click()), file, h('button', { class: 'no-post', type: 'button', onclick: post }, '记录'))));

    // themes
    const chip = (name, id) => h('span', { class: 'no-chip' + (curTheme === id ? ' on' : ''), onclick: () => { curTheme = id; curTag = null; render(); } }, name);
    b.append(h('div', { class: 'no-chips' }, chip('全部', 'all'), S.themes.map(t => chip(t.name, t.id)),
      h('span', { class: 'no-chip add', onclick: () => { const n = (prompt('主题名称（如：旅行计划、人物设定）') || '').trim(); if (n) { const t = { id: uid(), name: n }; S.themes.push(t); curTheme = t.id; save(); render(); } } }, '＋ 主题')));
    const th = S.themes.find(t => t.id === curTheme);
    if (th || curTag) b.append(h('div', { class: 'no-sub' },
      th ? [btn('重命名', () => { const n = (prompt('新名称', th.name) || '').trim(); if (n) { th.name = n; save(); render(); } }),
        btn('删除主题', () => { if (!confirm('删除主题？里面的想法会保留在「全部」')) return; S.ideas.forEach(d => { if (d.theme === th.id) d.theme = null; }); S.themes = S.themes.filter(x => x !== th); curTheme = 'all'; save(); render(); })] : null,
      curTag ? btn(`${curTag}  ×`, () => { curTag = null; render(); }) : null));

    // cards
    const list = S.ideas.filter(d => (curTheme === 'all' || d.theme === curTheme) && (!curTag || tagsOf(d.text).includes(curTag)));
    if (!list.length) b.append(h('div', { class: 'no-empty' }, '这里还空着', h('br'), '想到什么就先记下来，长按卡片可以拖动排序'));
    const grid = h('div', { class: 'no-grid' });
    list.forEach((d, index) => {
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
          h('div', { class: 'no-sub', style: 'margin:8px 0 0' }, '主题',
            btn('无', () => { sync(); d.theme = null; save(); render(); }),
            S.themes.map(x => h('span', { class: 'no-btn', style: d.theme === x.id ? 'opacity:1;font-weight:700' : '', onclick: () => { sync(); d.theme = x.id; save(); render(); } }, x.name))),
          h('div', { class: 'no-act' },
            btn('完成', () => { sync(); d.text = d.text.trim(); if (!d.text && !d.imgs.length) S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); render(); }),
            btn('＋ 图片', () => file2.click()), file2,
            btn('转为章节', () => { sync(); S.nodes.push({ id: uid(), title: (d.text.split('\n')[0].replace(/^[#>\-*\s]+/, '') || '新章节').slice(0, 20), summary: d.text, st: 0 }); S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); tab = 'timeline'; render(); }),
            btn('删除', () => { if (!confirm('删除这条想法？')) return; S.ideas = S.ideas.filter(x => x !== d); editing.delete(d.id); save(); render(); })));
        requestAnimationFrame(() => { grow(t); });
      } else {
        const tn = S.themes.find(x => x.id === d.theme);
        el.append(h('div', { class: 'no-idea-head' },
          h('span', { class: 'no-idea-index' }, `灵感 ${String(index + 1).padStart(2, '0')}`),
          tn ? h('span', { class: 'no-idea-theme' }, tn.name) : null));
        d.imgs.forEach(s => el.append(h('img', { class: 'no-img', src: s })));
        if (d.text) el.append(md(d.text));
        el.append(h('div', { class: 'no-meta' }, fmt(d.t)));
        el.querySelectorAll('.no-tag').forEach(s => s.addEventListener('click', e => { e.stopPropagation(); curTag = s.textContent; render(); }));
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
      if (m.r === 'a' && !m.pending) el.append(h('div', { class: 'no-act' }, btn('存为灵感', () => { S.ideas.unshift({ id: uid(), text: m.t, imgs: [], t: Date.now(), theme: null }); save(); tab = 'ideas'; render(); })));
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

  function animateIn(root) {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const animateItems = (items, step = 20) => Array.from(items).forEach((el, i) => {
        if (!el.animate) return;
        el.animate(
          [{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 260, delay: Math.min(i * step, 120), easing: 'cubic-bezier(.2,.72,.22,1)', fill: 'backwards' }
        );
      });
      animateItems(root.children, 24);
      root.querySelectorAll('.no-tl,.no-grid,.no-msgs').forEach(list => animateItems(list.children, 18));
    } catch (e) { /* Animation must never interrupt plugin functionality. */ }
  }

  function render() {
    const b = document.getElementById('no-body');
    if (!b) return;
    const st = b.scrollTop;
    b.replaceChildren();
    b.classList.toggle('chat', tab === 'chat');
    document.querySelectorAll('#no-panel .no-tab').forEach(t => t.classList.toggle('on', t.dataset.t === tab));
    ({ timeline: rTimeline, ideas: rIdeas, chat: rChat })[tab](b);
    animateIn(b);
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
