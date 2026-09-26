// VDL Studio — Copyright © 2026 Dmitry Vostokov. Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE.md).
// VDL Studio — starter templates and the "book project" builder.

const VDLTemplates = (() => {
  const C = (type, props) => VDL.create(type, props);

  // A vertical Time axis + trace pair. Returns [axis, trace].
  function axisTrace(x, y, w = 150, h = 400, fill = '#A6A6A6', extra = {}) {
    const axis = C('axis', { x: x, y: y, len: h, orient: 'v', name: 'Time axis' });
    const trace = C('trace', Object.assign({ x: x + 12, y: y, w, h, fill, name: 'Trace' }, extra));
    return [axis, trace];
  }

  const TEMPLATES = {
    blank: { label: 'Blank', build: () => [] },
    trace: {
      label: 'Trace with Time axis',
      build: () => {
        const [axis, trace] = axisTrace(60, 80);
        return [axis, trace,
          C('band', { x: trace.x, y: 160, w: trace.w, h: 40, fill: '#00B050', name: 'Activity' }),
          C('band', { x: trace.x, y: 240, w: trace.w, h: 4, fill: '#FFFF00', name: 'Message' }),
          C('band', { x: trace.x, y: 320, w: trace.w, h: 8, fill: '#FF0000', name: 'Error' }),
        ];
      },
    },
    twoTraces: {
      label: 'Two traces',
      build: () => {
        const [a1, t1] = axisTrace(60, 80);
        const [a2, t2] = axisTrace(300, 80, 150, 400, '#BFBFBF');
        return [a1, t1, a2, t2,
          C('band', { x: t1.x, y: 200, w: t1.w, h: 8, fill: '#0070C0' }),
          C('band', { x: t2.x, y: 260, w: t2.w, h: 8, fill: '#0070C0' }),
          C('line', { points: [{ x: t1.x + t1.w, y: 204 }, { x: t2.x, y: 264 }], stroke: '#000000', width: 1, endCap: 'arrow', route: 'ortho', name: 'Link' }),
        ];
      },
    },
    traceLegend: {
      label: 'Trace + legend',
      build: () => {
        const [axis, trace] = axisTrace(60, 80, 150, 400, '#A6A6A6', { cols: 'Module', header: true });
        return [axis, trace,
          C('band', { x: trace.x, y: 100, w: trace.w, h: 28, fill: '#FFC000' }),
          C('band', { x: trace.x, y: 180, w: trace.w, h: 52, fill: '#00B0F0' }),
          C('band', { x: trace.x, y: 300, w: trace.w, h: 20, fill: '#00B050' }),
          C('legend', { x: 280, y: 90, w: 120, h: 70, items: '#FFC000 Initialization\n#00B0F0 Database Access\n#00B050 User Request\n#A6A6A6 Network', name: 'Legend' }),
        ];
      },
    },
    matrix: {
      label: 'Trace matrix (TID columns)',
      build: () => {
        const [axis, trace] = axisTrace(60, 80, 190, 400, '#A6A6A6', { cols: '#:8,TID:10,CPU:10,Message', pitch: 4 });
        const els = [axis, trace];
        [[100, 12], [140, 20], [220, 8], [300, 60]].forEach(([y, h], i) => {
          els.push(C('band', { x: trace.x, y, w: trace.w, h, fill: '#FFC000' }));
          els.push(C('band', { x: trace.x + 8, y, w: 10, h, fill: i % 2 ? '#0070C0' : '#00B050' }));
          els.push(C('band', { x: trace.x + 18, y, w: 10, h, fill: '#00B0F0' }));
        });
        return els;
      },
    },
    stack: {
      label: 'Stack trace',
      build: () => {
        const names = ['bar', 'foo', 'main'];
        const els = [C('axis', { x: 300, y: 100, len: 100, orient: 'vu', label: '', startCap: 'none', endCap: 'arrow', width: 1.5 })];
        names.forEach((n, i) => els.push(C('rect', { x: 200, y: 100 + i * 24, w: 90, h: 22, fill: '#00B050', text: n, textColor: '#FFFFFF', fontSize: 10, name: 'Frame ' + n })));
        return els;
      },
    },
    graph: {
      label: 'Causal graph',
      build: () => {
        const nodes = [[300, 100], [300, 160], [240, 220], [360, 220], [300, 280]];
        const els = [];
        const edges = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]];
        edges.forEach(([a, b]) => els.push(C('line', { points: [{ x: nodes[a][0], y: nodes[a][1] }, { x: nodes[b][0], y: nodes[b][1] }], stroke: '#000000', width: 1, endCap: 'none', name: 'Edge' })));
        nodes.forEach(([x, y], i) => els.push(C('ellipse', { x: x - 6, y: y - 6, w: 12, h: 12, fill: i === 2 ? '#FF0000' : '#000000', name: 'Node' })));
        return els;
      },
    },
    dialogue: {
      label: 'Dialogue (Src/Dst columns)',
      build: () => {
        const [axis, trace] = axisTrace(60, 80, 190, 400, '#A6A6A6', { cols: '#:8,Src:10,Dst:10,Time:12,Message' });
        const els = [axis, trace];
        [[120, '#FFC000', '#0070C0'], [160, '#0070C0', '#FFC000'], [240, '#FFC000', '#0070C0'], [260, '#0070C0', '#FFC000']].forEach(([y, a, b]) => {
          els.push(C('band', { x: trace.x + 8, y, w: 10, h: 6, fill: a }));
          els.push(C('band', { x: trace.x + 18, y, w: 10, h: 6, fill: b }));
        });
        return els;
      },
    },
    cotrace: {
      label: 'Horizontal trace (CoTrace)',
      build: () => {
        const axis = C('axis', { x: 100, y: 100, len: 140, orient: 'v', label: 'Analysis\nTime/Seq', fontSize: 9 });
        const trace = C('trace', { x: 112, y: 100, w: 380, h: 140, fill: '#00B0F0', cols: '', header: false, colLines: false, rows: 'none' });
        return [axis, trace,
          C('band', { x: 112, y: 130, w: 380, h: 12, fill: '#00B050', rows: 'none' }),
          C('band', { x: 112, y: 142, w: 380, h: 40, fill: '#FFFF00', rows: 'none' }),
          C('band', { x: 112, y: 210, w: 380, h: 30, fill: '#00B050', rows: 'none' }),
          C('band', { x: 330, y: 100, w: 40, h: 12, fill: '#FFC000', rows: 'none' }),
          C('band', { x: 420, y: 100, w: 40, h: 12, fill: '#FF0000', rows: 'none' }),
          C('band', { x: 280, y: 142, w: 80, h: 30, fill: '#FFC000', rows: 'none' }),
          C('text', { x: 160, y: 70, w: 300, h: 24, text: 'CoTrace/CoLog/CoData', fontSize: 20, bold: true }),
        ];
      },
    },
  };

  // Worked reconstructions of a few book figures, drawn over their references (page 960 × 720, refs fitted with a 20 px margin).
  const EXAMPLES = {
    'Activity Region': () => [
      C('text', { x: 64, y: 48, w: 360, h: 20, text: 'Statement current J_{m2} > max (J_{m1},J_{m3})', fontSize: 12, bold: false, name: 'Statement' }),
      C('axis', { x: 68, y: 108, len: 576, orient: 'v', label: 'Time', fontSize: 11, capSize: 7, width: 2, name: 'Time axis' }),
      C('trace', { x: 80, y: 108, w: 228, h: 576, fill: '#92D050', cols: '#:14,PID:18,TID:18,Time:22,Message', headerSize: 7, name: 'Trace' }),
      C('band', { x: 80, y: 108, w: 228, h: 128, fill: '#92D050', text: 'J_{m1}', fontSize: 13, align: 'right', pad: 56, name: 'J m1' }),
      C('band', { x: 80, y: 236, w: 228, h: 368, fill: '#ED7D31', text: 'J_{m2}', fontSize: 13, align: 'right', pad: 56, name: 'J m2' }),
      C('band', { x: 80, y: 604, w: 228, h: 80, fill: '#92D050', text: 'J_{m3}', fontSize: 13, align: 'right', pad: 56, name: 'J m3' }),
    ],
    'Blackout': () => [
      C('axis', { x: 40, y: 56, len: 624, orient: 'v', label: 'Time', fontSize: 11, capSize: 7, width: 2, name: 'Time axis' }),
      C('trace', { x: 60, y: 56, w: 272, h: 624, fill: '#4A90D9', cols: '#:14,PID:18,TID:18,Time:22,Message', headerSize: 7, name: 'Trace' }),
      C('band', { x: 60, y: 56, w: 272, h: 272, fill: '#4A90D9', text: '1 hour', textColor: '#1F1F1F', fontSize: 26, name: '1 hour' }),
      C('band', { x: 60, y: 328, w: 272, h: 352, fill: '#00B050', text: '2 hours', textColor: '#1F1F1F', fontSize: 26, name: '2 hours' }),
      C('line', { points: [{ x: 332, y: 304 }, { x: 396, y: 272 }], stroke: '#7F7F7F', width: 1, endCap: 'none', name: 'Callout line' }),
      C('line', { points: [{ x: 332, y: 352 }, { x: 396, y: 388 }], stroke: '#7F7F7F', width: 1, endCap: 'none', name: 'Callout line' }),
      C('rect', { x: 396, y: 272, w: 272, h: 116, fill: '#000000', text: '5 hours', textColor: '#FFFFFF', fontSize: 26, name: '5 hours' }),
    ],
    'Activity Packet': () => [
      C('axis', { x: 40, y: 68, len: 612, orient: 'v', label: 'Time', fontSize: 11, capSize: 7, width: 2, name: 'Time axis' }),
      C('trace', { x: 60, y: 68, w: 272, h: 612, fill: '#A6A6A6', cols: '', header: false, colLines: false, name: 'Trace' }),
      C('band', { x: 60, y: 168, w: 272, h: 40, fill: '#00E366', name: 'Packet 1' }),
      C('band', { x: 60, y: 208, w: 272, h: 52, fill: '#FFC000', name: 'Packet 2' }),
      C('band', { x: 60, y: 468, w: 272, h: 124, fill: '#0070C0', name: 'Packet 3' }),
      C('line', { points: [{ x: 352, y: 168 }, { x: 352, y: 208 }], startCap: 'arrow', endCap: 'arrow', capSize: 5, width: 1, label: 'T = xx:xx.001', labelSize: 8, labelPos: 0.5, labelOffset: -50, name: 'Δt 1' }),
      C('line', { points: [{ x: 352, y: 208 }, { x: 352, y: 260 }], startCap: 'arrow', endCap: 'arrow', capSize: 5, width: 1, label: 'T = xx:xx.002', labelSize: 8, labelPos: 0.5, labelOffset: -50, name: 'Δt 2' }),
      C('line', { points: [{ x: 352, y: 468 }, { x: 352, y: 592 }], startCap: 'arrow', endCap: 'arrow', capSize: 5, width: 1, label: 'T = xx:xx.428', labelSize: 8, labelPos: 0.5, labelOffset: -50, name: 'Δt 3' }),
    ],
  };

  // Build a project with one diagram per figure of the book, each carrying that figure as a locked
  // tracing reference (loaded from reference/<file>, which sits next to VDLStudio.html).
  function buildBookProject() {
    const proj = VDL.newProject('Trace, Log, Text, Narrative, Data (5th ed.) — Dia|gram figures');
    proj.diagrams = [];
    const pageW = VDL_DEFAULT_PAGE.width, pageH = VDL_DEFAULT_PAGE.height, margin = 20;
    VDL_CATALOG.forEach(entry => {
      const refs = entry.refs || [];
      if (!refs.length) {
        const doc = VDL.newDoc(entry.name, entry.name);
        doc.note = 'No figure in the book for this pattern.';
        proj.diagrams.push(doc);
        return;
      }
      refs.forEach((r, i) => {
        const doc = VDL.newDoc(refs.length > 1 ? `${entry.name} (${i + 1})` : entry.name, entry.name);
        const s = Math.min((pageW - 2 * margin) / r.w, (pageH - 2 * margin) / r.h);
        const w = Math.round(r.w * s), h = Math.round(r.h * s);
        doc.elements.push(VDL.create('image', { x: margin, y: margin, w, h, href: 'reference/' + r.file, natW: r.w, natH: r.h,
                                                reference: true, opacity: 0.55, locked: true, name: 'Reference: ' + r.file }));
        if (refs.length === 1 && EXAMPLES[entry.name]) { doc.elements.push(...EXAMPLES[entry.name]()); doc.note = 'Worked example drawn over the book figure.'; }
        proj.diagrams.push(doc);
      });
    });
    proj.current = 0;
    return proj;
  }

  return { TEMPLATES, EXAMPLES, buildBookProject, axisTrace };
})();
