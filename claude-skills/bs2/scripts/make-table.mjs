// Builds the house-style HTML tables as :::html fences, ready to paste into a draft.
// Usage: node make-table.mjs spec.json > tables.md
//
// spec.json is an array of tables:
// [
//   { "type": "table", "caption": "Madeira's airports, September 2026",
//     "columns": ["", "Madeira", "Porto Santo"],
//     "wasLabel": "Sept 2025",
//     "rows": [
//       ["Passengers", {"v": "502,400", "chg": "2.1%"}, {"v": "32,300", "chg": "5.5%"}],
//       ["Seat occupancy", {"v": "88.1%", "was": "86.4%"}, null]
//     ] },
//   { "type": "bars", "caption": "Top countries", "columns": ["Country", "Share"],
//     "unit": "%", "rows": [["United Kingdom", 26.8], ["Germany", 19.7]] }
// ]
// chg "-0.5%" renders red with a down arrow, anything else green with an up arrow.
// was renders a grey "<wasLabel>: <value>" line. null renders a faded n/a.
import fs from 'fs';

const UP = '#1a7f37', DOWN = '#cf222e', BAR = '#1f6feb';
const th = 'padding:10px 12px;border-bottom:2px solid currentColor;font-weight:700;text-align:right';
const td = 'padding:10px 12px;border-bottom:1px solid rgba(128,128,128,.3);text-align:right;white-space:nowrap';

const wrap = (cap, inner) =>
  `:::html\n<div style="overflow-x:auto;margin:1.2em 0"><table style="width:100%;border-collapse:collapse;font-size:1em;line-height:1.45"><caption style="caption-side:top;text-align:left;font-size:1.1em;font-weight:700;padding:0 0 10px">${cap}</caption>${inner}</table></div>\n:::`;

function cell(c, wasLabel) {
  if (c == null) return `<td style="${td};opacity:.5">n/a</td>`;
  if (typeof c !== 'object') c = { v: String(c) };
  let extra = '';
  if (c.chg) {
    const down = c.chg.startsWith('-');
    extra = `<br><span style="font-size:.85em;font-weight:600;color:${down ? DOWN : UP}">${down ? '▼ ' + c.chg : '▲ +' + c.chg.replace(/^\+/, '')}</span>`;
  } else if (c.was) {
    extra = `<br><span style="font-size:.85em;opacity:.7">${wasLabel || 'Before'}: ${c.was}</span>`;
  }
  return `<td style="${td}"><strong>${c.v}</strong>${extra}</td>`;
}

function table(t) {
  const head = t.columns.map((h, i) => `<th style="${th}${i === 0 ? ';text-align:left' : ''}">${h}</th>`).join('');
  const body = t.rows.map(r =>
    `<tr><td style="${td};text-align:left;white-space:normal">${r[0]}</td>${r.slice(1).map(c => cell(c, t.wasLabel)).join('')}</tr>`).join('');
  return wrap(t.caption, `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`);
}

function bars(t) {
  const max = Math.max(...t.rows.map(r => r[1]));
  const unit = t.unit ?? '';
  const head = `<th style="${th};text-align:left">${t.columns[0]}</th><th style="${th};text-align:left;width:55%">${t.columns[1]}</th>`;
  const body = t.rows.map(([label, v]) =>
    `<tr><td style="${td};text-align:left">${label}</td><td style="${td};text-align:left"><div style="display:flex;align-items:center;gap:8px"><div style="height:12px;width:${(v / max * 75).toFixed(1)}%;background:${BAR};border-radius:3px"></div><strong>${t.decimals != null ? v.toFixed(t.decimals) : v}${unit}</strong></div></td></tr>`).join('');
  return wrap(t.caption, `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`);
}

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(spec.map(t => (t.type === 'bars' ? bars(t) : table(t))).join('\n\n'));
