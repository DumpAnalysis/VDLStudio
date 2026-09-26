// VDL Studio — Copyright © 2026 Dmitry Vostokov. Licensed under the PolyForm Noncommercial License 1.0.0 (see LICENSE.md).
// VDL Studio — colour palette.
// The book's diagrams were drawn with the Office "standard colours" plus a few tints,
// so the palette reproduces those values exactly (sampled from the Fifth Edition figures).
const VDL_COLORS = [
  { name: 'Black',        hex: '#000000' },
  { name: 'Gray 75',      hex: '#404040' },
  { name: 'Gray 50',      hex: '#7F7F7F' },
  { name: 'Gray 35',      hex: '#A6A6A6' },   // default trace background
  { name: 'Gray 25',      hex: '#BFBFBF' },
  { name: 'Gray 15',      hex: '#D9D9D9' },
  { name: 'Gray 5',       hex: '#F2F2F2' },
  { name: 'White',        hex: '#FFFFFF' },
  { name: 'Dark Red',     hex: '#C00000' },
  { name: 'Red',          hex: '#FF0000' },
  { name: 'Orange',       hex: '#ED7D31' },
  { name: 'Gold',         hex: '#FFC000' },
  { name: 'Yellow',       hex: '#FFFF00' },
  { name: 'Pale Yellow',  hex: '#FFE697' },
  { name: 'Light Green',  hex: '#92D050' },
  { name: 'Green',        hex: '#00B050' },
  { name: 'Bright Green', hex: '#00E366' },
  { name: 'Yellow Green', hex: '#C8E728' },
  { name: 'Olive',        hex: '#789440' },
  { name: 'Light Blue',   hex: '#00B0F0' },
  { name: 'Blue',         hex: '#0070C0' },
  { name: 'Steel Blue',   hex: '#4A90D9' },
  { name: 'Dark Blue',    hex: '#002060' },
  { name: 'Purple',       hex: '#7030A0' },
  { name: 'Brown',        hex: '#833C0B' },
  { name: 'Pink',         hex: '#FF9999' },
];

const VDL_FONT = 'Arial, Helvetica, sans-serif';

// Default sizes are expressed in page units (px at 100% zoom). The book figures were
// PowerPoint slides of 960 × 720 px, so a "trace" of ~150 × 400 px and a message row
// pitch of 4 px reproduce the original proportions.
const VDL_DEFAULT_PAGE = { width: 960, height: 720, grid: 4, background: '#FFFFFF' };
