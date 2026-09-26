// VDL Studio — Copyright © 2026 Dmitry Vostokov. Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE.md).
// VDL Studio — document model: element types, defaults, property schemas, geometry helpers.
// A diagram ("doc") is { version, name, pattern, page:{width,height,grid,background}, elements:[...] }.
// Every element has: id, type, name?, locked?, hidden?, plus type-specific properties.
// Rect-like elements carry x, y, w, h. Lines carry points[]. Axes carry x, y, len, orient. Groups carry children[].

const VDL = (() => {
  let idCounter = 1;
  const nextId = () => 'e' + (idCounter++);
  const bumpIdCounter = (elements) => {
    const walk = (list) => list.forEach(el => {
      const m = /^e(\d+)$/.exec(el.id || '');
      if (m) idCounter = Math.max(idCounter, parseInt(m[1], 10) + 1);
      if (el.children) walk(el.children);
    });
    walk(elements);
  };

  // ---------- property schema field helpers ----------
  const F = {
    num:   (key, label, o = {}) => Object.assign({ key, label, type: 'number', step: 1 }, o),
    text:  (key, label, o = {}) => Object.assign({ key, label, type: 'text' }, o),
    area:  (key, label, o = {}) => Object.assign({ key, label, type: 'textarea' }, o),
    color: (key, label, o = {}) => Object.assign({ key, label, type: 'color' }, o),
    check: (key, label, o = {}) => Object.assign({ key, label, type: 'check' }, o),
    sel:   (key, label, options, o = {}) => Object.assign({ key, label, type: 'select', options }, o),
    head:  (label) => ({ type: 'head', label }),
  };
  const CAPS = [['none', 'None'], ['arrow', 'Arrow'], ['open', 'Open arrow'], ['dot', 'Dot'], ['bar', 'Bar'], ['diamond', 'Diamond'], ['square', 'Square']];
  const ROWS = [['none', 'None (flat)'], ['light', 'Light lines'], ['dark', 'Dark lines'], ['text', 'Text lines']];
  const ALIGN = [['left', 'Left'], ['center', 'Center'], ['right', 'Right']];
  const VALIGN = [['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']];
  const DASH = [['', 'Solid'], ['4 2', 'Dashed'], ['1.5 1.5', 'Dotted'], ['6 2 1.5 2', 'Dash-dot']];

  const textFields = (prefix = '') => [
    F.head('Label'),
    F.area('text', 'Text'),
    F.color('textColor', 'Text colour'),
    F.num('fontSize', 'Font size', { min: 3, max: 200, step: 0.5 }),
    F.check('bold', 'Bold'),
    F.check('italic', 'Italic'),
    F.sel('align', 'Align', ALIGN),
    F.sel('valign', 'Vertical align', VALIGN),
    F.num('pad', 'Text padding', { min: 0, max: 500 }),
    F.num('textRotate', 'Text rotation', { min: -180, max: 180 }),
  ];
  const strokeFields = () => [
    F.color('stroke', 'Outline'),
    F.num('strokeWidth', 'Outline width', { min: 0, max: 40, step: 0.5 }),
    F.sel('dash', 'Outline style', DASH),
  ];

  // ---------- element type registry ----------
  const TYPES = {
    axis: {
      label: 'Time axis', kind: 'axis',
      defaults: { orient: 'v', len: 400, label: 'Time', labelPos: 'start', labelAlign: 'middle', fontSize: 9, bold: true,
                  stroke: '#000000', width: 1.5, startCap: 'dot', endCap: 'arrow', capSize: 6, dash: '', opacity: 1, labelGap: 4 },
      schema: [
        F.sel('orient', 'Orientation', [['v', 'Vertical (down)'], ['h', 'Horizontal (right)'], ['vu', 'Vertical (up)'], ['hl', 'Horizontal (left)']]),
        F.num('len', 'Length', { min: 1 }),
        F.text('label', 'Label'),
        F.sel('labelPos', 'Label position', [['start', 'At start'], ['end', 'At end'], ['none', 'Hidden']]),
        F.sel('labelAlign', 'Label anchor', [['start', 'Start'], ['middle', 'Middle'], ['end', 'End']]),
        F.num('labelGap', 'Label gap', { min: -50, max: 100 }),
        F.num('fontSize', 'Font size', { min: 3, max: 100, step: 0.5 }),
        F.check('bold', 'Bold'),
        F.color('stroke', 'Line colour'),
        F.num('width', 'Line width', { min: 0.25, max: 20, step: 0.25 }),
        F.sel('dash', 'Line style', DASH),
        F.sel('startCap', 'Start cap', CAPS),
        F.sel('endCap', 'End cap', CAPS),
        F.num('capSize', 'Cap size', { min: 1, max: 40, step: 0.5 }),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
      ],
    },
    trace: {
      label: 'Trace', kind: 'rect',
      defaults: { w: 150, h: 400, fill: '#A6A6A6', rows: 'light', pitch: 4, rowOpacity: 0.45,
                  cols: '#:10,PID:12,TID:12,Time:16,Message', colLines: true, colLineColor: '#000000', colLineWidth: 1,
                  header: true, headerSize: 5.5, headerBold: true, headerColor: '#000000',
                  stroke: '', strokeWidth: 1, dash: '', opacity: 1,
                  text: '', textColor: '#000000', fontSize: 14, bold: true, italic: false, align: 'center', valign: 'middle', textRotate: 0 },
      schema: [
        F.color('fill', 'Fill'),
        F.sel('rows', 'Message rows', ROWS),
        F.num('pitch', 'Row pitch', { min: 1, max: 100, step: 0.5 }),
        F.num('rowOpacity', 'Row line opacity', { min: 0, max: 1, step: 0.05 }),
        F.head('Columns'),
        F.text('cols', 'Columns spec', { hint: 'label:width, … — last column takes the remainder' }),
        F.check('colLines', 'Column lines'),
        F.color('colLineColor', 'Column line colour'),
        F.num('colLineWidth', 'Column line width', { min: 0.25, max: 10, step: 0.25 }),
        F.check('header', 'Header labels'),
        F.num('headerSize', 'Header size', { min: 2, max: 60, step: 0.5 }),
        F.check('headerBold', 'Header bold'),
        F.color('headerColor', 'Header colour'),
        F.head('Outline'),
        ...strokeFields(),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
        ...textFields(),
      ],
    },
    band: {
      label: 'Message block', kind: 'rect',
      defaults: { w: 150, h: 40, fill: '#00B050', rows: 'inherit', pitch: 4, rowOpacity: 0.45, colLines: 'inherit',
                  stroke: '', strokeWidth: 1, dash: '', opacity: 1, fill2: '', gradDir: 'v',
                  text: '', textColor: '#000000', fontSize: 9, bold: true, italic: false, align: 'center', valign: 'middle', textRotate: 0 },
      schema: [
        F.color('fill', 'Fill'),
        F.color('fill2', 'Gradient to', { hint: 'leave empty for a flat fill' }),
        F.sel('gradDir', 'Gradient direction', [['v', 'Top → bottom'], ['h', 'Left → right']]),
        F.sel('rows', 'Message rows', [['inherit', 'Same as trace'], ...ROWS]),
        F.num('pitch', 'Row pitch', { min: 1, max: 100, step: 0.5 }),
        F.num('rowOpacity', 'Row line opacity', { min: 0, max: 1, step: 0.05 }),
        F.sel('colLines', 'Column lines', [['inherit', 'From enclosing trace'], ['none', 'None']]),
        F.head('Outline'),
        ...strokeFields(),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
        ...textFields(),
      ],
    },
    rect: {
      label: 'Shape', kind: 'rect',
      defaults: { w: 80, h: 40, shape: 'rect', fill: '#0070C0', fill2: '', gradDir: 'v', stroke: '', strokeWidth: 1, dash: '', rx: 0,
                  rows: 'none', pitch: 4, rowOpacity: 0.45, rotation: 0, opacity: 1,
                  text: '', textColor: '#FFFFFF', fontSize: 9, bold: true, italic: false, align: 'center', valign: 'middle', textRotate: 0 },
      schema: [
        F.sel('shape', 'Shape', [['rect', 'Rectangle'], ['rounded', 'Rounded rectangle'], ['note', 'Note (dog-ear)'], ['tag', 'Tag (pointed)'],
                                  ['diamond', 'Diamond'], ['triangle', 'Triangle'], ['hexagon', 'Hexagon'], ['parallelogram', 'Parallelogram'],
                                  ['callout', 'Callout (pointer left)'], ['cross', 'Cross mark ✕'], ['bracket', 'Bracket [ ']]),
        F.color('fill', 'Fill'),
        F.color('fill2', 'Gradient to', { hint: 'leave empty for a flat fill' }),
        F.sel('gradDir', 'Gradient direction', [['v', 'Top → bottom'], ['h', 'Left → right']]),
        F.sel('rows', 'Row texture', ROWS),
        F.num('pitch', 'Row pitch', { min: 1, max: 100, step: 0.5 }),
        F.num('rx', 'Corner radius', { min: 0, max: 200 }),
        F.num('rotation', 'Rotation', { min: -360, max: 360 }),
        F.head('Outline'),
        ...strokeFields(),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
        ...textFields(),
      ],
    },
    ellipse: {
      label: 'Ellipse', kind: 'rect',
      defaults: { w: 40, h: 40, fill: '#000000', stroke: '', strokeWidth: 1, dash: '', rotation: 0, opacity: 1,
                  text: '', textColor: '#FFFFFF', fontSize: 9, bold: true, italic: false, align: 'center', valign: 'middle', textRotate: 0 },
      schema: [
        F.color('fill', 'Fill'),
        F.num('rotation', 'Rotation', { min: -360, max: 360 }),
        F.head('Outline'),
        ...strokeFields(),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
        ...textFields(),
      ],
    },
    text: {
      label: 'Text', kind: 'rect',
      defaults: { w: 80, h: 16, text: 'Text', textColor: '#000000', fontSize: 10, bold: true, italic: false, align: 'left', valign: 'top',
                  bg: '', stroke: '', strokeWidth: 1, dash: '', pad: 2, rotation: 0, opacity: 1, lineHeight: 1.2, family: '' },
      schema: [
        F.area('text', 'Text', { hint: 'x_{sub}  x^{sup}  — new lines allowed' }),
        F.color('textColor', 'Colour'),
        F.num('fontSize', 'Font size', { min: 3, max: 300, step: 0.5 }),
        F.check('bold', 'Bold'),
        F.check('italic', 'Italic'),
        F.sel('align', 'Align', ALIGN),
        F.sel('valign', 'Vertical align', VALIGN),
        F.num('lineHeight', 'Line height', { min: 0.5, max: 4, step: 0.05 }),
        F.text('family', 'Font family', { hint: 'empty = Arial' }),
        F.num('rotation', 'Rotation', { min: -360, max: 360 }),
        F.head('Box'),
        F.color('bg', 'Background'),
        ...strokeFields(),
        F.num('pad', 'Padding', { min: 0, max: 100 }),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
      ],
    },
    line: {
      label: 'Line / arrow', kind: 'line',
      defaults: { points: [], route: 'straight', closed: false, fill: '', stroke: '#000000', width: 1.5, dash: '',
                  startCap: 'none', endCap: 'arrow', capSize: 6, opacity: 1, label: '', labelSize: 8, labelColor: '#000000', labelPos: 0.5,
                  bend: 0.5, tension: 0.5 },
      schema: [
        F.sel('route', 'Routing', [['straight', 'Straight segments'], ['ortho', 'Orthogonal (elbow)'], ['curve', 'Smooth curve']]),
        F.num('bend', 'Elbow position', { min: 0, max: 1, step: 0.05, show: el => el.route === 'ortho' }),
        F.sel('orthoFirst', 'Elbow leaves', [['auto', 'Auto'], ['h', 'Horizontally'], ['v', 'Vertically']], { show: el => el.route === 'ortho' }),
        F.check('closed', 'Closed (polygon)'),
        F.color('fill', 'Fill (closed)'),
        F.color('stroke', 'Line colour'),
        F.num('width', 'Line width', { min: 0, max: 40, step: 0.25 }),
        F.sel('dash', 'Line style', DASH),
        F.sel('startCap', 'Start cap', CAPS),
        F.sel('endCap', 'End cap', CAPS),
        F.num('capSize', 'Cap size', { min: 1, max: 40, step: 0.5 }),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
        F.head('Label'),
        F.text('label', 'Label'),
        F.num('labelSize', 'Label size', { min: 3, max: 100, step: 0.5 }),
        F.color('labelColor', 'Label colour'),
        F.num('labelPos', 'Label position', { min: 0, max: 1, step: 0.05 }),
        F.num('labelOffset', 'Label offset', { min: -100, max: 100 }),
      ],
    },
    legend: {
      label: 'Legend', kind: 'rect',
      defaults: { w: 110, h: 60, items: '#FFC000 Initialization\n#00B0F0 Database Access\n#00B050 User Request\n#A6A6A6 Network',
                  swatchW: 28, swatchH: 7, gap: 6, fontSize: 7, bold: false, textColor: '#000000', orient: 'v', bg: '', stroke: '', strokeWidth: 1, dash: '', pad: 4, opacity: 1, swatchRows: 'none' },
      schema: [
        F.area('items', 'Items', { hint: 'one per line: #colour label' }),
        F.sel('orient', 'Layout', [['v', 'Vertical'], ['h', 'Horizontal']]),
        F.num('swatchW', 'Swatch width', { min: 1, max: 300 }),
        F.num('swatchH', 'Swatch height', { min: 1, max: 300 }),
        F.sel('swatchRows', 'Swatch texture', ROWS),
        F.num('gap', 'Gap', { min: 0, max: 100 }),
        F.num('fontSize', 'Font size', { min: 3, max: 100, step: 0.5 }),
        F.check('bold', 'Bold'),
        F.color('textColor', 'Text colour'),
        F.head('Box'),
        F.color('bg', 'Background'),
        ...strokeFields(),
        F.num('pad', 'Padding', { min: 0, max: 100 }),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
      ],
    },
    image: {
      label: 'Image', kind: 'rect',
      defaults: { w: 200, h: 150, href: '', natW: 0, natH: 0, reference: false, opacity: 1, rotation: 0, stroke: '', strokeWidth: 1, dash: '' },
      schema: [
        F.check('reference', 'Reference (tracing aid, never exported)'),
        F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 }),
        F.num('rotation', 'Rotation', { min: -360, max: 360 }),
        F.text('href', 'Source', { hint: 'relative path or data URL' }),
        ...strokeFields(),
      ],
    },
    group: {
      label: 'Group', kind: 'group',
      defaults: { children: [], opacity: 1 },
      schema: [F.num('opacity', 'Opacity', { min: 0, max: 1, step: 0.05 })],
    },
  };

  const COMMON_RECT_SCHEMA = [
    F.num('x', 'X', { step: 1 }), F.num('y', 'Y', { step: 1 }), F.num('w', 'Width', { min: 0 }), F.num('h', 'Height', { min: 0 }),
  ];

  function create(type, props = {}) {
    const t = TYPES[type];
    if (!t) throw new Error('Unknown element type ' + type);
    const el = Object.assign({ id: nextId(), type }, JSON.parse(JSON.stringify(t.defaults)), props);
    if (t.kind === 'rect') { el.x = el.x ?? 0; el.y = el.y ?? 0; }
    if (t.kind === 'axis') { el.x = el.x ?? 0; el.y = el.y ?? 0; }
    return el;
  }
  function clone(el) {
    const c = JSON.parse(JSON.stringify(el));
    const reid = (e) => { e.id = nextId(); if (e.children) e.children.forEach(reid); };
    reid(c);
    return c;
  }
  const kindOf = (el) => (TYPES[el.type] || {}).kind || 'rect';

  // ---------- columns ----------
  function parseCols(spec, totalW) {
    const parts = String(spec || '').split(',').map(s => s.trim()).filter(Boolean);
    const cols = parts.map(p => {
      const m = /^(.*?):\s*([\d.]+|\*)\s*$/.exec(p);
      if (m) return { label: m[1].trim(), w: m[2] === '*' ? null : parseFloat(m[2]) };
      return { label: p, w: null };
    });
    // distribute: fixed widths first, then split the remainder among unsized columns (at least the last)
    const fixed = cols.reduce((s, c) => s + (c.w || 0), 0);
    const free = cols.filter(c => c.w == null);
    const rem = Math.max(0, totalW - fixed);
    free.forEach(c => c.w = free.length ? rem / free.length : 0);
    let x = 0;
    cols.forEach(c => { c.x = x; x += c.w; });
    if (cols.length) cols[cols.length - 1].w = Math.max(0, totalW - cols[cols.length - 1].x);
    return cols;
  }

  // ---------- geometry ----------
  function axisEnd(el) {
    switch (el.orient) {
      case 'h':  return { x: el.x + el.len, y: el.y };
      case 'hl': return { x: el.x - el.len, y: el.y };
      case 'vu': return { x: el.x, y: el.y - el.len };
      default:   return { x: el.x, y: el.y + el.len };
    }
  }
  function bounds(el) {
    const kind = kindOf(el);
    if (kind === 'rect') return { x: el.x, y: el.y, w: el.w, h: el.h };
    if (kind === 'axis') {
      const e = axisEnd(el);
      const x0 = Math.min(el.x, e.x), y0 = Math.min(el.y, e.y);
      return { x: x0, y: y0, w: Math.abs(e.x - el.x), h: Math.abs(e.y - el.y) };
    }
    if (kind === 'line') {
      const pts = el.points || [];
      if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pts.forEach(p => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    if (kind === 'group') return unionBounds((el.children || []).map(bounds));
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  function unionBounds(list) {
    if (!list.length) return { x: 0, y: 0, w: 0, h: 0 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    list.forEach(b => { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // bounds including rotation (for hit-testing / selection box)
  function visualBounds(el) {
    const b = bounds(el);
    const rot = el.rotation || 0;
    if (!rot || kindOf(el) !== 'rect') return b;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = rot * Math.PI / 180;
    const pts = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([px, py]) => {
      const dx = px - cx, dy = py - cy;
      return { x: cx + dx * Math.cos(r) - dy * Math.sin(r), y: cy + dx * Math.sin(r) + dy * Math.cos(r) };
    });
    return bounds({ type: 'line', points: pts });
  }

  function move(el, dx, dy) {
    const kind = kindOf(el);
    if (kind === 'rect' || kind === 'axis') { el.x += dx; el.y += dy; }
    else if (kind === 'line') (el.points || []).forEach(p => { p.x += dx; p.y += dy; });
    else if (kind === 'group') (el.children || []).forEach(c => move(c, dx, dy));
  }
  // Fit the element into a new bounding box (scales lines and groups proportionally).
  function setBounds(el, nb) {
    const kind = kindOf(el);
    const ob = bounds(el);
    if (kind === 'rect') { el.x = nb.x; el.y = nb.y; el.w = Math.max(0, nb.w); el.h = Math.max(0, nb.h); return; }
    if (kind === 'axis') {
      const vertical = el.orient === 'v' || el.orient === 'vu';
      el.len = Math.max(1, vertical ? nb.h : nb.w);
      el.x = (el.orient === 'hl') ? nb.x + nb.w : nb.x;
      el.y = (el.orient === 'vu') ? nb.y + nb.h : nb.y;
      return;
    }
    const sx = ob.w ? nb.w / ob.w : 1, sy = ob.h ? nb.h / ob.h : 1;
    const map = (px, py) => ({ x: nb.x + (px - ob.x) * sx, y: nb.y + (py - ob.y) * sy });
    if (kind === 'line') { el.points = el.points.map(p => map(p.x, p.y)); return; }
    if (kind === 'group') {
      (el.children || []).forEach(c => {
        const cb = bounds(c);
        const p0 = map(cb.x, cb.y), p1 = map(cb.x + cb.w, cb.y + cb.h);
        setBounds(c, { x: p0.x, y: p0.y, w: p1.x - p0.x, h: p1.y - p0.y });
      });
    }
  }

  // ---------- rich text: x_{sub} x^{sup} _c ^c ----------
  function parseRich(text) {
    const runs = [];
    let i = 0, cur = { t: '', s: 0 };
    const push = () => { if (cur.t) runs.push(cur); cur = { t: '', s: 0 }; };
    while (i < text.length) {
      const ch = text[i];
      if ((ch === '_' || ch === '^') && i + 1 < text.length) {
        const s = ch === '_' ? -1 : 1;
        if (text[i + 1] === '{') {
          const j = text.indexOf('}', i + 2);
          if (j > 0) { push(); runs.push({ t: text.slice(i + 2, j), s }); i = j + 1; continue; }
        } else if (/\S/.test(text[i + 1]) && text[i + 1] !== '_' && text[i + 1] !== '^') {
          push(); runs.push({ t: text[i + 1], s }); i += 2; continue;
        }
      }
      if (ch === '\\' && (text[i + 1] === '_' || text[i + 1] === '^')) { cur.t += text[i + 1]; i += 2; continue; }
      cur.t += ch; i++;
    }
    push();
    return runs;
  }
  const plainText = (text) => parseRich(String(text || '')).map(r => r.t).join('');

  // ---------- document ----------
  function newDoc(name = 'Untitled', pattern = '') {
    return { version: 1, name, pattern, page: Object.assign({}, VDL_DEFAULT_PAGE), elements: [] };
  }
  function newProject(name = 'Untitled project') {
    return { app: 'VDL Studio', version: 1, name, diagrams: [newDoc('Diagram 1')], current: 0 };
  }
  // Accept either a project or a single diagram and normalise it.
  function normalise(obj) {
    if (obj && Array.isArray(obj.diagrams)) {
      obj.diagrams.forEach(normaliseDoc);
      obj.current = Math.min(Math.max(0, obj.current | 0), obj.diagrams.length - 1);
      if (!obj.diagrams.length) obj.diagrams.push(newDoc('Diagram 1'));
      return obj;
    }
    if (obj && Array.isArray(obj.elements)) {
      normaliseDoc(obj);
      return { app: 'VDL Studio', version: 1, name: obj.name || 'Project', diagrams: [obj], current: 0 };
    }
    throw new Error('Not a VDL Studio file');
  }
  function normaliseDoc(doc) {
    doc.page = Object.assign({}, VDL_DEFAULT_PAGE, doc.page || {});
    doc.name = doc.name || 'Untitled';
    doc.pattern = doc.pattern || '';
    const seen = new Set();
    const walk = (list) => list.forEach(el => {
      const t = TYPES[el.type];
      if (t) for (const k in t.defaults) if (el[k] === undefined) el[k] = JSON.parse(JSON.stringify(t.defaults[k]));
      if (!el.id || seen.has(el.id)) el.id = nextId();
      seen.add(el.id);
      if (el.children) walk(el.children);
    });
    walk(doc.elements || (doc.elements = []));
    bumpIdCounter(doc.elements);
  }

  // find element (and its parent list) by id anywhere in the tree
  function find(list, id, parent = null) {
    for (const el of list) {
      if (el.id === id) return { el, parent: list, parentEl: parent };
      if (el.children) { const r = find(el.children, id, el); if (r) return r; }
    }
    return null;
  }

  return { TYPES, COMMON_RECT_SCHEMA, create, clone, kindOf, parseCols, bounds, visualBounds, unionBounds, move, setBounds,
           axisEnd, parseRich, plainText, newDoc, newProject, normalise, normaliseDoc, find, nextId };
})();
