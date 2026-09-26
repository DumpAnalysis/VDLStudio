// VDL Studio — Copyright © 2026 Dmitry Vostokov. Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE.md).
// VDL Studio — SVG / PNG export, file save & open helpers, minimal ZIP writer.

const VDLExport = (() => {
  const esc = VDLRender.esc, num = VDLRender.num;

  // Compute the export area: {x,y,w,h}
  function area(doc, opts) {
    if (opts.area === 'content') {
      const els = (doc.elements || []).filter(el => !el.hidden && !(el.type === 'image' && el.reference));
      if (els.length) {
        const b = VDL.unionBounds(els.map(VDLRender.extent));
        const m = +opts.margin || 0;
        return { x: b.x - m, y: b.y - m, w: b.w + 2 * m, h: b.h + 2 * m };
      }
    }
    return { x: 0, y: 0, w: doc.page.width, h: doc.page.height };
  }

  // Standalone SVG document string.
  function docToSVG(doc, opts = {}) {
    opts = Object.assign({ area: 'page', margin: 10, background: 'white', scale: 1 }, opts);
    const a = area(doc, opts);
    const { body, defs } = VDLRender.render(doc, { forExport: true, showRefs: false, hitAreas: false });
    const W = Math.max(1, Math.round(a.w * opts.scale)), H = Math.max(1, Math.round(a.h * opts.scale));
    let bg = '';
    if (opts.background === 'white') bg = `<rect x="${num(a.x)}" y="${num(a.y)}" width="${num(a.w)}" height="${num(a.h)}" fill="#FFFFFF"/>`;
    else if (opts.background === 'page') bg = `<rect x="${num(a.x)}" y="${num(a.y)}" width="${num(a.w)}" height="${num(a.h)}" fill="${esc(doc.page.background || '#FFFFFF')}"/>`;
    const title = doc.name ? `<title>${esc(doc.name)}</title>` : '';
    const desc = doc.pattern ? `<desc>Dia|gram — ${esc(doc.pattern)} — made with VDL Studio</desc>` : `<desc>Dia|gram — made with VDL Studio</desc>`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${num(a.x)} ${num(a.y)} ${num(a.w)} ${num(a.h)}" font-family="${esc(VDL_FONT)}">${title}${desc}<defs>${defs}</defs>${bg}<g>${body}</g></svg>`;
  }

  // Rasterise an SVG string to a PNG Blob at the given pixel size.
  function svgToPNG(svgText, width, height) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = width; c.height = height;
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          c.toBlob(b => b ? resolve(b) : reject(new Error('PNG encoding failed')), 'image/png');
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The browser could not render the SVG (an embedded image may be unreachable).')); };
      img.src = url;
    });
  }
  async function docToPNG(doc, opts = {}) {
    const scale = +opts.scale || 2;
    const a = area(doc, Object.assign({ area: 'page', margin: 10 }, opts));
    const svg = docToSVG(doc, Object.assign({}, opts, { scale }));
    return svgToPNG(svg, Math.max(1, Math.round(a.w * scale)), Math.max(1, Math.round(a.h * scale)));
  }

  // ---------- saving ----------
  const hasFS = typeof window.showSaveFilePicker === 'function';
  function safeName(s) { return String(s || 'diagram').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'diagram'; }

  // Save a Blob. Uses the File System Access API when available (lets the user pick the folder
  // and remembers the handle for quick re-saves), otherwise falls back to a download.
  async function saveBlob(blob, suggestedName, kind, existingHandle) {
    const types = {
      svg: [{ description: 'SVG image', accept: { 'image/svg+xml': ['.svg'] } }],
      png: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }],
      json: [{ description: 'VDL Studio file', accept: { 'application/json': ['.json'] } }],
      zip: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }],
    }[kind] || undefined;
    if (hasFS) {
      try {
        const handle = existingHandle || await window.showSaveFilePicker({ suggestedName, types });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
        return { handle, name: handle.name };
      } catch (e) {
        if (e && e.name === 'AbortError') return null;
        // fall through to download on any other failure (e.g. picker blocked)
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = suggestedName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { handle: null, name: suggestedName };
  }

  // ---------- minimal ZIP (store, no compression) ----------
  const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function dosDateTime(d = new Date()) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }
  // files: [{name, data: Uint8Array}]
  function zip(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    const { time, date } = dosDateTime();
    files.forEach(f => {
      const nameB = enc.encode(f.name);
      const data = f.data;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nameB, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nameB.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameB);
      offset += 30 + nameB.length + data.length;
    });
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  // ---------- opening ----------
  function readFileText(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(file); });
  }
  function readFileDataURL(file) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  }
  function imageSize(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => rej(new Error('image failed to load')); im.src = src; });
  }

  return { docToSVG, docToPNG, svgToPNG, saveBlob, hasFS, safeName, zip, readFileText, readFileDataURL, imageSize, area };
})();
