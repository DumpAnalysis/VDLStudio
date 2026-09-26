// VDL Studio — Copyright © 2026 Dmitry Vostokov. Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE.md).
// VDL Studio — the interactive editor (canvas interaction, panels, files, keyboard).
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = VDLRender.esc, num = VDLRender.num;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const LS_KEY = 'vdlstudio.project.v1';

  // ------------------------------------------------------------------ state
  const S = {
    project: null, doc: null,
    sel: [],                       // selected top-level element ids
    tool: 'select', toolDef: null,
    view: { zoom: 1, x: 40, y: 40 },
    undo: [], redo: [], pendingSnap: null,
    clipboard: null,
    snap: true, grid: true, showRefs: true,
    fileHandle: null, dirty: false,
    drag: null, drawing: null, spaceDown: false,
    diagramFilter: '',
  };
  const canvas = $('#canvas'), viewport = $('#viewport'), content = $('#content'), overlay = $('#overlay'), gridLayer = $('#gridLayer'), pageRect = $('#pageRect'), wrap = $('#canvasWrap');

  // ------------------------------------------------------------------ tools palette
  const ICON = {
    select: '<svg viewBox="0 0 30 22"><path d="M8 3l12 9-5 1 3 6-2 1-3-6-4 4z" fill="#333"/></svg>',
    pan: '<svg viewBox="0 0 30 22"><path d="M10 12V5a2 2 0 014 0v6m0-3V4a2 2 0 014 0v7m0-4a2 2 0 014 0v8a6 6 0 01-6 6h-2a6 6 0 01-5-3l-4-6a2 2 0 013-2l2 3" fill="none" stroke="#333" stroke-width="1.5"/></svg>',
    axis: '<svg viewBox="0 0 30 22"><circle cx="15" cy="3" r="2.5"/><path d="M15 3v15" stroke="#000" stroke-width="1.5"/><path d="M12 15l3 6 3-6z"/></svg>',
    haxis: '<svg viewBox="0 0 30 22"><circle cx="4" cy="11" r="2.5"/><path d="M4 11h20" stroke="#000" stroke-width="1.5"/><path d="M22 8l6 3-6 3z"/></svg>',
    trace: '<svg viewBox="0 0 30 22"><rect x="6" y="3" width="18" height="18" fill="#A6A6A6"/><path d="M10 3v18M14 3v18M18 3v18" stroke="#000" stroke-width=".6"/><path d="M6 7h18M6 11h18M6 15h18M6 19h18" stroke="#fff" stroke-width=".6"/></svg>',
    band: '<svg viewBox="0 0 30 22"><rect x="6" y="2" width="18" height="18" fill="#A6A6A6"/><rect x="6" y="8" width="18" height="6" fill="#00B050"/></svg>',
    message: '<svg viewBox="0 0 30 22"><rect x="6" y="2" width="18" height="18" fill="#A6A6A6"/><rect x="6" y="10" width="18" height="2" fill="#FFFF00"/></svg>',
    column: '<svg viewBox="0 0 30 22"><rect x="6" y="2" width="18" height="18" fill="#A6A6A6"/><rect x="10" y="5" width="3" height="10" fill="#FFFF00"/></svg>',
    rect: '<svg viewBox="0 0 30 22"><rect x="5" y="4" width="20" height="14" fill="#0070C0"/></svg>',
    ellipse: '<svg viewBox="0 0 30 22"><ellipse cx="15" cy="11" rx="9" ry="8" fill="#000"/></svg>',
    text: '<svg viewBox="0 0 30 22"><text x="15" y="16" font-size="14" font-weight="bold" text-anchor="middle" font-family="Arial">Ab</text></svg>',
    line: '<svg viewBox="0 0 30 22"><path d="M4 18L22 6" stroke="#000" stroke-width="1.5"/><path d="M26 4l-6 1 3 4z"/></svg>',
    connector: '<svg viewBox="0 0 30 22"><path d="M4 5h11v12h8" fill="none" stroke="#000" stroke-width="1.5"/><path d="M27 17l-5-3v6z"/></svg>',
    curve: '<svg viewBox="0 0 30 22"><path d="M3 18C8 2 14 2 15 11s7 9 12-7" fill="none" stroke="#0070C0" stroke-width="1.5"/></svg>',
    polygon: '<svg viewBox="0 0 30 22"><path d="M6 19L10 4l14 3-2 12z" fill="#92D050" stroke="#333" stroke-width=".8"/></svg>',
    dimension: '<svg viewBox="0 0 30 22"><path d="M15 3v16" stroke="#000" stroke-width="1.2"/><path d="M12 6l3-4 3 4zM12 16l3 4 3-4z"/><path d="M10 3h10M10 19h10" stroke="#000" stroke-width="1"/></svg>',
    bracket: '<svg viewBox="0 0 30 22"><path d="M18 3h-5v16h5" fill="none" stroke="#000" stroke-width="1.8"/></svg>',
    legend: '<svg viewBox="0 0 30 22"><rect x="4" y="4" width="8" height="3" fill="#FFC000"/><rect x="4" y="10" width="8" height="3" fill="#00B0F0"/><rect x="4" y="16" width="8" height="3" fill="#00B050"/><path d="M14 5.5h12M14 11.5h12M14 17.5h12" stroke="#333" stroke-width="1.2"/></svg>',
    note: '<svg viewBox="0 0 30 22"><path d="M5 3h15l5 5v11H5z" fill="#FFFF00" stroke="#333" stroke-width=".8"/><path d="M20 3v5h5" fill="none" stroke="#333" stroke-width=".8"/></svg>',
    callout: '<svg viewBox="0 0 30 22"><path d="M9 3h17v16H9v-5l-5-3 5-3z" fill="#000"/></svg>',
    diamond: '<svg viewBox="0 0 30 22"><path d="M15 2l10 9-10 9L5 11z" fill="#0070C0"/></svg>',
    cross: '<svg viewBox="0 0 30 22"><path d="M8 4l14 14M22 4L8 18" stroke="#FF0000" stroke-width="3" stroke-linecap="round"/></svg>',
    image: '<svg viewBox="0 0 30 22"><rect x="4" y="3" width="22" height="16" fill="#D9D9D9" stroke="#666" stroke-width=".8"/><path d="M6 17l6-7 4 4 3-2 5 5z" fill="#00B050"/><circle cx="20" cy="8" r="2" fill="#FFC000"/></svg>',
    node: '<svg viewBox="0 0 30 22"><circle cx="15" cy="11" r="5" fill="#000"/></svg>',
    hatchnode: '<svg viewBox="0 0 30 22"><rect x="9" y="5" width="12" height="12" fill="#fff" stroke="#333"/><path d="M9 8h12M9 11h12M9 14h12M12 5v12M15 5v12M18 5v12" stroke="#333" stroke-width=".5"/></svg>',
  };
  // Each tool: {key, label, icon, mode: 'select'|'pan'|'rect'|'line'|'axis'|'text'|'image', type, props, defaultSize}
  const TOOLS = [
    { cat: 'General' },
    { key: 'select', label: 'Select', icon: 'select', mode: 'select', hint: 'Click / drag to select · Shift adds · drag handles to resize · double-click to edit text' },
    { key: 'pan', label: 'Pan', icon: 'pan', mode: 'pan', hint: 'Drag to pan (or hold Space / middle mouse)' },
    { cat: 'Trace' },
    { key: 'axis', label: 'Time axis', icon: 'axis', mode: 'axis', type: 'axis', props: {}, hint: 'Drag from the start dot to the arrow end (any direction); click for a default vertical axis' },
    { key: 'haxis', label: 'Seq. axis', icon: 'haxis', mode: 'axis', type: 'axis', props: { orient: 'h', label: '#', labelPos: 'end', len: 300 }, hint: 'Drag to draw a horizontal axis' },
    { key: 'trace', label: 'Trace', icon: 'trace', mode: 'rect', type: 'trace', props: {}, hint: 'Drag to draw a trace frame (columns + message rows)' },
    { key: 'band', label: 'Block', icon: 'band', mode: 'rect', type: 'band', props: {}, size: { w: 150, h: 40 }, hint: 'Drag a message block (activity region) inside a trace' },
    { key: 'message', label: 'Message', icon: 'message', mode: 'rect', type: 'band', props: { fill: '#FFFF00', h: 4 }, size: { w: 150, h: 4 }, hint: 'A single message row (height = row pitch)' },
    { key: 'column', label: 'Col. mark', icon: 'column', mode: 'rect', type: 'band', props: { fill: '#FFFF00', w: 10, h: 40, colLines: 'none' }, size: { w: 10, h: 40 }, hint: 'A vertical marker inside one column (TID / ATID highlight)' },
    { cat: 'Shapes' },
    { key: 'rect', label: 'Rectangle', icon: 'rect', mode: 'rect', type: 'rect', props: {}, hint: 'Drag to draw a rectangle' },
    { key: 'ellipse', label: 'Ellipse', icon: 'ellipse', mode: 'rect', type: 'ellipse', props: {}, size: { w: 40, h: 40 }, hint: 'Drag to draw an ellipse (Shift = circle)' },
    { key: 'node', label: 'Node', icon: 'node', mode: 'rect', type: 'ellipse', props: { fill: '#000000', stroke: '', w: 10, h: 10 }, size: { w: 10, h: 10 }, hint: 'Small graph node' },
    { key: 'hatchnode', label: 'Msg node', icon: 'hatchnode', mode: 'rect', type: 'rect', props: { fill: '#FFFFFF', stroke: '#000000', strokeWidth: 0.75, rows: 'dark', pitch: 2, rowOpacity: 0.5, w: 10, h: 10 }, size: { w: 10, h: 10 }, hint: 'Hatched message node (causal graphs)' },
    { key: 'diamond', label: 'Diamond', icon: 'diamond', mode: 'rect', type: 'rect', props: { shape: 'diamond', fill: '#0070C0' }, size: { w: 120, h: 120 }, hint: 'Memory dump diamond' },
    { key: 'text', label: 'Text', icon: 'text', mode: 'text', type: 'text', props: {}, hint: 'Click to place text; double-click any text to edit' },
    { key: 'note', label: 'Note', icon: 'note', mode: 'rect', type: 'rect', props: { shape: 'note', fill: '#FFFF00', stroke: '#404040', strokeWidth: 0.75, text: 'Note', textColor: '#FF0000', fontSize: 9 }, size: { w: 60, h: 20 }, hint: 'Annotation note' },
    { key: 'callout', label: 'Callout', icon: 'callout', mode: 'rect', type: 'rect', props: { shape: 'callout', fill: '#000000', text: '5 hours', textColor: '#FFFFFF', fontSize: 14 }, size: { w: 120, h: 50 }, hint: 'Callout box with a pointer' },
    { key: 'cross', label: 'Cross', icon: 'cross', mode: 'rect', type: 'rect', props: { shape: 'cross', fill: '#FF0000' }, size: { w: 24, h: 24 }, hint: 'Cross-out mark' },
    { key: 'image', label: 'Image', icon: 'image', mode: 'image', type: 'image', hint: 'Insert a picture (PNG/JPG/SVG); tick "Reference" to use it only as a tracing aid' },
    { cat: 'Lines' },
    { key: 'line', label: 'Arrow', icon: 'line', mode: 'line', type: 'line', props: { endCap: 'arrow' }, hint: 'Drag for a straight arrow, or click-click-click for a polyline (Enter / double-click ends, Esc cancels)' },
    { key: 'connector', label: 'Elbow', icon: 'connector', mode: 'line', type: 'line', props: { route: 'ortho', endCap: 'arrow' }, hint: 'Orthogonal connector' },
    { key: 'curve', label: 'Curve', icon: 'curve', mode: 'line', type: 'line', props: { route: 'curve', endCap: 'none', stroke: '#0070C0', width: 2 }, hint: 'Smooth curve through the clicked points' },
    { key: 'polygon', label: 'Polygon', icon: 'polygon', mode: 'line', type: 'line', props: { closed: true, fill: '#92D050', endCap: 'none', width: 1 }, hint: 'Closed polygon through the clicked points' },
    { key: 'dimension', label: 'Dimension', icon: 'dimension', mode: 'line', type: 'line', props: { startCap: 'arrow', endCap: 'arrow', width: 1, label: 'T = xx:xx.001', labelPos: 0.5, labelOffset: -6 }, hint: 'Double-headed dimension arrow with label' },
    { key: 'bracket', label: 'Bracket', icon: 'bracket', mode: 'rect', type: 'rect', props: { shape: 'bracket', fill: '', stroke: '#000000', strokeWidth: 1.5 }, size: { w: 6, h: 60 }, hint: 'Bracket / span marker' },
    { key: 'legend', label: 'Legend', icon: 'legend', mode: 'rect', type: 'legend', props: {}, size: { w: 120, h: 70 }, hint: 'Colour legend (edit items in the properties panel)' },
  ];

  function buildTools() {
    const host = $('#tools');
    host.innerHTML = '';
    TOOLS.forEach(t => {
      if (t.cat) { const d = document.createElement('div'); d.className = 'cat'; d.textContent = t.cat; host.appendChild(d); return; }
      const b = document.createElement('button');
      b.dataset.tool = t.key; b.title = t.hint || t.label;
      b.innerHTML = ICON[t.icon] + `<span>${esc(t.label)}</span>`;
      b.addEventListener('click', () => setTool(t.key));
      host.appendChild(b);
    });
  }
  function setTool(key) {
    const def = TOOLS.find(t => t.key === key) || TOOLS[1];
    if (S.drawing) cancelDrawing();
    S.tool = def.key; S.toolDef = def;
    $$('#tools button').forEach(b => b.classList.toggle('active', b.dataset.tool === def.key));
    canvas.classList.remove('tool-select', 'tool-draw', 'tool-pan');
    canvas.classList.add(def.mode === 'select' ? 'tool-select' : def.mode === 'pan' ? 'tool-pan' : 'tool-draw');
    $('#statusTool').textContent = def.label;
    $('#statusHint').textContent = def.hint || '';
    if (def.mode === 'image') { $('#imageInput').value = ''; $('#imageInput').click(); setTool('select'); }
  }

  // ------------------------------------------------------------------ coordinates & view
  function toPage(evt) {
    const r = canvas.getBoundingClientRect();
    return { x: (evt.clientX - r.left - S.view.x) / S.view.zoom, y: (evt.clientY - r.top - S.view.y) / S.view.zoom };
  }
  function toScreen(p) { return { x: p.x * S.view.zoom + S.view.x, y: p.y * S.view.zoom + S.view.y }; }
  function setZoom(z, cx, cy) {
    z = Math.min(16, Math.max(0.1, z));
    if (cx == null) { cx = wrap.clientWidth / 2; cy = wrap.clientHeight / 2; }
    const px = (cx - S.view.x) / S.view.zoom, py = (cy - S.view.y) / S.view.zoom;
    S.view.zoom = z;
    S.view.x = cx - px * z; S.view.y = cy - py * z;
    renderView();
  }
  function zoomFit() {
    const W = wrap.clientWidth, H = wrap.clientHeight, pw = S.doc.page.width, ph = S.doc.page.height;
    const z = Math.min((W - 60) / pw, (H - 60) / ph);
    S.view.zoom = Math.min(8, Math.max(0.05, z));
    S.view.x = (W - pw * S.view.zoom) / 2; S.view.y = (H - ph * S.view.zoom) / 2;
    renderView();
  }
  function renderView() {
    viewport.setAttribute('transform', `translate(${num(S.view.x)} ${num(S.view.y)}) scale(${num(S.view.zoom)})`);
    $('#zoomLabel').textContent = Math.round(S.view.zoom * 100) + '%';
    renderGrid();
    renderOverlay();
  }
  function renderGrid() {
    const p = S.doc.page;
    pageRect.setAttribute('width', p.width); pageRect.setAttribute('height', p.height); pageRect.setAttribute('fill', p.background || '#fff');
    if (!S.grid) { gridLayer.innerHTML = ''; return; }
    let g = +p.grid || 4;
    while (g * S.view.zoom < 8) g *= 2;
    const major = g * 5;
    gridLayer.innerHTML = `<defs><pattern id="gridPat" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M ${g} 0 L 0 0 0 ${g}" fill="none" stroke="#000" stroke-opacity=".07" stroke-width="${num(1 / S.view.zoom)}"/></pattern>
      <pattern id="gridPatMajor" width="${major}" height="${major}" patternUnits="userSpaceOnUse"><rect width="${major}" height="${major}" fill="url(#gridPat)"/><path d="M ${major} 0 L 0 0 0 ${major}" fill="none" stroke="#000" stroke-opacity=".14" stroke-width="${num(1 / S.view.zoom)}"/></pattern></defs>
      <rect x="0" y="0" width="${p.width}" height="${p.height}" fill="url(#gridPatMajor)" pointer-events="none"/>`;
  }

  // ------------------------------------------------------------------ rendering
  function renderContent() { // canvas only (used during drags)
    const { body, defs } = VDLRender.render(S.doc, { forExport: false, showRefs: S.showRefs, hitAreas: true });
    $('#canvasDefs').innerHTML = defs;
    content.innerHTML = body;
    renderOverlay();
  }
  function render() {
    renderContent();
    renderGrid();
    renderLayers();
    updateStatusSel();
  }
  function handleRect(x, y, cursor, name) {
    const s = 7 / S.view.zoom;
    return `<rect class="handle" data-handle="${name}" x="${num(x - s / 2)}" y="${num(y - s / 2)}" width="${num(s)}" height="${num(s)}" fill="#fff" stroke="#0070C0" stroke-width="${num(1 / S.view.zoom)}" style="cursor:${cursor}"/>`;
  }
  function renderOverlay() {
    let s = '';
    const z = S.view.zoom, sw = num(1 / z);
    const sels = selectedEls();
    sels.forEach(el => {
      const kind = VDL.kindOf(el);
      const b = VDL.visualBounds(el);
      s += `<rect x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${num(b.h)}" fill="none" stroke="#0070C0" stroke-width="${sw}" stroke-dasharray="${num(4 / z)} ${num(3 / z)}" pointer-events="none"/>`;
      if (sels.length !== 1 || el.locked) return;
      if (kind === 'line') {
        (el.points || []).forEach((p, i) => { s += handleRect(p.x, p.y, 'move', 'pt:' + i).replace('fill="#fff"', 'fill="#FFC000"'); });
      } else if (kind === 'axis') {
        const e = VDL.axisEnd(el);
        s += handleRect(el.x, el.y, 'move', 'axis:start') + handleRect(e.x, e.y, 'move', 'axis:end');
      } else if (!(el.rotation)) {
        const { x, y, w, h } = b;
        s += handleRect(x, y, 'nwse-resize', 'nw') + handleRect(x + w, y, 'nesw-resize', 'ne') + handleRect(x, y + h, 'nesw-resize', 'sw') + handleRect(x + w, y + h, 'nwse-resize', 'se');
        if (w * z > 24) { s += handleRect(x + w / 2, y, 'ns-resize', 'n') + handleRect(x + w / 2, y + h, 'ns-resize', 's'); }
        if (h * z > 24) { s += handleRect(x, y + h / 2, 'ew-resize', 'w') + handleRect(x + w, y + h / 2, 'ew-resize', 'e'); }
      }
    });
    if (sels.length > 1) {
      const b = VDL.unionBounds(sels.map(VDL.visualBounds));
      s += `<rect x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${num(b.h)}" fill="none" stroke="#0070C0" stroke-width="${sw}" pointer-events="none"/>`;
      const { x, y, w, h } = b;
      s += handleRect(x, y, 'nwse-resize', 'nw') + handleRect(x + w, y, 'nesw-resize', 'ne') + handleRect(x, y + h, 'nesw-resize', 'sw') + handleRect(x + w, y + h, 'nwse-resize', 'se');
    }
    if (S.drag && S.drag.marquee) {
      const m = S.drag.marquee;
      s += `<rect x="${num(Math.min(m.x0, m.x1))}" y="${num(Math.min(m.y0, m.y1))}" width="${num(Math.abs(m.x1 - m.x0))}" height="${num(Math.abs(m.y1 - m.y0))}" fill="#0070C0" fill-opacity=".08" stroke="#0070C0" stroke-width="${sw}"/>`;
    }
    if (S.drag && S.drag.guides) {
      S.drag.guides.forEach(g => {
        if (g.v != null) s += `<line x1="${num(g.v)}" y1="-100000" x2="${num(g.v)}" y2="100000" stroke="#FF00AA" stroke-width="${sw}" stroke-dasharray="${num(3 / z)} ${num(3 / z)}"/>`;
        if (g.h != null) s += `<line x1="-100000" y1="${num(g.h)}" x2="100000" y2="${num(g.h)}" stroke="#FF00AA" stroke-width="${sw}" stroke-dasharray="${num(3 / z)} ${num(3 / z)}"/>`;
      });
    }
    if (S.drawing) {
      const d = S.drawing;
      const pts = [...d.points, d.cursor].filter(Boolean);
      if (pts.length >= 2) {
        const spec = Object.assign({}, d.el, { points: pts });
        const ctx = new VDLRender.Ctx(S.doc, { hitAreas: false });
        s += `<g opacity=".7">${VDLRender.element(spec, ctx)}</g>`;
      }
    }
    if (S.drag && S.drag.ghost) {
      const g = S.drag.ghost;
      s += `<rect x="${num(g.x)}" y="${num(g.y)}" width="${num(g.w)}" height="${num(g.h)}" fill="#0070C0" fill-opacity=".1" stroke="#0070C0" stroke-width="${sw}"/>`;
    }
    overlay.innerHTML = s;
  }

  // ------------------------------------------------------------------ selection helpers
  const byId = (id) => S.doc.elements.find(e => e.id === id);
  const selectedEls = () => S.sel.map(byId).filter(Boolean);
  function select(ids, add = false) {
    const next = add ? Array.from(new Set([...S.sel, ...ids])) : ids.slice();
    S.sel = next.filter(id => byId(id));
    renderOverlay(); renderProps(); renderLayers(); updateStatusSel();
  }
  function updateStatusSel() {
    const els = selectedEls();
    const n = els.length;
    $('#statusSel').textContent = n === 0 ? '' : n === 1 ? `${VDL.TYPES[els[0].type].label} selected` : `${n} elements selected`;
  }
  function topLevelIdFromNode(node) {
    let id = null;
    while (node && node !== content) {
      if (node.dataset && node.dataset.id) id = node.dataset.id;
      node = node.parentNode;
    }
    return id;
  }

  // ------------------------------------------------------------------ undo / change tracking
  const snapshot = () => JSON.stringify(S.doc.elements);
  function beginChange() {
    S.undo.push(snapshot());
    if (S.undo.length > 200) S.undo.shift();
    S.redo.length = 0;
  }
  let autosaveTimer = null;
  function endChange(opts = {}) {
    S.dirty = true;
    $('#statusSaved').textContent = 'unsaved changes';
    render();
    if (!opts.keepProps) renderProps();
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(autosave, 400);
  }
  function undo() {
    if (!S.undo.length) return;
    S.redo.push(snapshot());
    S.doc.elements = JSON.parse(S.undo.pop());
    S.sel = S.sel.filter(byId);
    endChange();
  }
  function redo() {
    if (!S.redo.length) return;
    S.undo.push(snapshot());
    S.doc.elements = JSON.parse(S.redo.pop());
    S.sel = S.sel.filter(byId);
    endChange();
  }
  function autosave() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S.project)); } catch (e) { /* quota — ignore */ }
  }

  // ------------------------------------------------------------------ snapping
  function snapVal(v, g) { return Math.round(v / g) * g; }
  function gridSize() { return +S.doc.page.grid || 4; }
  function collectSnapLines(excludeIds) {
    const vs = [], hs = [];
    S.doc.elements.forEach(el => {
      if (el.hidden || excludeIds.has(el.id)) return;
      if (el.type === 'image' && el.reference) return;
      const b = VDL.visualBounds(el);
      vs.push(b.x, b.x + b.w); hs.push(b.y, b.y + b.h);
      if (el.type === 'trace') VDL.parseCols(el.cols, el.w).forEach(c => vs.push(el.x + c.x));
      if (el.type !== 'line' && el.type !== 'axis') { vs.push(b.x + b.w / 2); hs.push(b.y + b.h / 2); }
    });
    vs.push(0, S.doc.page.width); hs.push(0, S.doc.page.height);
    return { vs, hs };
  }
  // Snap a bounding box being moved: returns {dx, dy, guides}
  function snapBox(b, lines, alt) {
    const g = gridSize(), th = 6 / S.view.zoom;
    const guides = [];
    let dx = 0, dy = 0;
    if (!S.snap || alt) return { dx, dy, guides };
    // smart guides
    let best = null;
    [[b.x, 'l'], [b.x + b.w, 'r'], [b.x + b.w / 2, 'c']].forEach(([v]) => lines.vs.forEach(L => { const d = L - v; if (Math.abs(d) < th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, L }; }));
    if (best) { dx = best.d; guides.push({ v: best.L }); } else dx = snapVal(b.x, g) - b.x;
    best = null;
    [[b.y, 't'], [b.y + b.h, 'b'], [b.y + b.h / 2, 'm']].forEach(([v]) => lines.hs.forEach(L => { const d = L - v; if (Math.abs(d) < th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, L }; }));
    if (best) { dy = best.d; guides.push({ h: best.L }); } else dy = snapVal(b.y, g) - b.y;
    return { dx, dy, guides };
  }
  function snapPoint(p, lines, alt, guides) {
    if (!S.snap || alt) return p;
    const g = gridSize(), th = 6 / S.view.zoom;
    let x = snapVal(p.x, g), y = snapVal(p.y, g);
    if (lines) {
      let bx = null, by = null;
      lines.vs.forEach(L => { const d = Math.abs(L - p.x); if (d < th && (bx == null || d < Math.abs(bx - p.x))) bx = L; });
      lines.hs.forEach(L => { const d = Math.abs(L - p.y); if (d < th && (by == null || d < Math.abs(by - p.y))) by = L; });
      if (bx != null) { x = bx; if (guides) guides.push({ v: bx }); }
      if (by != null) { y = by; if (guides) guides.push({ h: by }); }
    }
    return { x, y };
  }

  // ------------------------------------------------------------------ pointer interaction
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function onDown(e) {
    if (e.target.closest('#textEditor')) return;
    canvas.focus();
    const p = toPage(e);
    if (e.button === 1 || S.spaceDown || S.tool === 'pan') {
      S.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: S.view.x, vy: S.view.y };
      canvas.classList.add('panning'); canvas.setPointerCapture(e.pointerId); e.preventDefault(); return;
    }
    if (e.button === 2) { // right button: finish / cancel drawing, otherwise select
      if (S.drawing) { finishDrawing(); return; }
    }
    const def = S.toolDef || TOOLS[1];
    canvas.setPointerCapture(e.pointerId);
    if (def.mode === 'select') {
      const h = e.target.closest('[data-handle]');
      if (h && S.sel.length) { startHandleDrag(h.dataset.handle, p, e); return; }
      const id = topLevelIdFromNode(e.target);
      const el = id ? byId(id) : null;
      if (el && !el.locked && !(el.type === 'image' && el.reference && !S.showRefs)) {
        if (e.shiftKey) { if (S.sel.includes(id)) select(S.sel.filter(i => i !== id)); else select([id], true); }
        else if (!S.sel.includes(id)) select([id]);
        const carried = carriedByTraces(selectedEls());
        S.drag = { kind: 'move', start: p, last: p, moved: false, ids: S.sel.slice(), orig: JSON.stringify(selectedEls()), snapshot: false,
                   carried, carriedOrig: JSON.stringify(carried) };
      } else {
        if (!e.shiftKey) select([]);
        S.drag = { kind: 'marquee', marquee: { x0: p.x, y0: p.y, x1: p.x, y1: p.y }, add: e.shiftKey };
      }
      return;
    }
    if (def.mode === 'rect' || def.mode === 'axis') {
      S.drag = { kind: 'draw', def, start: snapPoint(p, null, e.altKey), cur: p, alt: e.altKey };
      return;
    }
    if (def.mode === 'text') {
      e.preventDefault(); // keep the browser from moving focus back to the canvas after we open the editor
      const sp = snapPoint(p, null, e.altKey);
      beginChange();
      const el = VDL.create('text', Object.assign({ x: sp.x, y: sp.y }, def.props || {}));
      el.w = 80; el.h = Math.round(el.fontSize * 1.6);
      S.doc.elements.push(el);
      endChange(); select([el.id]); setTool('select');
      setTimeout(() => openTextEditor(el), 0);
      return;
    }
    if (def.mode === 'line') {
      const sp = snapPoint(p, collectSnapLines(new Set()), e.altKey);
      if (!S.drawing) {
        S.drawing = { def, el: VDL.create(def.type, Object.assign({}, def.props || {})), points: [sp], cursor: sp, downAt: { x: e.clientX, y: e.clientY }, dragging: true };
      } else {
        S.drawing.points.push(sp); S.drawing.dragging = false;
      }
      renderOverlay();
      return;
    }
  }
  function startHandleDrag(handle, p, e) {
    const els = selectedEls();
    S.drag = { kind: 'handle', handle, start: p, orig: JSON.stringify(els), ids: S.sel.slice(), bounds: VDL.unionBounds(els.map(VDL.bounds)), snapshot: false, alt: e.altKey };
  }
  function onMove(e) {
    const p = toPage(e);
    $('#statusPos').textContent = `${Math.round(p.x)}, ${Math.round(p.y)}`;
    if (S.drawing) {
      const lines = collectSnapLines(new Set());
      S.drawing.cursor = snapPoint(p, lines, e.altKey);
      if (S.drawing.dragging && Math.hypot(e.clientX - S.drawing.downAt.x, e.clientY - S.drawing.downAt.y) > 4) S.drawing.dragMoved = true;
      renderOverlay();
    }
    if (!S.drag) return;
    const d = S.drag;
    if (d.kind === 'pan') { S.view.x = d.vx + e.clientX - d.sx; S.view.y = d.vy + e.clientY - d.sy; renderView(); return; }
    if (d.kind === 'marquee') { d.marquee.x1 = p.x; d.marquee.y1 = p.y; renderOverlay(); return; }
    if (d.kind === 'draw') {
      const lines = collectSnapLines(new Set());
      d.cur = snapPoint(p, lines, e.altKey);
      const x0 = Math.min(d.start.x, d.cur.x), y0 = Math.min(d.start.y, d.cur.y);
      let w = Math.abs(d.cur.x - d.start.x), h = Math.abs(d.cur.y - d.start.y);
      if (e.shiftKey) { w = h = Math.max(w, h); }
      d.ghost = d.def.mode === 'axis' ? axisGhost(d.start, d.cur) : { x: x0, y: y0, w, h };
      d.moved = true;
      renderOverlay(); return;
    }
    if (d.kind === 'move') {
      if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) * S.view.zoom < 3) return;
      if (!d.snapshot) { beginChange(); d.snapshot = true; }
      d.moved = true;
      const els = selectedEls();
      // restore originals then apply delta (so snapping is computed from the original positions)
      const orig = JSON.parse(d.orig);
      els.forEach((el, i) => Object.assign(el, orig[i]));
      let dx = p.x - d.start.x, dy = p.y - d.start.y;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const b = VDL.unionBounds(els.map(VDL.visualBounds));
      const moved = { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
      const sn = snapBox(moved, collectSnapLines(new Set(d.ids)), e.altKey);
      dx += sn.dx; dy += sn.dy;
      d.guides = sn.guides;
      els.forEach(el => VDL.move(el, dx, dy));
      // traces carry the elements that sit inside them (hold Ctrl to leave them behind)
      const carriedOrig = JSON.parse(d.carriedOrig);
      d.carried.forEach((el, i) => { Object.assign(el, carriedOrig[i]); if (!e.ctrlKey) VDL.move(el, dx, dy); });
      renderContent(); renderPropsGeometry();
      return;
    }
    if (d.kind === 'handle') {
      if (!d.snapshot) { beginChange(); d.snapshot = true; }
      applyHandle(d, p, e);
      renderContent(); renderPropsGeometry();
    }
  }
  // elements fully inside a selected trace (and not themselves selected) move with it
  function carriedByTraces(sels) {
    const out = [];
    const selIds = new Set(sels.map(e => e.id));
    sels.forEach(el => {
      if (el.type !== 'trace') return;
      const o = el;
      S.doc.elements.forEach(other => {
        if (out.includes(other)) return;
        if (selIds.has(other.id) || other.locked || (other.type === 'image' && other.reference)) return;
        const b = VDL.bounds(other);
        if (b.x >= o.x - 0.01 && b.y >= o.y - 0.01 && b.x + b.w <= o.x + o.w + 0.01 && b.y + b.h <= o.y + o.h + 0.01 && !(other.type === 'trace' && b.w >= o.w && b.h >= o.h)) out.push(other);
      });
    });
    return out;
  }
  function axisGhost(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) return { x: Math.min(a.x, b.x), y: a.y - 1, w: Math.abs(dx), h: 2, orient: dx >= 0 ? 'h' : 'hl', len: Math.abs(dx) };
    return { x: a.x - 1, y: Math.min(a.y, b.y), w: 2, h: Math.abs(dy), orient: dy >= 0 ? 'v' : 'vu', len: Math.abs(dy) };
  }
  function applyHandle(d, p, e) {
    const els = selectedEls();
    const orig = JSON.parse(d.orig);
    els.forEach((el, i) => Object.assign(el, orig[i]));
    const lines = collectSnapLines(new Set(d.ids));
    const guides = [];
    const sp = snapPoint(p, lines, e.altKey, guides);
    d.guides = guides;
    const h = d.handle;
    if (h.startsWith('pt:')) {
      const idx = +h.slice(3);
      els[0].points[idx] = { x: sp.x, y: sp.y };
      return;
    }
    if (h.startsWith('axis:')) {
      const el = els[0];
      const start = h === 'axis:start' ? sp : { x: el.x, y: el.y };
      const end = h === 'axis:end' ? sp : VDL.axisEnd(el);
      const g = axisGhost(start, end);
      el.orient = g.orient; el.len = Math.max(1, g.len); el.x = start.x; el.y = start.y;
      if (h === 'axis:start') { // keep the end fixed
        const ne = VDL.axisEnd(el); el.x += end.x - ne.x; el.y += end.y - ne.y;
      }
      return;
    }
    const b = d.bounds;
    let x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
    if (h.includes('w')) x0 = sp.x; if (h.includes('e')) x1 = sp.x;
    if (h.includes('n')) y0 = sp.y; if (h.includes('s')) y1 = sp.y;
    if (e.shiftKey && b.w && b.h) { // keep aspect
      const ar = b.w / b.h;
      const nw = x1 - x0, nh = y1 - y0;
      if (Math.abs(nw / ar) > Math.abs(nh)) { const t = nw / ar; if (h.includes('n')) y0 = y1 - t; else y1 = y0 + t; }
      else { const t = nh * ar; if (h.includes('w')) x0 = x1 - t; else x1 = x0 + t; }
    }
    const nb = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
    if (els.length === 1) { VDL.setBounds(els[0], nb); return; }
    // scale the whole selection proportionally
    const sx = b.w ? nb.w / b.w : 1, sy = b.h ? nb.h / b.h : 1;
    els.forEach((el, i) => {
      const ob = VDL.bounds(orig[i]);
      VDL.setBounds(el, { x: nb.x + (ob.x - b.x) * sx, y: nb.y + (ob.y - b.y) * sy, w: ob.w * sx, h: ob.h * sy });
    });
  }
  function onUp(e) {
    if (S.drawing && S.drawing.dragging) {
      // a drag with the line tool creates a simple two-point line
      if (S.drawing.dragMoved) { S.drawing.points.push(S.drawing.cursor); finishDrawing(); }
      else S.drawing.dragging = false;
      return;
    }
    if (!S.drag) return;
    const d = S.drag; S.drag = null;
    canvas.classList.remove('panning');
    if (d.kind === 'pan') return;
    if (d.kind === 'marquee') {
      const m = d.marquee;
      if (Math.abs(m.x1 - m.x0) * S.view.zoom > 3 || Math.abs(m.y1 - m.y0) * S.view.zoom > 3) {
        const r = { x: Math.min(m.x0, m.x1), y: Math.min(m.y0, m.y1), w: Math.abs(m.x1 - m.x0), h: Math.abs(m.y1 - m.y0) };
        const enclose = m.x1 >= m.x0;
        const ids = S.doc.elements.filter(el => {
          if (el.hidden || el.locked || (el.type === 'image' && (el.reference))) return false;
          const b = VDL.visualBounds(el);
          return enclose ? (b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h)
                         : (b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y);
        }).map(el => el.id);
        select(ids, d.add);
      } else renderOverlay();
      return;
    }
    if (d.kind === 'move' || d.kind === 'handle') {
      if (d.snapshot) endChange(); else renderOverlay();
      return;
    }
    if (d.kind === 'draw') {
      const def = d.def;
      beginChange();
      let el;
      if (def.mode === 'axis') {
        const g = d.moved && d.ghost && d.ghost.len > 4 ? d.ghost : null;
        el = VDL.create('axis', Object.assign({ x: d.start.x, y: d.start.y }, def.props || {}));
        if (g) { el.orient = g.orient; el.len = g.len; }
      } else {
        const g = d.moved && d.ghost && (d.ghost.w > 2 || d.ghost.h > 2) ? d.ghost : null;
        const size = def.size || { w: VDL.TYPES[def.type].defaults.w, h: VDL.TYPES[def.type].defaults.h };
        el = VDL.create(def.type, Object.assign({}, def.props || {}));
        if (g) { el.x = g.x; el.y = g.y; el.w = Math.max(1, g.w); el.h = Math.max(1, g.h); }
        else { el.x = d.start.x; el.y = d.start.y; el.w = size.w; el.h = size.h; }
        // bands dropped onto a trace snap to its width by default when drawn as a click
        if (!g && el.type === 'band' && el.w >= 100) {
          const t = new VDLRender.Ctx(S.doc, {}).enclosingTrace(el);
          if (t) { el.x = t.x; el.w = t.w; }
        }
      }
      S.doc.elements.push(el);
      endChange(); select([el.id]);
      if (!e.shiftKey) setTool('select');
    }
  }
  function finishDrawing() {
    const d = S.drawing; S.drawing = null;
    if (!d) return;
    const pts = d.points.filter((p, i) => i === 0 || Math.abs(p.x - d.points[i - 1].x) > 0.01 || Math.abs(p.y - d.points[i - 1].y) > 0.01);
    if (pts.length >= 2) {
      beginChange();
      d.el.points = pts;
      S.doc.elements.push(d.el);
      endChange(); select([d.el.id]);
    } else renderOverlay();
    setTool('select');
  }
  function cancelDrawing() { S.drawing = null; renderOverlay(); }
  function onDblClick(e) {
    if (S.drawing) { finishDrawing(); return; }
    // pointer capture retargets the dblclick to the canvas itself, so look the element up by position
    const target = document.elementFromPoint(e.clientX, e.clientY) || e.target;
    const id = topLevelIdFromNode(target);
    const el = id ? byId(id) : null;
    if (!el || el.locked) return;
    if (el.type === 'line') { // add a vertex near the click
      const p = toPage(e);
      beginChange();
      let best = 0, bd = Infinity;
      for (let i = 0; i < el.points.length - 1; i++) {
        const a = el.points[i], b = el.points[i + 1];
        const L2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / L2));
        const d = Math.hypot(a.x + (b.x - a.x) * t - p.x, a.y + (b.y - a.y) * t - p.y);
        if (d < bd) { bd = d; best = i; }
      }
      el.points.splice(best + 1, 0, snapPoint(p, null, e.altKey));
      endChange(); select([el.id]);
      return;
    }
    if (el.type === 'group') return;
    if ('text' in el || el.type === 'axis' || el.type === 'line') openTextEditor(el);
  }
  function onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const r = canvas.getBoundingClientRect();
      const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom(S.view.zoom * f, e.clientX - r.left, e.clientY - r.top);
    } else {
      if (e.shiftKey) S.view.x -= e.deltaY; else { S.view.x -= e.deltaX; S.view.y -= e.deltaY; }
      renderView();
    }
  }

  // ------------------------------------------------------------------ inline text editor
  const textEd = $('#textEditor'), textArea = textEd.querySelector('textarea');
  let editing = null;
  function openTextEditor(el) {
    const key = el.type === 'axis' || el.type === 'line' ? 'label' : 'text';
    editing = { id: el.id, key, before: el[key] || '' };
    const b = VDL.visualBounds(el);
    const sc = toScreen({ x: b.x, y: b.y });
    const fs = (el.fontSize || el.labelSize || 9) * S.view.zoom;
    textEd.style.left = sc.x + 'px'; textEd.style.top = sc.y + 'px';
    textArea.style.width = Math.max(120, b.w * S.view.zoom) + 'px';
    textArea.style.height = Math.max(fs * 1.6 + 8, b.h * S.view.zoom) + 'px';
    textArea.style.fontSize = Math.max(9, fs) + 'px';
    textArea.style.fontWeight = el.bold ? 'bold' : 'normal';
    textArea.value = el[key] || '';
    textEd.classList.remove('hidden');
    textArea.focus(); textArea.select();
  }
  function closeTextEditor(commit) {
    if (!editing) return;
    const el = byId(editing.id);
    const e = editing; editing = null;
    textEd.classList.add('hidden');
    if (commit && el && textArea.value !== e.before) {
      beginChange();
      el[e.key] = textArea.value;
      if (el.type === 'text') fitTextBox(el);
      endChange();
    }
    canvas.focus();
  }
  textArea.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); closeTextEditor(false); }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); closeTextEditor(true); } // Shift+Enter inserts a line break
    e.stopPropagation();
  });
  textArea.addEventListener('blur', () => closeTextEditor(true));
  function fitTextBox(el) {
    const lines = String(el.text || '').split('\n');
    const fs = +el.fontSize || 10, pad = +el.pad || 0;
    const longest = Math.max(0, ...lines.map(l => VDL.plainText(l).length));
    el.w = Math.max(10, Math.round(longest * fs * (el.bold ? 0.6 : 0.55) + 2 * pad + 4));
    el.h = Math.max(fs, Math.round(lines.length * fs * (+el.lineHeight || 1.2) + 2 * pad));
  }

  // ------------------------------------------------------------------ editing commands
  function deleteSelection() {
    if (!S.sel.length) return;
    beginChange();
    S.doc.elements = S.doc.elements.filter(el => !S.sel.includes(el.id));
    S.sel = [];
    endChange();
  }
  function duplicateSelection(dx = 8, dy = 8) {
    const els = selectedEls();
    if (!els.length) return;
    beginChange();
    const copies = els.map(el => { const c = VDL.clone(el); VDL.move(c, dx, dy); return c; });
    S.doc.elements.push(...copies);
    endChange(); select(copies.map(c => c.id));
  }
  function copySelection() {
    const els = selectedEls();
    if (!els.length) return;
    S.clipboard = JSON.stringify(els);
    try { navigator.clipboard.writeText('VDL:' + S.clipboard); } catch (e) { /* ignore */ }
  }
  async function pasteClipboard() {
    let text = S.clipboard;
    try { const t = await navigator.clipboard.readText(); if (t && t.startsWith('VDL:')) text = t.slice(4); } catch (e) { /* no permission */ }
    if (!text) return;
    let list;
    try { list = JSON.parse(text); } catch (e) { return; }
    if (!Array.isArray(list)) return;
    beginChange();
    const copies = list.map(el => { const c = VDL.clone(el); VDL.move(c, 8, 8); return c; });
    S.doc.elements.push(...copies);
    endChange(); select(copies.map(c => c.id));
  }
  function nudge(dx, dy) {
    const els = selectedEls().filter(el => !el.locked);
    if (!els.length) return;
    beginChange();
    els.forEach(el => VDL.move(el, dx, dy));
    endChange({ keepProps: true }); renderPropsGeometry();
  }
  function reorder(where) {
    const ids = new Set(S.sel);
    if (!ids.size) return;
    beginChange();
    const list = S.doc.elements;
    const selEls = list.filter(el => ids.has(el.id)), rest = list.filter(el => !ids.has(el.id));
    if (where === 'top') S.doc.elements = [...rest, ...selEls];
    else if (where === 'bottom') S.doc.elements = [...selEls, ...rest];
    else if (where === 'up') {
      for (let i = list.length - 2; i >= 0; i--) if (ids.has(list[i].id) && !ids.has(list[i + 1].id)) { [list[i], list[i + 1]] = [list[i + 1], list[i]]; }
    } else if (where === 'down') {
      for (let i = 1; i < list.length; i++) if (ids.has(list[i].id) && !ids.has(list[i - 1].id)) { [list[i], list[i - 1]] = [list[i - 1], list[i]]; }
    }
    endChange();
  }
  function groupSelection() {
    const els = selectedEls();
    if (els.length < 2) return;
    beginChange();
    const g = VDL.create('group', { children: els, name: 'Group' });
    const idx = Math.max(...els.map(el => S.doc.elements.indexOf(el)));
    S.doc.elements = S.doc.elements.filter(el => !els.includes(el));
    S.doc.elements.splice(Math.min(idx, S.doc.elements.length), 0, g);
    endChange(); select([g.id]);
  }
  function ungroupSelection() {
    const groups = selectedEls().filter(el => el.type === 'group');
    if (!groups.length) return;
    beginChange();
    const ids = [];
    groups.forEach(g => {
      const idx = S.doc.elements.indexOf(g);
      S.doc.elements.splice(idx, 1, ...g.children);
      ids.push(...g.children.map(c => c.id));
    });
    endChange(); select(ids);
  }
  function alignSelection(how) {
    const els = selectedEls().filter(el => !el.locked);
    if (els.length < 2) return;
    beginChange();
    const bs = els.map(VDL.visualBounds), U = VDL.unionBounds(bs);
    els.forEach((el, i) => {
      const b = bs[i];
      switch (how) {
        case 'l': VDL.move(el, U.x - b.x, 0); break;
        case 'r': VDL.move(el, U.x + U.w - b.x - b.w, 0); break;
        case 'c': VDL.move(el, U.x + U.w / 2 - b.x - b.w / 2, 0); break;
        case 't': VDL.move(el, 0, U.y - b.y); break;
        case 'b': VDL.move(el, 0, U.y + U.h - b.y - b.h); break;
        case 'm': VDL.move(el, 0, U.y + U.h / 2 - b.y - b.h / 2); break;
      }
    });
    if (how === 'dh' || how === 'dv') {
      const key = how === 'dh' ? 'x' : 'y', size = how === 'dh' ? 'w' : 'h';
      const order = els.map((el, i) => ({ el, b: bs[i] })).sort((a, b) => a.b[key] - b.b[key]);
      const total = order.reduce((s, o) => s + o.b[size], 0);
      const gap = (U[size] - total) / (order.length - 1);
      let pos = U[key];
      order.forEach(o => { const d = pos - o.b[key]; VDL.move(o.el, how === 'dh' ? d : 0, how === 'dv' ? d : 0); pos += o.b[size] + gap; });
    }
    endChange();
  }
  function fitBandToTrace() {
    const els = selectedEls().filter(el => el.type === 'band' || el.type === 'rect');
    if (!els.length) return;
    const ctx = new VDLRender.Ctx(S.doc, {});
    beginChange();
    els.forEach(el => { const t = ctx.enclosingTrace(el); if (t) { el.x = t.x; el.w = t.w; } });
    endChange();
  }
  function fitPageToContent() {
    const els = S.doc.elements.filter(el => !el.hidden);
    if (!els.length) return;
    const b = VDL.unionBounds(els.map(VDLRender.extent));
    beginChange();
    const m = 20;
    S.doc.elements.forEach(el => VDL.move(el, m - b.x, m - b.y));
    S.doc.page.width = Math.ceil(b.w + 2 * m); S.doc.page.height = Math.ceil(b.h + 2 * m);
    endChange(); zoomFit();
  }

  // ------------------------------------------------------------------ properties panel
  const propsHost = $('#props');
  function colorField(key, value, onChange) {
    const wrapEl = document.createElement('div'); wrapEl.className = 'colorField';
    const sw = document.createElement('div'); sw.className = 'swatches';
    const none = document.createElement('div'); none.className = 'swatch none' + (!value ? ' cur' : ''); none.title = 'None'; none.addEventListener('click', () => onChange('', true)); sw.appendChild(none);
    VDL_COLORS.forEach(c => {
      const d = document.createElement('div'); d.className = 'swatch' + (String(value).toUpperCase() === c.hex ? ' cur' : ''); d.style.background = c.hex; d.title = `${c.name} ${c.hex}`;
      d.addEventListener('click', () => onChange(c.hex, true)); sw.appendChild(d);
    });
    const inl = document.createElement('div'); inl.className = 'inline';
    const txt = document.createElement('input'); txt.type = 'text'; txt.value = value || ''; txt.placeholder = 'none';
    txt.addEventListener('change', () => onChange(txt.value.trim(), true));
    const pick = document.createElement('input'); pick.type = 'color'; pick.value = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#000000';
    pick.addEventListener('input', () => onChange(pick.value.toUpperCase(), false));
    pick.addEventListener('change', () => onChange(pick.value.toUpperCase(), true));
    inl.append(txt, pick);
    wrapEl.append(sw, inl);
    return wrapEl;
  }
  function renderProps() {
    const els = selectedEls();
    propsHost.innerHTML = '';
    if (!els.length) {
      $('#propsTitle').textContent = 'Diagram';
      renderDocProps();
      return;
    }
    const el = els[els.length - 1];
    const t = VDL.TYPES[el.type];
    $('#propsTitle').textContent = els.length > 1 ? `${els.length} elements` : t.label;
    const apply = (key, value, commit) => {
      if (commit) { if (S.pendingSnap == null) beginChange(); S.pendingSnap = null; }
      else if (S.pendingSnap == null) { beginChange(); S.pendingSnap = true; }
      selectedEls().forEach(e => { if (key in e || key in (VDL.TYPES[e.type].defaults) || ['x', 'y', 'w', 'h', 'name', 'locked'].includes(key)) e[key] = value; });
      if (commit) endChange({ keepProps: true }); else { render(); }
      if (commit && (key === 'fontSize' || key === 'text') && el.type === 'text') { /* keep box */ }
    };
    const addField = (f, target) => {
      if (f.show && !f.show(el)) return;
      const row = document.createElement('div'); row.className = 'prop' + (f.type === 'textarea' || f.type === 'color' ? ' full' : '');
      if (f.type === 'head') { row.className = 'prop head'; row.textContent = f.label; propsHost.appendChild(row); return; }
      const lab = document.createElement('label'); lab.textContent = f.label; if (f.hint) lab.title = f.hint;
      row.appendChild(lab);
      const cur = target[f.key];
      let inp;
      if (f.type === 'number') {
        inp = document.createElement('input'); inp.type = 'number'; inp.step = f.step ?? 1; if (f.min != null) inp.min = f.min; if (f.max != null) inp.max = f.max;
        inp.value = cur ?? ''; inp.dataset.key = f.key;
        inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (!isNaN(v)) apply(f.key, v, false); });
        inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isNaN(v)) apply(f.key, v, true); });
      } else if (f.type === 'text') {
        inp = document.createElement('input'); inp.type = 'text'; inp.value = cur ?? ''; if (f.hint) inp.placeholder = f.hint;
        inp.addEventListener('change', () => apply(f.key, inp.value, true));
      } else if (f.type === 'textarea') {
        inp = document.createElement('textarea'); inp.value = cur ?? ''; if (f.hint) inp.placeholder = f.hint;
        inp.addEventListener('input', () => apply(f.key, inp.value, false));
        inp.addEventListener('change', () => apply(f.key, inp.value, true));
        inp.addEventListener('keydown', e => e.stopPropagation());
      } else if (f.type === 'check') {
        inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!cur;
        inp.addEventListener('change', () => apply(f.key, inp.checked, true));
      } else if (f.type === 'select') {
        inp = document.createElement('select');
        f.options.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; if (String(v) === String(cur ?? '')) o.selected = true; inp.appendChild(o); });
        inp.addEventListener('change', () => { apply(f.key, inp.value, true); renderProps(); });
      } else if (f.type === 'color') {
        inp = colorField(f.key, cur, (v, commit) => { apply(f.key, v, commit); if (commit) renderProps(); });
      }
      if (inp && inp.tagName !== 'DIV') inp.addEventListener('keydown', e => e.stopPropagation());
      row.appendChild(inp);
      propsHost.appendChild(row);
    };
    // common
    addField({ key: 'name', label: 'Name', type: 'text', hint: t.label }, el);
    if (VDL.kindOf(el) === 'rect') VDL.COMMON_RECT_SCHEMA.forEach(f => addField(f, el));
    if (VDL.kindOf(el) === 'axis') { addField({ key: 'x', label: 'X', type: 'number' }, el); addField({ key: 'y', label: 'Y', type: 'number' }, el); }
    addField({ key: 'locked', label: 'Locked', type: 'check' }, el);
    t.schema.forEach(f => addField(f, el));
    // actions
    const act = document.createElement('div'); act.className = 'propActions';
    const btn = (label, fn, title) => { const b = document.createElement('button'); b.textContent = label; if (title) b.title = title; b.addEventListener('click', fn); act.appendChild(b); };
    if (el.type === 'band' || el.type === 'rect') btn('Fit width to trace', fitBandToTrace, 'Stretch to the enclosing trace width');
    if (el.type === 'text') btn('Fit box to text', () => { beginChange(); fitTextBox(el); endChange(); });
    if (el.type === 'legend') btn('Fit box to items', () => { beginChange(); const L = VDLRender.legendLayout(el); el.w = Math.ceil(L.contentW); el.h = Math.ceil(L.contentH); endChange(); });
    if (el.type === 'image') btn('Reset aspect ratio', () => { if (!el.natW) return; beginChange(); el.h = Math.round(el.w * el.natH / el.natW); endChange(); });
    if (el.type === 'line') {
      btn('Add point', () => { beginChange(); const pts = el.points; const a = pts[pts.length - 2] || pts[0], b = pts[pts.length - 1]; pts.push({ x: b.x + (b.x - a.x) * 0.5 + 10, y: b.y + (b.y - a.y) * 0.5 }); endChange(); });
      btn('Remove point', () => { if (el.points.length <= 2) return; beginChange(); el.points.pop(); endChange(); });
      btn('Reverse', () => { beginChange(); el.points.reverse(); endChange(); }, 'Swap start and end (caps follow)');
    }
    if (el.type === 'trace') btn('Select contents', () => { const ids = S.doc.elements.filter(o => o !== el && !o.locked && inside(VDL.bounds(o), el)).map(o => o.id); select(ids); });
    btn('Duplicate', () => duplicateSelection(), 'Ctrl+D');
    btn('Delete', deleteSelection, 'Delete');
    propsHost.appendChild(act);
  }
  const inside = (b, t) => b.x >= t.x - 0.01 && b.y >= t.y - 0.01 && b.x + b.w <= t.x + t.w + 0.01 && b.y + b.h <= t.y + t.h + 0.01;
  function renderPropsGeometry() { // refresh only x/y/w/h inputs during drags
    const el = selectedEls().slice(-1)[0];
    if (!el) return;
    propsHost.querySelectorAll('input[data-key]').forEach(inp => { const k = inp.dataset.key; if (['x', 'y', 'w', 'h', 'len'].includes(k) && el[k] != null && document.activeElement !== inp) inp.value = Math.round(el[k] * 100) / 100; });
  }
  function renderDocProps() {
    const d = S.doc;
    const mk = (label, input) => { const row = document.createElement('div'); row.className = 'prop'; const l = document.createElement('label'); l.textContent = label; row.append(l, input); propsHost.appendChild(row); };
    const name = document.createElement('input'); name.type = 'text'; name.value = d.name; name.addEventListener('change', () => { d.name = name.value; S.dirty = true; renderDiagrams(); autosave(); });
    const pat = document.createElement('input'); pat.type = 'text'; pat.value = d.pattern || ''; pat.setAttribute('list', 'patternList'); pat.addEventListener('change', () => { d.pattern = pat.value; S.dirty = true; renderDiagrams(); autosave(); });
    [name, pat].forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
    mk('Name', name); mk('Pattern', pat);
    const dl = document.createElement('datalist'); dl.id = 'patternList'; VDL_CATALOG.forEach(c => { const o = document.createElement('option'); o.value = c.name; dl.appendChild(o); }); propsHost.appendChild(dl);
    const info = document.createElement('div'); info.className = 'prop full'; info.innerHTML = `<span class="muted">${d.page.width} × ${d.page.height} px · grid ${d.page.grid} · ${d.elements.length} elements${d.note ? '<br>' + esc(d.note) : ''}</span>`; propsHost.appendChild(info);
    const act = document.createElement('div'); act.className = 'propActions';
    const btn = (label, fn, title) => { const b = document.createElement('button'); b.textContent = label; if (title) b.title = title; b.addEventListener('click', fn); act.appendChild(b); };
    btn('Page settings…', showPageDialog);
    btn('Insert template…', showTemplateDialog, 'Drop a starter layout (trace + axis, legend, stack, graph…) onto this diagram');
    const entry = VDL_CATALOG.find(c => c.name === d.pattern);
    if (entry && entry.refs.length) btn('Add book figure as reference…', () => showReferenceDialog(entry));
    btn('Select all', () => select(S.doc.elements.filter(e => !e.locked && !e.hidden).map(e => e.id)));
    propsHost.appendChild(act);
    const help = document.createElement('div'); help.className = 'prop full';
    help.innerHTML = '<span class="muted">Pick a tool on the left and drag on the page. Double-click text to edit it (x_{sub}, x^{sup}). Hold Alt to ignore snapping, Ctrl while moving a trace to leave its contents behind. Ctrl+wheel zooms.</span>';
    propsHost.appendChild(help);
  }

  // ------------------------------------------------------------------ layers panel
  function renderLayers() {
    const host = $('#layerList');
    host.innerHTML = '';
    const list = S.doc.elements.slice().reverse();
    list.forEach(el => {
      const it = document.createElement('div');
      it.className = 'item' + (S.sel.includes(el.id) ? ' active' : '') + (el.hidden ? ' hiddenEl' : '') + (el.locked ? ' lockedEl' : '');
      const t = VDL.TYPES[el.type] || { label: el.type };
      it.innerHTML = `<span class="tgl eye ${el.hidden ? '' : 'on'}" title="Show / hide">👁</span><span class="tgl lock ${el.locked ? 'on' : ''}" title="Lock / unlock">🔒</span><span class="ico">${layerIcon(el)}</span><span class="name">${esc(el.name || labelFor(el))}</span><span class="sub">${esc(t.label)}</span>`;
      it.querySelector('.eye').addEventListener('click', e => { e.stopPropagation(); beginChange(); el.hidden = !el.hidden; if (el.hidden) S.sel = S.sel.filter(i => i !== el.id); endChange(); });
      it.querySelector('.lock').addEventListener('click', e => { e.stopPropagation(); beginChange(); el.locked = !el.locked; endChange(); });
      it.addEventListener('click', e => { if (e.shiftKey) select([el.id], true); else select([el.id]); });
      it.addEventListener('dblclick', () => { const n = prompt('Element name', el.name || ''); if (n != null) { beginChange(); el.name = n; endChange(); } });
      host.appendChild(it);
    });
  }
  function layerIcon(el) {
    const c = el.fill || el.stroke || el.textColor || '#888';
    return `<span style="display:inline-block;width:10px;height:10px;background:${esc(c)};border:1px solid #999;border-radius:2px"></span>`;
  }
  function labelFor(el) {
    if (el.type === 'text') return VDL.plainText(el.text).split('\n')[0].slice(0, 24) || 'Text';
    if (el.text) return VDL.plainText(el.text).split('\n')[0].slice(0, 24);
    if (el.type === 'axis') return el.label || 'Axis';
    if (el.type === 'image') return el.reference ? 'Reference image' : 'Image';
    return VDL.TYPES[el.type].label;
  }

  // ------------------------------------------------------------------ diagrams panel
  function renderDiagrams() {
    const host = $('#diagramList');
    host.innerHTML = '';
    const f = S.diagramFilter.toLowerCase();
    let shown = 0;
    S.project.diagrams.forEach((d, i) => {
      if (f && !(d.name.toLowerCase().includes(f) || (d.pattern || '').toLowerCase().includes(f))) return;
      shown++;
      const it = document.createElement('div');
      it.className = 'item' + (i === S.project.current ? ' active' : '');
      const n = d.elements.filter(e => !(e.type === 'image' && e.reference)).length;
      it.innerHTML = `<span class="ico">${n ? '●' : '○'}</span><span class="name" title="${esc(d.name)}">${esc(d.name)}</span><span class="sub">${n}</span>`;
      it.addEventListener('click', () => switchDiagram(i));
      it.addEventListener('dblclick', () => { const v = prompt('Diagram name', d.name); if (v != null && v.trim()) { d.name = v.trim(); S.dirty = true; renderDiagrams(); renderProps(); autosave(); } });
      host.appendChild(it);
    });
    $('#diagramCount').textContent = f ? `${shown}/${S.project.diagrams.length}` : `${S.project.diagrams.length}`;
    const active = host.querySelector('.item.active');
    if (active && active.scrollIntoViewIfNeeded) active.scrollIntoViewIfNeeded(false);
  }
  function switchDiagram(i) {
    if (i === S.project.current && S.doc === S.project.diagrams[i]) return;
    closeTextEditor(true);
    if (S.drawing) cancelDrawing();
    S.project.current = i;
    S.doc = S.project.diagrams[i];
    S.sel = []; S.undo = []; S.redo = [];
    render(); renderDiagrams(); renderProps(); zoomFit();
    autosave();
  }
  function addDiagram(doc, after = true) {
    const idx = after ? S.project.current + 1 : S.project.diagrams.length;
    S.project.diagrams.splice(idx, 0, doc);
    S.dirty = true;
    switchDiagram(idx);
  }

  // ------------------------------------------------------------------ project / files
  function loadProject(proj) {
    S.project = VDL.normalise(proj);
    S.doc = S.project.diagrams[S.project.current];
    S.sel = []; S.undo = []; S.redo = []; S.dirty = false;
    S.fileHandle = null;
    $('#statusSaved').textContent = '';
    render(); renderDiagrams(); renderProps(); zoomFit();
  }
  function projectBlob() {
    return new Blob([JSON.stringify(S.project, null, 1)], { type: 'application/json' });
  }
  async function saveProject(as = false) {
    closeTextEditor(true);
    const name = VDLExport.safeName(S.project.name) + '.vdlp.json';
    const r = await VDLExport.saveBlob(projectBlob(), name, 'json', as ? null : S.fileHandle);
    if (r) { S.fileHandle = r.handle; S.dirty = false; $('#statusSaved').textContent = 'saved ' + r.name; autosave(); }
  }
  async function saveDiagram() {
    closeTextEditor(true);
    const blob = new Blob([JSON.stringify(S.doc, null, 1)], { type: 'application/json' });
    const r = await VDLExport.saveBlob(blob, VDLExport.safeName(S.doc.name) + '.vdl.json', 'json');
    if (r) $('#statusSaved').textContent = 'saved ' + r.name;
  }
  async function openFileText(text, fileName) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { alert('That file is not a VDL Studio JSON file.'); return; }
    if (obj && Array.isArray(obj.diagrams)) {
      if (S.dirty && !confirm('Discard unsaved changes in the current project?')) return;
      loadProject(obj);
      $('#statusSaved').textContent = 'opened ' + fileName;
    } else if (obj && Array.isArray(obj.elements)) {
      VDL.normaliseDoc(obj);
      addDiagram(obj);
      $('#statusSaved').textContent = 'added ' + fileName;
    } else alert('That file is not a VDL Studio project or diagram.');
  }
  $('#fileInput').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    openFileText(await VDLExport.readFileText(f), f.name);
    e.target.value = '';
  });
  $('#imageInput').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    await insertImageFile(f, null);
    e.target.value = '';
  });
  async function insertImageFile(file, at) {
    const url = await VDLExport.readFileDataURL(file);
    let size = { w: 200, h: 150 };
    try { size = await VDLExport.imageSize(url); } catch (e) { /* keep default */ }
    const p = S.doc.page;
    const s = Math.min(1, (p.width * 0.8) / size.w, (p.height * 0.8) / size.h);
    const w = Math.round(size.w * s), h = Math.round(size.h * s);
    const pos = at || { x: Math.round((p.width - w) / 2), y: Math.round((p.height - h) / 2) };
    beginChange();
    const el = VDL.create('image', { x: pos.x, y: pos.y, w, h, href: url, natW: size.w, natH: size.h, name: file.name });
    S.doc.elements.push(el);
    endChange(); select([el.id]);
  }
  // drag & drop files onto the canvas
  wrap.addEventListener('dragover', e => { e.preventDefault(); });
  wrap.addEventListener('drop', async e => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    for (const f of files) {
      if (/\.json$/i.test(f.name)) openFileText(await VDLExport.readFileText(f), f.name);
      else if (/^image\//.test(f.type)) await insertImageFile(f, snapPoint(toPage(e), null, false));
    }
  });

  // ------------------------------------------------------------------ export
  async function exportCurrent(kind) {
    closeTextEditor(true);
    const opts = await showExportDialog(kind);
    if (!opts) return;
    const name = VDLExport.safeName(opts.name || S.doc.name);
    try {
      if (kind === 'svg') {
        const svg = VDLExport.docToSVG(S.doc, opts);
        const r = await VDLExport.saveBlob(new Blob([svg], { type: 'image/svg+xml' }), name + '.svg', 'svg');
        if (r) $('#statusSaved').textContent = 'exported ' + r.name;
      } else {
        const blob = await VDLExport.docToPNG(S.doc, opts);
        const r = await VDLExport.saveBlob(blob, name + '.png', 'png');
        if (r) $('#statusSaved').textContent = 'exported ' + r.name;
      }
    } catch (err) { alert('Export failed: ' + err.message); }
  }
  async function copySVG() {
    try { await navigator.clipboard.writeText(VDLExport.docToSVG(S.doc, { area: 'content', margin: 10, background: 'none' })); $('#statusSaved').textContent = 'SVG copied to clipboard'; }
    catch (e) { alert('Clipboard access was refused by the browser.'); }
  }
  async function exportAll() {
    closeTextEditor(true);
    const opts = await showExportAllDialog();
    if (!opts) return;
    const files = [];
    const enc = new TextEncoder();
    const total = S.project.diagrams.length;
    const body = $('#modalBody');
    showModal('Exporting…', '<p id="exportProgress">Starting…</p>');
    let i = 0;
    for (const d of S.project.diagrams) {
      i++;
      if (opts.skipEmpty && !d.elements.some(el => !el.hidden && !(el.type === 'image' && el.reference))) continue;
      const base = String(i).padStart(3, '0') + ' ' + VDLExport.safeName(d.name);
      body.querySelector('#exportProgress').textContent = `${i} / ${total}: ${d.name}`;
      try {
        if (opts.svg) files.push({ name: base + '.svg', data: enc.encode(VDLExport.docToSVG(d, opts)) });
        if (opts.png) { const b = await VDLExport.docToPNG(d, opts); files.push({ name: base + '.png', data: new Uint8Array(await b.arrayBuffer()) }); }
      } catch (err) { console.warn('export failed for', d.name, err); }
      await new Promise(r => setTimeout(r, 0));
    }
    hideModal();
    if (!files.length) { alert('Nothing to export (all diagrams are empty).'); return; }
    const zipBlob = VDLExport.zip(files);
    const r = await VDLExport.saveBlob(zipBlob, VDLExport.safeName(S.project.name) + '.zip', 'zip');
    if (r) $('#statusSaved').textContent = `exported ${files.length} files to ${r.name}`;
  }

  // ------------------------------------------------------------------ modal dialogs
  function showModal(title, html) { $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); }
  function hideModal() { $('#modal').classList.add('hidden'); }
  $('#modalClose').addEventListener('click', hideModal);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') hideModal(); });

  function showExportDialog(kind) {
    return new Promise(resolve => {
      const isPng = kind === 'png';
      showModal(isPng ? 'Export PNG' : 'Export SVG', `
        <div class="field"><label>File name</label><input type="text" id="xName" value="${esc(VDLExport.safeName(S.doc.name))}"></div>
        <div class="field"><label>Area</label><select id="xArea"><option value="content">Content bounds + margin</option><option value="page">Whole page (${S.doc.page.width} × ${S.doc.page.height})</option></select></div>
        <div class="field"><label>Margin</label><input type="number" id="xMargin" value="10" min="0"></div>
        <div class="field"><label>Background</label><select id="xBg"><option value="white">White</option><option value="none">Transparent</option><option value="page">Page colour</option></select></div>
        ${isPng ? '<div class="field"><label>Scale</label><select id="xScale"><option value="1">1× (page pixels)</option><option value="2" selected>2×</option><option value="3">3×</option><option value="4">4×</option><option value="6">6×</option></select></div>' : ''}
        <p class="muted">Reference images are never exported.</p>
        <div class="actions"><button id="xCancel">Cancel</button><button class="primary" id="xOk">Export</button></div>`);
      $('#xCancel').onclick = () => { hideModal(); resolve(null); };
      $('#xOk').onclick = () => {
        const o = { name: $('#xName').value, area: $('#xArea').value, margin: +$('#xMargin').value || 0, background: $('#xBg').value, scale: isPng ? +$('#xScale').value : 1 };
        hideModal(); resolve(o);
      };
      $('#xName').focus();
    });
  }
  function showExportAllDialog() {
    return new Promise(resolve => {
      showModal('Export all diagrams (ZIP)', `
        <div class="field"><label>Formats</label><span><label><input type="checkbox" id="xaSvg" checked> SVG</label> &nbsp; <label><input type="checkbox" id="xaPng" checked> PNG</label></span></div>
        <div class="field"><label>Area</label><select id="xaArea"><option value="content">Content bounds + margin</option><option value="page">Whole page</option></select></div>
        <div class="field"><label>Margin</label><input type="number" id="xaMargin" value="10" min="0"></div>
        <div class="field"><label>Background</label><select id="xaBg"><option value="white">White</option><option value="none">Transparent</option><option value="page">Page colour</option></select></div>
        <div class="field"><label>PNG scale</label><select id="xaScale"><option value="1">1×</option><option value="2" selected>2×</option><option value="3">3×</option><option value="4">4×</option></select></div>
        <div class="field"><label>Skip empty diagrams</label><input type="checkbox" id="xaSkip" checked></div>
        <p class="muted">${S.project.diagrams.length} diagrams in the project. Files are numbered in project order.</p>
        <div class="actions"><button id="xaCancel">Cancel</button><button class="primary" id="xaOk">Export</button></div>`);
      $('#xaCancel').onclick = () => { hideModal(); resolve(null); };
      $('#xaOk').onclick = () => resolve({ svg: $('#xaSvg').checked, png: $('#xaPng').checked, area: $('#xaArea').value, margin: +$('#xaMargin').value || 0, background: $('#xaBg').value, scale: +$('#xaScale').value, skipEmpty: $('#xaSkip').checked });
    });
  }
  function showPageDialog() {
    const p = S.doc.page;
    showModal('Page settings', `
      <div class="field"><label>Diagram name</label><input type="text" id="pgName" value="${esc(S.doc.name)}"></div>
      <div class="field"><label>Pattern</label><input type="text" id="pgPattern" list="patternList2" value="${esc(S.doc.pattern || '')}"><datalist id="patternList2">${VDL_CATALOG.map(c => `<option value="${esc(c.name)}">`).join('')}</datalist></div>
      <div class="field"><label>Width × height</label><span style="display:flex;gap:6px"><input type="number" id="pgW" value="${p.width}" min="10"><input type="number" id="pgH" value="${p.height}" min="10"></span></div>
      <div class="field"><label>Grid / row pitch</label><input type="number" id="pgGrid" value="${p.grid}" min="0.5" step="0.5"></div>
      <div class="field"><label>Background</label><input type="text" id="pgBg" value="${esc(p.background || '#FFFFFF')}"></div>
      <div class="field"><label>Presets</label><span><button id="pg43">960 × 720</button> <button id="pg169">1280 × 720</button> <button id="pgFit">Fit page to content</button></span></div>
      <div class="field"><label>Apply to</label><select id="pgAll"><option value="one">This diagram</option><option value="all">All diagrams in the project (size, grid, background)</option></select></div>
      <div class="actions"><button id="pgCancel">Cancel</button><button class="primary" id="pgOk">Apply</button></div>`);
    $('#pg43').onclick = () => { $('#pgW').value = 960; $('#pgH').value = 720; };
    $('#pg169').onclick = () => { $('#pgW').value = 1280; $('#pgH').value = 720; };
    $('#pgFit').onclick = () => { hideModal(); fitPageToContent(); };
    $('#pgCancel').onclick = hideModal;
    $('#pgOk').onclick = () => {
      const vals = { width: +$('#pgW').value || p.width, height: +$('#pgH').value || p.height, grid: +$('#pgGrid').value || 4, background: $('#pgBg').value || '#FFFFFF' };
      S.doc.name = $('#pgName').value.trim() || S.doc.name; S.doc.pattern = $('#pgPattern').value.trim();
      const targets = $('#pgAll').value === 'all' ? S.project.diagrams : [S.doc];
      targets.forEach(d => Object.assign(d.page, vals));
      S.dirty = true; hideModal(); render(); renderDiagrams(); renderProps(); autosave();
    };
  }
  function showTemplateDialog() {
    const T = VDLTemplates.TEMPLATES;
    showModal('Insert template', `<div class="catalog">${Object.keys(T).map(k => `<div class="item" data-k="${k}"><span class="n">${esc(T[k].label)}</span></div>`).join('')}</div><p class="muted">The template's elements are added to the current diagram and selected, so you can move them as a whole.</p>`);
    $$('#modalBody .item').forEach(it => it.addEventListener('click', () => {
      const els = T[it.dataset.k].build();
      hideModal();
      if (!els.length) return;
      beginChange(); S.doc.elements.push(...els); endChange(); select(els.map(e => e.id));
    }));
  }
  function showPatternDialog() {
    let selected = null;
    const renderList = (filter) => {
      const f = filter.toLowerCase();
      return VDL_CATALOG.filter(c => c.name.toLowerCase().includes(f)).map(c => `<div class="item" data-name="${esc(c.name)}"><span class="n">${esc(c.name)}</span><span class="c">${c.refs.length ? c.refs.length + ' figure' + (c.refs.length > 1 ? 's' : '') : 'no figure'}</span></div>`).join('');
    };
    showModal('New diagram from pattern', `
      <div class="field"><label>Search</label><input type="search" id="patFilter" placeholder="Type a pattern name…"></div>
      <div class="catalog" id="patList">${renderList('')}</div>
      <div class="field" style="margin-top:8px"><label>Book figure</label><select id="patRef"><option value="all">Add the pattern's figures as tracing references (one diagram each)</option><option value="none">Blank diagram, no reference</option></select></div>
      <div class="field"><label>Starter layout</label><select id="patTpl"><option value="">None</option>${Object.keys(VDLTemplates.TEMPLATES).filter(k => k !== 'blank').map(k => `<option value="${k}">${esc(VDLTemplates.TEMPLATES[k].label)}</option>`).join('')}</select></div>
      <div class="actions"><button id="patCancel">Cancel</button><button class="primary" id="patOk" disabled>Add diagram</button></div>`);
    const list = $('#patList');
    const bind = () => list.querySelectorAll('.item').forEach(it => it.addEventListener('click', () => { list.querySelectorAll('.item').forEach(x => x.classList.remove('sel')); it.classList.add('sel'); selected = it.dataset.name; $('#patOk').disabled = false; }));
    bind();
    $('#patFilter').addEventListener('input', e => { list.innerHTML = renderList(e.target.value); selected = null; $('#patOk').disabled = true; bind(); });
    $('#patFilter').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { const first = list.querySelector('.item'); if (first) first.click(); } });
    $('#patCancel').onclick = hideModal;
    $('#patOk').onclick = () => {
      if (!selected) return;
      const entry = VDL_CATALOG.find(c => c.name === selected);
      const withRefs = $('#patRef').value === 'all' && entry.refs.length;
      const tpl = $('#patTpl').value;
      hideModal();
      const docs = [];
      const make = (name, ref) => {
        const doc = VDL.newDoc(name, entry.name);
        doc.page = Object.assign({}, S.doc.page);
        if (ref) doc.elements.push(referenceElement(ref, doc.page));
        if (tpl) doc.elements.push(...VDLTemplates.TEMPLATES[tpl].build());
        return doc;
      };
      if (withRefs) entry.refs.forEach((r, i) => docs.push(make(entry.refs.length > 1 ? `${entry.name} (${i + 1})` : entry.name, r)));
      else docs.push(make(entry.name, null));
      const idx = S.project.current + 1;
      S.project.diagrams.splice(idx, 0, ...docs);
      S.dirty = true; switchDiagram(idx);
    };
    $('#patFilter').focus();
  }
  function referenceElement(ref, page) {
    const margin = 20;
    const s = Math.min((page.width - 2 * margin) / ref.w, (page.height - 2 * margin) / ref.h);
    return VDL.create('image', { x: margin, y: margin, w: Math.round(ref.w * s), h: Math.round(ref.h * s), href: 'reference/' + ref.file, natW: ref.w, natH: ref.h, reference: true, opacity: 0.55, locked: true, name: 'Reference: ' + ref.file });
  }
  function showReferenceDialog(entry) {
    showModal('Add book figure as reference', `<div class="catalog">${entry.refs.map(r => `<div class="item" data-f="${esc(r.file)}"><span class="n">${esc(r.file)}</span><span class="c">${r.w} × ${r.h}</span></div>`).join('')}</div>`);
    $$('#modalBody .item').forEach(it => it.addEventListener('click', () => {
      const r = entry.refs.find(x => x.file === it.dataset.f);
      hideModal(); beginChange(); S.doc.elements.unshift(referenceElement(r, S.doc.page)); endChange();
    }));
  }
  function showHelp() {
    showModal('VDL Studio — help', `
      <p><b>VDL Studio</b> draws Dia|gram figures — the graphical diagnostic analysis language used in the book <a href="https://www.dumpanalysis.org/trace-log-analysis-pattern-reference" target="_blank" rel="noopener"><i>Trace, Log, Text, Narrative, Data: An Analysis Pattern Reference for Information Mining, Diagnostics, Anomaly Detection</i>, Fifth Edition</a>: time axes, traces with message rows and columns, message blocks, annotations, arrows and graphs.</p>
      <h4>Drawing</h4>
      <p>Pick a tool and drag on the page; a plain click inserts the default size. Message blocks dropped inside a trace take the trace's width, inherit its row texture and column lines, and move with it. Hold <kbd>Alt</kbd> to bypass snapping, <kbd>Shift</kbd> to constrain. Line tools: drag for a two-point arrow, or click-click-click and finish with <kbd>Enter</kbd> / double-click (<kbd>Esc</kbd> cancels). Double-click a line to add a vertex.</p>
      <h4>Text</h4>
      <p>Double-click any text to edit it. Use <code>x_{sub}</code> and <code>x^{sup}</code> for sub/superscripts (e.g. <code>J_{m1}</code>, <code>T^{2}</code>).</p>
      <h4>Files</h4>
      <p>A <b>project</b> (.vdlp.json) holds many diagrams; a single diagram can also be saved on its own (.vdl.json). The work in progress is also kept in the browser's local storage. Export the current diagram as SVG/PNG, or all diagrams as a ZIP.</p>
      <h4>Keyboard</h4>
      <table>
        <tr><td><kbd>V</kbd> select · <kbd>H</kbd> pan · <kbd>Space</kbd>+drag pan · <kbd>Ctrl</kbd>+wheel zoom · <kbd>0</kbd> fit · <kbd>+</kbd>/<kbd>−</kbd> zoom</td></tr>
        <tr><td><kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+Y</kbd> redo · <kbd>Ctrl+C</kbd>/<kbd>V</kbd>/<kbd>X</kbd> copy/paste/cut · <kbd>Ctrl+D</kbd> duplicate · <kbd>Ctrl+A</kbd> select all · <kbd>Del</kbd> delete</td></tr>
        <tr><td><kbd>Arrows</kbd> nudge by one grid step (<kbd>Shift</kbd> ×5) · <kbd>Ctrl+G</kbd> group · <kbd>Ctrl+Shift+G</kbd> ungroup · <kbd>Ctrl+]</kbd>/<kbd>[</kbd> forward/backward (<kbd>Shift</kbd> to front/back)</td></tr>
        <tr><td><kbd>Ctrl+S</kbd> save project · <kbd>Ctrl+O</kbd> open · <kbd>Ctrl+E</kbd> export SVG · <kbd>Ctrl+Shift+E</kbd> export PNG · <kbd>PgUp</kbd>/<kbd>PgDn</kbd> previous/next diagram · <kbd>F1</kbd> help</td></tr>
        <tr><td>Tool keys: <kbd>T</kbd> trace · <kbd>B</kbd> block · <kbd>M</kbd> message · <kbd>A</kbd> time axis · <kbd>R</kbd> rectangle · <kbd>E</kbd> ellipse · <kbd>X</kbd> text · <kbd>L</kbd> arrow · <kbd>C</kbd> elbow · <kbd>N</kbd> note</td></tr>
      </table>
      <p class="muted">Dia|gram: <a href="https://www.dumpanalysis.org/diagram-diagnostic-analysis-language" target="_blank" rel="noopener">dumpanalysis.org</a></p>
      <p class="muted">VDL Studio © 2026 Dmitry Vostokov — PolyForm Noncommercial License 1.0.0 (personal and other noncommercial use; see LICENSE.md).</p>`);
  }

  // ------------------------------------------------------------------ keyboard
  window.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (!$('#modal').classList.contains('hidden')) { if (e.key === 'Escape') hideModal(); return; }
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key;
    if (k === ' ' && !S.spaceDown) { S.spaceDown = true; canvas.classList.add('tool-pan'); e.preventDefault(); return; }
    if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (ctrl && k.toLowerCase() === 's') { e.preventDefault(); saveProject(e.shiftKey); return; }
    if (ctrl && k.toLowerCase() === 'o') { e.preventDefault(); $('#fileInput').click(); return; }
    if (ctrl && k.toLowerCase() === 'e') { e.preventDefault(); exportCurrent(e.shiftKey ? 'png' : 'svg'); return; }
    if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); select(S.doc.elements.filter(el => !el.locked && !el.hidden && !(el.type === 'image' && el.reference)).map(el => el.id)); return; }
    if (ctrl && k.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return; }
    if (ctrl && k.toLowerCase() === 'x') { e.preventDefault(); copySelection(); deleteSelection(); return; }
    if (ctrl && k.toLowerCase() === 'v') { e.preventDefault(); pasteClipboard(); return; }
    if (ctrl && k.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(); return; }
    if (ctrl && k.toLowerCase() === 'g') { e.preventDefault(); if (e.shiftKey) ungroupSelection(); else groupSelection(); return; }
    if (ctrl && (k === ']' || k === '}')) { e.preventDefault(); reorder(e.shiftKey ? 'top' : 'up'); return; }
    if (ctrl && (k === '[' || k === '{')) { e.preventDefault(); reorder(e.shiftKey ? 'bottom' : 'down'); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
    if (k === 'Escape') { if (S.drawing) cancelDrawing(); else { select([]); setTool('select'); } return; }
    if (k === 'Enter' && S.drawing) { finishDrawing(); return; }
    if (k.startsWith('Arrow')) {
      e.preventDefault();
      const step = (S.snap ? gridSize() : 1) * (e.shiftKey ? 5 : 1);
      nudge(k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0, k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0);
      return;
    }
    if (k === 'PageUp' || k === 'PageDown') { e.preventDefault(); const i = S.project.current + (k === 'PageUp' ? -1 : 1); if (i >= 0 && i < S.project.diagrams.length) switchDiagram(i); return; }
    if (k === 'F1') { e.preventDefault(); showHelp(); return; }
    if (k === '+' || k === '=') { setZoom(S.view.zoom * 1.2); return; }
    if (k === '-' || k === '_') { setZoom(S.view.zoom / 1.2); return; }
    if (k === '0') { zoomFit(); return; }
    if (ctrl) return;
    const toolKeys = { v: 'select', h: 'pan', a: 'axis', t: 'trace', b: 'band', m: 'message', r: 'rect', e: 'ellipse', x: 'text', l: 'line', c: 'connector', n: 'note', g: 'legend', i: 'image', p: 'polygon', d: 'dimension' };
    if (toolKeys[k.toLowerCase()]) setTool(toolKeys[k.toLowerCase()]);
  });
  window.addEventListener('keyup', e => { if (e.key === ' ') { S.spaceDown = false; if (S.tool !== 'pan') canvas.classList.remove('tool-pan'); } });
  window.addEventListener('beforeunload', () => autosave());
  window.addEventListener('resize', () => renderView());

  // ------------------------------------------------------------------ toolbar wiring
  $('#btnNewProject').addEventListener('click', () => {
    showModal('New project', `
      <p>Start a new project. The current project stays in the browser's local storage until you replace it, so save it first if you need it.</p>
      <div class="actions" style="justify-content:flex-start;flex-wrap:wrap">
        <button id="npBlank">Blank project</button>
        <button id="npBook" class="primary" title="One diagram per figure of the book, each with the figure as a locked tracing reference">Book project (${VDL_CATALOG.reduce((s, c) => s + Math.max(1, c.refs.length), 0)} diagrams)</button>
        <button id="npCancel">Cancel</button>
      </div>`);
    $('#npCancel').onclick = hideModal;
    $('#npBlank').onclick = () => { if (S.dirty && !confirm('Discard unsaved changes?')) return; hideModal(); loadProject(VDL.newProject('Untitled project')); };
    $('#npBook').onclick = () => { if (S.dirty && !confirm('Discard unsaved changes?')) return; hideModal(); loadProject(VDLTemplates.buildBookProject()); };
  });
  $('#btnOpen').addEventListener('click', () => $('#fileInput').click());
  $('#btnSave').addEventListener('click', () => saveProject(false));
  $('#btnSaveAs').addEventListener('click', () => saveProject(true));
  $('#btnSaveDiagram').addEventListener('click', saveDiagram);
  $('#btnUndo').addEventListener('click', undo);
  $('#btnRedo').addEventListener('click', redo);
  $('#btnExportSVG').addEventListener('click', () => exportCurrent('svg'));
  $('#btnExportPNG').addEventListener('click', () => exportCurrent('png'));
  $('#btnExportAll').addEventListener('click', exportAll);
  $('#btnCopySVG').addEventListener('click', copySVG);
  $('#btnZoomIn').addEventListener('click', () => setZoom(S.view.zoom * 1.2));
  $('#btnZoomOut').addEventListener('click', () => setZoom(S.view.zoom / 1.2));
  $('#btnZoomFit').addEventListener('click', zoomFit);
  $('#zoomLabel').addEventListener('click', () => setZoom(1));
  $('#chkSnap').addEventListener('change', e => S.snap = e.target.checked);
  $('#chkGrid').addEventListener('change', e => { S.grid = e.target.checked; renderGrid(); });
  $('#chkRefs').addEventListener('change', e => { S.showRefs = e.target.checked; render(); });
  $('#btnPage').addEventListener('click', showPageDialog);
  $('#btnHelp').addEventListener('click', showHelp);
  $('#btnDiagramNew').addEventListener('click', () => { const d = VDL.newDoc('Diagram ' + (S.project.diagrams.length + 1)); d.page = Object.assign({}, S.doc.page); addDiagram(d); });
  $('#btnDiagramFromPattern').addEventListener('click', showPatternDialog);
  $('#btnDiagramDup').addEventListener('click', () => { const c = JSON.parse(JSON.stringify(S.doc)); c.name += ' (copy)'; VDL.normaliseDoc(c); c.elements.forEach(el => { el.id = VDL.nextId(); }); addDiagram(c); });
  $('#btnDiagramDel').addEventListener('click', () => {
    if (S.project.diagrams.length <= 1) { alert('A project needs at least one diagram.'); return; }
    if (!confirm(`Delete diagram "${S.doc.name}"?`)) return;
    const i = S.project.current;
    S.project.diagrams.splice(i, 1);
    S.project.current = Math.min(i, S.project.diagrams.length - 1);
    S.doc = null; S.dirty = true;
    switchDiagram(S.project.current);
  });
  $('#diagramFilter').addEventListener('input', e => { S.diagramFilter = e.target.value; renderDiagrams(); });
  $('#diagramFilter').addEventListener('keydown', e => e.stopPropagation());
  $('#btnLayerTop').addEventListener('click', () => reorder('top'));
  $('#btnLayerUp').addEventListener('click', () => reorder('up'));
  $('#btnLayerDown').addEventListener('click', () => reorder('down'));
  $('#btnLayerBottom').addEventListener('click', () => reorder('bottom'));
  $('#btnGroup').addEventListener('click', groupSelection);
  $('#btnUngroup').addEventListener('click', ungroupSelection);
  $('#btnAlignL').addEventListener('click', () => alignSelection('l'));
  $('#btnAlignC').addEventListener('click', () => alignSelection('c'));
  $('#btnAlignR').addEventListener('click', () => alignSelection('r'));
  $('#btnAlignT').addEventListener('click', () => alignSelection('t'));
  $('#btnAlignM').addEventListener('click', () => alignSelection('m'));
  $('#btnAlignB').addEventListener('click', () => alignSelection('b'));
  $('#btnDistH').addEventListener('click', () => alignSelection('dh'));
  $('#btnDistV').addEventListener('click', () => alignSelection('dv'));

  // ------------------------------------------------------------------ boot
  buildTools();
  setTool('select');
  let restored = null;
  try { const t = localStorage.getItem(LS_KEY); if (t) restored = JSON.parse(t); } catch (e) { restored = null; }
  if (restored) {
    loadProject(restored);
    $('#statusSaved').textContent = 'restored from local storage';
  } else {
    const proj = VDLTemplates.buildBookProject();
    // open on a worked example so the app does not start on an empty page
    proj.current = Math.max(0, proj.diagrams.findIndex(d => d.name === 'Activity Region'));
    loadProject(proj);
    $('#statusSaved').textContent = 'book project created — pick a diagram on the left';
  }
  window.VDLStudio = { state: S, render, select, loadProject };
})();
