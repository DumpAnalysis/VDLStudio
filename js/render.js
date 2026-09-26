// VDL Studio — Copyright © 2026 Dmitry Vostokov. Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE.md).
// VDL Studio — SVG renderer shared by the editor canvas and the SVG/PNG exporters.
// Everything is rendered with presentation attributes (no CSS classes) so that the exported
// SVG is fully self-contained.

const VDLRender = (() => {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = (v) => (Math.round(v * 1000) / 1000).toString();
  const fontFamily = (el) => esc(el.family && el.family.trim() ? el.family + ', ' + VDL_FONT : VDL_FONT);

  // Render context: collects <defs> (patterns, gradients) and knows all traces for column-line inheritance.
  class Ctx {
    constructor(doc, opts) {
      this.doc = doc;
      this.opts = Object.assign({ forExport: false, showRefs: true, hitAreas: false }, opts || {});
      this.defs = new Map();
      this.traces = [];
      const walk = (list) => list.forEach(el => {
        if (el.hidden) return;
        if (el.type === 'trace') this.traces.push(el);
        if (el.children) walk(el.children);
      });
      walk(doc.elements || []);
    }
    rowsPattern(style, pitch, opacity) {
      pitch = Math.max(0.5, +pitch || 4);
      const id = 'rows_' + style + '_' + num(pitch).replace('.', 'p') + '_' + Math.round((opacity ?? 0.45) * 100);
      if (!this.defs.has(id)) {
        let body;
        if (style === 'text') {
          const lens = [30, 46, 20, 38, 12, 50, 26, 42];
          const sw = Math.max(0.6, pitch * 0.45);
          body = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="64" height="${num(pitch * 8)}">` +
            lens.map((L, i) => `<line x1="${num(2 + (i % 3))}" y1="${num((i + 0.55) * pitch)}" x2="${num(2 + (i % 3) + L)}" y2="${num((i + 0.55) * pitch)}" stroke="#000000" stroke-opacity="${num(opacity ?? 0.45)}" stroke-width="${num(sw)}" stroke-dasharray="1.5 1"/>`).join('') +
            `</pattern>`;
        } else {
          const color = style === 'dark' ? '#000000' : '#FFFFFF';
          body = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="${num(pitch)}">` +
            `<line x1="0" y1="${num(pitch - 0.5)}" x2="8" y2="${num(pitch - 0.5)}" stroke="${color}" stroke-opacity="${num(opacity ?? 0.45)}" stroke-width="1"/></pattern>`;
        }
        this.defs.set(id, body);
      }
      return id;
    }
    gradient(c1, c2, dir) {
      const id = 'grad_' + c1.replace('#', '') + '_' + c2.replace('#', '') + '_' + dir;
      if (!this.defs.has(id)) {
        const coords = dir === 'h' ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';
        this.defs.set(id, `<linearGradient id="${id}" ${coords}><stop offset="0" stop-color="${esc(c1)}"/><stop offset="1" stop-color="${esc(c2)}"/></linearGradient>`);
      }
      return id;
    }
    // trace that visually encloses the given rect (used by bands to inherit column lines / row style)
    enclosingTrace(el) {
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      let best = null;
      for (const t of this.traces) {
        if (t === el) continue;
        if (cx >= t.x && cx <= t.x + t.w && cy >= t.y && cy <= t.y + t.h) best = t;
      }
      return best;
    }
  }

  // ---------- text ----------
  function richTspans(text, fontSize) {
    return VDL.parseRich(text).map(r => {
      if (r.s === 0) return esc(r.t);
      const shift = r.s < 0 ? 'sub' : 'super';
      return `<tspan baseline-shift="${shift}" font-size="${num(fontSize * 0.68)}">${esc(r.t)}</tspan>`;
    }).join('');
  }
  // Multi-line text block inside a box. Returns SVG string.
  function textBlock(el, box, o = {}) {
    const text = String(o.text ?? el.text ?? '');
    if (!text.trim()) return '';
    const fs = +(o.fontSize ?? el.fontSize) || 9;
    const lh = fs * (+(o.lineHeight ?? el.lineHeight) || 1.2);
    const lines = text.split('\n');
    const pad = +(o.pad ?? el.pad ?? 0);
    const align = o.align ?? el.align ?? 'center', valign = o.valign ?? el.valign ?? 'middle';
    let ax, anchor;
    if (align === 'left') { ax = box.x + pad; anchor = 'start'; }
    else if (align === 'right') { ax = box.x + box.w - pad; anchor = 'end'; }
    else { ax = box.x + box.w / 2; anchor = 'middle'; }
    const blockH = lines.length * lh;
    let top;
    if (valign === 'top') top = box.y + pad;
    else if (valign === 'bottom') top = box.y + box.h - pad - blockH;
    else top = box.y + (box.h - blockH) / 2;
    const first = top + (lh - fs) / 2 + fs * 0.8;
    const color = o.color ?? el.textColor ?? '#000000';
    const weight = (o.bold ?? el.bold) ? ' font-weight="bold"' : '';
    const style = (o.italic ?? el.italic) ? ' font-style="italic"' : '';
    const rot = +(o.rotate ?? el.textRotate ?? 0);
    const tr = rot ? ` transform="rotate(${num(rot)} ${num(box.x + box.w / 2)} ${num(box.y + box.h / 2)})"` : '';
    const ts = lines.map((ln, i) => `<tspan x="${num(ax)}" y="${num(first + i * lh)}">${richTspans(ln, fs) || ' '}</tspan>`).join('');
    return `<text font-family="${fontFamily(el)}" font-size="${num(fs)}" fill="${esc(color)}" text-anchor="${anchor}"${weight}${style}${tr} xml:space="preserve">${ts}</text>`;
  }

  // ---------- caps (arrowheads) ----------
  // Draw a cap at point p pointing in direction (dx,dy) (unit vector pointing outward, i.e. away from the line).
  function capSVG(kind, p, dx, dy, size, color, width) {
    if (!kind || kind === 'none') return '';
    const nx = -dy, ny = dx; // normal
    const P = (x, y) => `${num(x)},${num(y)}`;
    switch (kind) {
      case 'arrow': {
        const L = size, W = size * 0.45;
        return `<polygon points="${P(p.x, p.y)} ${P(p.x - dx * L + nx * W, p.y - dy * L + ny * W)} ${P(p.x - dx * L - nx * W, p.y - dy * L - ny * W)}" fill="${esc(color)}"/>`;
      }
      case 'open': {
        const L = size, W = size * 0.5;
        return `<polyline points="${P(p.x - dx * L + nx * W, p.y - dy * L + ny * W)} ${P(p.x, p.y)} ${P(p.x - dx * L - nx * W, p.y - dy * L - ny * W)}" fill="none" stroke="${esc(color)}" stroke-width="${num(width)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      case 'dot': return `<circle cx="${num(p.x)}" cy="${num(p.y)}" r="${num(size * 0.5)}" fill="${esc(color)}"/>`;
      case 'bar': {
        const W = size * 0.6;
        return `<line x1="${num(p.x + nx * W)}" y1="${num(p.y + ny * W)}" x2="${num(p.x - nx * W)}" y2="${num(p.y - ny * W)}" stroke="${esc(color)}" stroke-width="${num(Math.max(1, width))}"/>`;
      }
      case 'diamond': {
        const L = size * 0.6, W = size * 0.4;
        return `<polygon points="${P(p.x, p.y)} ${P(p.x - dx * L + nx * W, p.y - dy * L + ny * W)} ${P(p.x - dx * 2 * L, p.y - dy * 2 * L)} ${P(p.x - dx * L - nx * W, p.y - dy * L - ny * W)}" fill="${esc(color)}"/>`;
      }
      case 'square': {
        const s = size * 0.4;
        return `<rect x="${num(p.x - s)}" y="${num(p.y - s)}" width="${num(2 * s)}" height="${num(2 * s)}" fill="${esc(color)}"/>`;
      }
    }
    return '';
  }
  // how far the visible line must be trimmed so it does not poke through a filled cap
  const capTrim = (kind, size) => kind === 'arrow' ? size * 0.85 : kind === 'diamond' ? size * 1.15 : kind === 'dot' ? size * 0.3 : kind === 'square' ? size * 0.35 : 0;

  // ---------- polyline routing ----------
  function routedPoints(el) {
    const pts = (el.points || []).map(p => ({ x: p.x, y: p.y }));
    if (el.route !== 'ortho' || pts.length < 2) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = out[out.length - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      let hFirst = el.orthoFirst === 'h' ? true : el.orthoFirst === 'v' ? false : Math.abs(dx) >= Math.abs(dy);
      if (pts.length === 2) {
        const t = el.bend ?? 0.5;
        if (hFirst) { out.push({ x: a.x + dx * t, y: a.y }, { x: a.x + dx * t, y: b.y }); }
        else { out.push({ x: a.x, y: a.y + dy * t }, { x: b.x, y: a.y + dy * t }); }
      } else {
        if (hFirst) out.push({ x: b.x, y: a.y }); else out.push({ x: a.x, y: b.y });
      }
      out.push(b);
    }
    // drop duplicate consecutive points
    return out.filter((p, i) => i === 0 || Math.abs(p.x - out[i - 1].x) > 1e-6 || Math.abs(p.y - out[i - 1].y) > 1e-6);
  }
  function unit(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return { x: dx / L, y: dy / L };
  }
  // Catmull-Rom → cubic Bézier path data through pts
  function curvePath(pts, closed, tension) {
    if (pts.length < 2) return '';
    const t = (1 - (tension ?? 0.5)) * 0.5 + 0.1; // 0.1..0.6
    const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M ${num(pts[0].x)} ${num(pts[0].y)}`;
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const p0 = P[i], p1 = P[i + 1], p2 = P[i + 2], p3 = P[i + 3];
      const c1 = { x: p1.x + (p2.x - p0.x) * t, y: p1.y + (p2.y - p0.y) * t };
      const c2 = { x: p2.x - (p3.x - p1.x) * t, y: p2.y - (p3.y - p1.y) * t };
      d += ` C ${num(c1.x)} ${num(c1.y)} ${num(c2.x)} ${num(c2.y)} ${num(p2.x)} ${num(p2.y)}`;
    }
    if (closed) d += ' Z';
    return d;
  }
  function pointAlong(pts, frac) {
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(L); total += L; }
    if (!total) return { p: pts[0], dir: { x: 1, y: 0 } };
    let target = frac * total;
    for (let i = 0; i < segs.length; i++) {
      if (target <= segs[i] || i === segs.length - 1) {
        const a = pts[i], b = pts[i + 1], u = unit(a, b), f = segs[i] ? target / segs[i] : 0;
        return { p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, dir: u };
      }
      target -= segs[i];
    }
    return { p: pts[pts.length - 1], dir: { x: 1, y: 0 } };
  }

  // Render a line-like thing (used by 'line' and 'axis'). spec: {points, route, closed, fill, stroke, width, dash, startCap, endCap, capSize, tension}
  function lineSVG(spec, ctx) {
    let pts = routedPoints(spec);
    if (pts.length < 2) return '';
    const color = spec.stroke || '#000000', width = +spec.width || 1, size = +spec.capSize || 6;
    let caps = '';
    if (!spec.closed) {
      const a0 = pts[0], a1 = pts[1], b0 = pts[pts.length - 1], b1 = pts[pts.length - 2];
      const u0 = unit(a1, a0), u1 = unit(b1, b0); // outward directions
      caps += capSVG(spec.startCap, a0, u0.x, u0.y, size, color, width);
      caps += capSVG(spec.endCap, b0, u1.x, u1.y, size, color, width);
      // trim the drawn line under filled caps
      const t0 = capTrim(spec.startCap, size), t1 = capTrim(spec.endCap, size);
      if (spec.route !== 'curve') {
        pts = pts.map(p => ({ x: p.x, y: p.y }));
        if (t0) { pts[0].x -= u0.x * t0; pts[0].y -= u0.y * t0; }
        if (t1) { pts[pts.length - 1].x -= u1.x * t1; pts[pts.length - 1].y -= u1.y * t1; }
      }
    }
    let d;
    if (spec.route === 'curve') d = curvePath(pts, spec.closed, spec.tension);
    else d = 'M ' + pts.map(p => `${num(p.x)} ${num(p.y)}`).join(' L ') + (spec.closed ? ' Z' : '');
    const fill = spec.closed && spec.fill ? esc(spec.fill) : 'none';
    const dash = spec.dash ? ` stroke-dasharray="${esc(spec.dash)}"` : '';
    let s = `<path d="${d}" fill="${fill}" stroke="${esc(color)}" stroke-width="${num(width)}"${dash} stroke-linejoin="round" stroke-linecap="butt"/>` + caps;
    if (ctx.opts.hitAreas) s += `<path d="${d}" fill="${spec.closed ? 'transparent' : 'none'}" stroke="transparent" stroke-width="${num(Math.max(10, width))}" pointer-events="${spec.closed ? 'all' : 'stroke'}" data-hit="1"/>`;
    return s;
  }

  // ---------- shapes ----------
  function shapePath(el) {
    const { w, h } = el, x = el.x, y = el.y;
    const P = (px, py) => `${num(x + px)},${num(y + py)}`;
    switch (el.shape) {
      case 'note': { const d = Math.min(w, h) * 0.25; return { poly: `${P(0, 0)} ${P(w - d, 0)} ${P(w, d)} ${P(w, h)} ${P(0, h)}`, extra: `<polyline points="${P(w - d, 0)} ${P(w - d, d)} ${P(w, d)}" fill="none" stroke="${esc(el.stroke || shade(el.fill))}" stroke-width="${num(el.strokeWidth || 1)}"/>` }; }
      case 'tag': { const d = Math.min(h * 0.5, w * 0.2); return { poly: `${P(0, 0)} ${P(w - d, 0)} ${P(w, d)} ${P(w, h)} ${P(0, h)}` }; }
      case 'diamond': return { poly: `${P(w / 2, 0)} ${P(w, h / 2)} ${P(w / 2, h)} ${P(0, h / 2)}` };
      case 'triangle': return { poly: `${P(w / 2, 0)} ${P(w, h)} ${P(0, h)}` };
      case 'hexagon': { const d = Math.min(w * 0.25, h / 2); return { poly: `${P(d, 0)} ${P(w - d, 0)} ${P(w, h / 2)} ${P(w - d, h)} ${P(d, h)} ${P(0, h / 2)}` }; }
      case 'parallelogram': { const d = Math.min(w * 0.25, h); return { poly: `${P(d, 0)} ${P(w, 0)} ${P(w - d, h)} ${P(0, h)}` }; }
      case 'callout': { const d = Math.min(w * 0.18, h); return { poly: `${P(d, 0)} ${P(w, 0)} ${P(w, h)} ${P(d, h)} ${P(d, h * 0.62)} ${P(0, h * 0.5)} ${P(d, h * 0.38)}`, textBox: { x: x + d, y, w: w - d, h } }; }
    }
    return null;
  }
  function shade(hex) { // darker variant of a colour for note folds
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#000000';
    const v = parseInt(m[1], 16);
    const f = (c) => Math.max(0, Math.round(((v >> c) & 255) * 0.6)).toString(16).padStart(2, '0');
    return '#' + f(16) + f(8) + f(0);
  }
  function fillAttr(el, ctx) {
    if (!el.fill) return 'none';
    if (el.fill2) return `url(#${ctx.gradient(el.fill, el.fill2, el.gradDir || 'v')})`;
    return esc(el.fill);
  }
  function strokeAttrs(el) {
    if (!el.stroke || !(+el.strokeWidth)) return '';
    return ` stroke="${esc(el.stroke)}" stroke-width="${num(el.strokeWidth)}"${el.dash ? ` stroke-dasharray="${esc(el.dash)}"` : ''}`;
  }
  function rowsOverlay(el, style, pitch, opacity, ctx, box) {
    if (!style || style === 'none') return '';
    const id = ctx.rowsPattern(style, pitch, opacity);
    box = box || el;
    return `<rect x="${num(box.x)}" y="${num(box.y)}" width="${num(box.w)}" height="${num(box.h)}" fill="url(#${id})"/>`;
  }
  function colLinesSVG(trace, yTop, yBottom, xMin, xMax, ctx) {
    if (!trace.colLines) return '';
    const cols = VDL.parseCols(trace.cols, trace.w);
    let s = '';
    for (let i = 1; i < cols.length; i++) {
      const x = trace.x + cols[i].x;
      if (x <= xMin + 0.01 || x >= xMax - 0.01) continue;
      s += `<line x1="${num(x)}" y1="${num(yTop)}" x2="${num(x)}" y2="${num(yBottom)}" stroke="${esc(trace.colLineColor || '#000')}" stroke-width="${num(trace.colLineWidth || 1)}"/>`;
    }
    return s;
  }

  // ---------- element renderers ----------
  function rotAttr(el) {
    const r = +el.rotation || 0;
    if (!r) return '';
    return ` transform="rotate(${num(r)} ${num(el.x + el.w / 2)} ${num(el.y + el.h / 2)})"`;
  }
  const R = {};

  R.trace = (el, ctx) => {
    let s = `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="${fillAttr(el, ctx)}"/>`;
    s += rowsOverlay(el, el.rows, el.pitch, el.rowOpacity, ctx);
    s += colLinesSVG(el, el.y, el.y + el.h, el.x, el.x + el.w, ctx);
    if (el.header) {
      const cols = VDL.parseCols(el.cols, el.w);
      const fs = +el.headerSize || 5.5;
      const weight = el.headerBold ? ' font-weight="bold"' : '';
      s += `<text font-family="${fontFamily(el)}" font-size="${num(fs)}" fill="${esc(el.headerColor || '#000')}"${weight}>` +
        cols.map(c => {
          const lbl = c.label;
          if (!lbl) return '';
          const centered = lbl.length <= 1;
          const x = centered ? el.x + c.x + c.w / 2 : el.x + c.x + 1;
          return `<tspan x="${num(x)}" y="${num(el.y - 2)}" text-anchor="${centered ? 'middle' : 'start'}">${richTspans(lbl, fs)}</tspan>`;
        }).join('') + `</text>`;
    }
    if (el.stroke && +el.strokeWidth) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="none"${strokeAttrs(el)}/>`;
    s += textBlock(el, el);
    return s;
  };

  R.band = (el, ctx) => {
    const t = ctx.enclosingTrace(el);
    let s = `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="${fillAttr(el, ctx)}"/>`;
    let rows = el.rows, pitch = el.pitch, ro = el.rowOpacity;
    if (rows === 'inherit') { rows = t ? t.rows : 'light'; pitch = t ? t.pitch : el.pitch; ro = t ? t.rowOpacity : el.rowOpacity; }
    s += rowsOverlay(el, rows, pitch, ro, ctx);
    if (el.colLines !== 'none' && t) s += colLinesSVG(t, el.y, el.y + el.h, el.x, el.x + el.w, ctx);
    if (el.stroke && +el.strokeWidth) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="none"${strokeAttrs(el)}/>`;
    s += textBlock(el, el);
    return s;
  };

  R.rect = (el, ctx) => {
    let s = '';
    const fill = fillAttr(el, ctx);
    if (el.shape === 'cross') {
      const w = +el.strokeWidth > 1 ? +el.strokeWidth : Math.max(2, Math.min(el.w, el.h) * 0.12);
      s += `<path d="M ${num(el.x)} ${num(el.y)} L ${num(el.x + el.w)} ${num(el.y + el.h)} M ${num(el.x + el.w)} ${num(el.y)} L ${num(el.x)} ${num(el.y + el.h)}" fill="none" stroke="${esc(el.fill || el.stroke || '#FF0000')}" stroke-width="${num(w)}" stroke-linecap="round"/>`;
      if (ctx.opts.hitAreas) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="transparent" data-hit="1"/>`;
    } else if (el.shape === 'bracket') {
      const w = +el.strokeWidth || 1.5;
      s += `<path d="M ${num(el.x + el.w)} ${num(el.y)} L ${num(el.x)} ${num(el.y)} L ${num(el.x)} ${num(el.y + el.h)} L ${num(el.x + el.w)} ${num(el.y + el.h)}" fill="none" stroke="${esc(el.stroke || el.fill || '#000')}" stroke-width="${num(w)}"${el.dash ? ` stroke-dasharray="${esc(el.dash)}"` : ''}/>`;
      if (ctx.opts.hitAreas) s += `<rect x="${num(el.x - 4)}" y="${num(el.y)}" width="${num(el.w + 8)}" height="${num(el.h)}" fill="transparent" data-hit="1"/>`;
    } else {
      const sp = shapePath(el);
      if (sp) {
        s += `<polygon points="${sp.poly}" fill="${fill}"${strokeAttrs(el)} stroke-linejoin="round"/>` + (sp.extra || '');
        if (el.rows && el.rows !== 'none') s += `<clipPath id="clip_${el.id}"><polygon points="${sp.poly}"/></clipPath><g clip-path="url(#clip_${el.id})">${rowsOverlay(el, el.rows, el.pitch, el.rowOpacity, ctx)}</g>`;
      } else {
        const rx = el.shape === 'rounded' ? (+el.rx || Math.min(el.w, el.h) * 0.25) : (+el.rx || 0);
        s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" rx="${num(rx)}" fill="${fill}"${strokeAttrs(el)}/>`;
        s += rowsOverlay(el, el.rows, el.pitch, el.rowOpacity, ctx);
      }
      if (fill === 'none' && ctx.opts.hitAreas) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="transparent" data-hit="1"/>`;
      s += textBlock(el, (sp && sp.textBox) || el);
    }
    return s;
  };

  R.ellipse = (el, ctx) => {
    let s = `<ellipse cx="${num(el.x + el.w / 2)}" cy="${num(el.y + el.h / 2)}" rx="${num(el.w / 2)}" ry="${num(el.h / 2)}" fill="${fillAttr(el, ctx)}"${strokeAttrs(el)}/>`;
    if (!el.fill && ctx.opts.hitAreas) s += `<ellipse cx="${num(el.x + el.w / 2)}" cy="${num(el.y + el.h / 2)}" rx="${num(el.w / 2)}" ry="${num(el.h / 2)}" fill="transparent" data-hit="1"/>`;
    s += textBlock(el, el);
    return s;
  };

  R.text = (el, ctx) => {
    let s = '';
    if (el.bg || (el.stroke && +el.strokeWidth)) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="${el.bg ? esc(el.bg) : 'none'}"${strokeAttrs(el)}/>`;
    if (ctx.opts.hitAreas) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="transparent" data-hit="1"/>`;
    s += textBlock(el, el, { pad: el.pad, rotate: 0 });
    return s;
  };

  R.line = (el, ctx) => {
    let s = lineSVG(el, ctx);
    if (el.label) {
      const pts = routedPoints(el);
      if (pts.length >= 2) {
        const { p, dir } = pointAlong(pts, +el.labelPos || 0.5);
        const off = el.labelOffset ?? -4;
        const nx = -dir.y, ny = dir.x;
        const fs = +el.labelSize || 8;
        s += `<text x="${num(p.x + nx * off)}" y="${num(p.y + ny * off + fs * 0.35)}" font-family="${fontFamily(el)}" font-size="${num(fs)}" fill="${esc(el.labelColor || '#000')}" text-anchor="middle" font-weight="bold">${richTspans(el.label, fs)}</text>`;
      }
    }
    return s;
  };

  R.axis = (el, ctx) => {
    const end = VDL.axisEnd(el);
    const spec = { points: [{ x: el.x, y: el.y }, end], route: 'straight', stroke: el.stroke, width: el.width, dash: el.dash,
                   startCap: el.startCap, endCap: el.endCap, capSize: el.capSize };
    let s = lineSVG(spec, ctx);
    if (el.label && el.labelPos !== 'none') {
      const fs = +el.fontSize || 9, gap = +el.labelGap || 0, cap = +el.capSize || 6;
      const atStart = el.labelPos !== 'end';
      const p = atStart ? { x: el.x, y: el.y } : end;
      const weight = el.bold ? ' font-weight="bold"' : '';
      let x, y, anchor = el.labelAlign || 'middle';
      const vertical = el.orient === 'v' || el.orient === 'vu';
      if (vertical) {
        const above = (el.orient === 'v') === atStart; // label sits above the point
        x = p.x; y = above ? p.y - cap - gap : p.y + cap + gap + fs * 0.8;
      } else {
        const leftSide = (el.orient === 'h') === atStart;
        y = p.y + fs * 0.35;
        x = leftSide ? p.x - cap - gap : p.x + cap + gap;
        if (el.labelAlign === 'middle') anchor = leftSide ? 'end' : 'start';
      }
      const lines = String(el.label).split('\n');
      const lh = fs * 1.15;
      // for a label above the axis start, the last line sits on the computed baseline and earlier lines stack upward
      const above = vertical && ((el.orient === 'v') === atStart);
      const y0 = above ? y - (lines.length - 1) * lh : (vertical ? y : y - (lines.length - 1) * lh / 2);
      const ts = lines.map((ln, i) => `<tspan x="${num(x)}" y="${num(y0 + i * lh)}">${richTspans(ln, fs)}</tspan>`).join('');
      s += `<text font-family="${fontFamily(el)}" font-size="${num(fs)}" fill="${esc(el.stroke || '#000')}" text-anchor="${anchor}"${weight}>${ts}</text>`;
    }
    return s;
  };

  function parseLegend(items) {
    return String(items || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const m = /^(#?[0-9a-fA-F]{6}|#?[0-9a-fA-F]{3})\s*(.*)$/.exec(l);
      if (m) return { color: (m[1].startsWith('#') ? '' : '#') + m[1], label: m[2] };
      return { color: '#A6A6A6', label: l };
    });
  }
  function legendLayout(el) {
    const items = parseLegend(el.items);
    const pad = +el.pad || 0, gap = +el.gap || 0, sw = +el.swatchW || 10, sh = +el.swatchH || 6, fs = +el.fontSize || 7;
    const rowH = Math.max(sh, fs * 1.1);
    const out = [];
    let x = el.x + pad, y = el.y + pad;
    items.forEach((it, i) => {
      if (el.orient === 'h') {
        out.push({ it, x, y: y + (rowH - sh) / 2, tx: x + sw + 3, ty: y + rowH / 2 + fs * 0.35 });
        x += sw + 3 + it.label.length * fs * 0.55 + gap;
      } else {
        out.push({ it, x, y: y + (rowH - sh) / 2, tx: x + sw + 4, ty: y + rowH / 2 + fs * 0.35 });
        y += rowH + gap;
      }
    });
    const contentW = el.orient === 'h' ? x - el.x + pad - gap : Math.max(...out.map(o => o.tx + o.it.label.length * fs * 0.55), el.x) - el.x + pad;
    const contentH = el.orient === 'h' ? rowH + 2 * pad : y - el.y + pad - gap;
    return { rows: out, sw, sh, fs, contentW, contentH };
  }
  R.legend = (el, ctx) => {
    const L = legendLayout(el);
    let s = '';
    if (el.bg || (el.stroke && +el.strokeWidth)) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="${el.bg ? esc(el.bg) : 'none'}"${strokeAttrs(el)}/>`;
    if (ctx.opts.hitAreas) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="transparent" data-hit="1"/>`;
    const weight = el.bold ? ' font-weight="bold"' : '';
    L.rows.forEach(r => {
      s += `<rect x="${num(r.x)}" y="${num(r.y)}" width="${num(L.sw)}" height="${num(L.sh)}" fill="${esc(r.it.color)}"/>`;
      if (el.swatchRows && el.swatchRows !== 'none') s += rowsOverlay(el, el.swatchRows, Math.max(1, L.sh / 3), 0.45, ctx, { x: r.x, y: r.y, w: L.sw, h: L.sh });
      s += `<text x="${num(r.tx)}" y="${num(r.ty)}" font-family="${fontFamily(el)}" font-size="${num(L.fs)}" fill="${esc(el.textColor || '#000')}"${weight}>${richTspans(r.it.label, L.fs)}</text>`;
    });
    return s;
  };

  R.image = (el, ctx) => {
    if (el.reference && (ctx.opts.forExport || !ctx.opts.showRefs)) return '';
    if (!el.href) return `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="#f2f2f2" stroke="#999" stroke-dasharray="4 2"/>`;
    let s = `<image href="${esc(el.href)}" x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" preserveAspectRatio="none"/>`;
    if (el.stroke && +el.strokeWidth) s += `<rect x="${num(el.x)}" y="${num(el.y)}" width="${num(el.w)}" height="${num(el.h)}" fill="none"${strokeAttrs(el)}/>`;
    return s;
  };

  R.group = (el, ctx) => (el.children || []).map(c => element(c, ctx)).join('');

  function element(el, ctx) {
    if (el.hidden) return '';
    const fn = R[el.type];
    if (!fn) return '';
    const inner = fn(el, ctx);
    if (!inner) return '';
    const op = el.opacity != null && el.opacity < 1 ? ` opacity="${num(el.opacity)}"` : '';
    const tr = (el.type === 'rect' || el.type === 'ellipse' || el.type === 'text' || el.type === 'image') ? rotAttr(el) : '';
    return `<g data-id="${esc(el.id)}" data-type="${el.type}"${op}${tr}>${inner}</g>`;
  }

  function render(doc, opts) {
    const ctx = new Ctx(doc, opts);
    const body = (doc.elements || []).map(el => element(el, ctx)).join('');
    return { body, defs: Array.from(ctx.defs.values()).join(''), ctx };
  }

  // visual extent including caps, axis labels and trace headers (used for content-fit export)
  function extent(el) {
    const b = VDL.visualBounds(el);
    const out = { x: b.x, y: b.y, w: b.w, h: b.h };
    const grow = (l, t, r, bt) => { out.x -= l; out.y -= t; out.w += l + r; out.h += t + bt; };
    if (el.type === 'axis') {
      const lab = el.label && el.labelPos !== 'none' ? (+el.fontSize || 9) * 1.3 + (+el.labelGap || 0) : 0;
      const cap = +el.capSize || 6;
      const vertical = el.orient === 'v' || el.orient === 'vu';
      const atStart = el.labelPos !== 'end';
      if (vertical) {
        const labelTop = (el.orient === 'v') === atStart;
        grow(Math.max(cap, (el.label || '').length * (+el.fontSize || 9) * 0.35), labelTop ? cap + lab : cap, Math.max(cap, (el.label || '').length * (+el.fontSize || 9) * 0.35), labelTop ? cap : cap + lab);
      } else {
        const labelLeft = (el.orient === 'h') === atStart;
        const lw = (el.label || '').length * (+el.fontSize || 9) * 0.65 + (+el.labelGap || 0);
        grow(labelLeft ? cap + lw : cap, cap, labelLeft ? cap : cap + lw, cap);
      }
    } else if (el.type === 'trace' && el.header) grow(0, (+el.headerSize || 5.5) * 1.4, 0, 0);
    else if (el.type === 'line') {
      const c = (+el.capSize || 6) + (+el.width || 1); grow(c, c, c, c);
      if (el.label) { // include the label box
        const pts = routedPoints(el);
        if (pts.length >= 2) {
          const { p, dir } = pointAlong(pts, +el.labelPos || 0.5);
          const off = el.labelOffset ?? -4, fs = +el.labelSize || 8;
          const cx = p.x - dir.y * off, cy = p.y + dir.x * off;
          const lw = VDL.plainText(el.label).length * fs * 0.62, lh = fs * 1.3;
          const u = VDL.unionBounds([out, { x: cx - lw / 2, y: cy - lh / 2, w: lw, h: lh }]);
          out.x = u.x; out.y = u.y; out.w = u.w; out.h = u.h;
        }
      }
    }
    else if (el.type === 'group') {
      const kids = (el.children || []).filter(c => !c.hidden).map(extent);
      return kids.length ? VDL.unionBounds(kids) : out;
    }
    if (el.stroke && +el.strokeWidth) { const s = +el.strokeWidth / 2; grow(s, s, s, s); }
    return out;
  }

  return { render, element, esc, num, parseLegend, legendLayout, routedPoints, extent, Ctx };
})();
