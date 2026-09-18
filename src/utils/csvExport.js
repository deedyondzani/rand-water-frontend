// Lightweight CSV generator — no external deps
// Escapes quotes, handles null, and prepends UTF-8 BOM for Excel

const escapeCell = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export function generateCsv(headers, rows) {
  const headerLine = headers.map(escapeCell).join(',');
  const bodyLines = rows.map((r) => r.map(escapeCell).join(','));
  return [headerLine, ...bodyLines].join('\r\n');
}

export function downloadCsv(filename, headers, rows) {
  const csv = generateCsv(headers, rows);
  // Prepend UTF-8 BOM so Excel correctly reads accented characters
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function timestampedFilename(prefix) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${prefix}_${ts}.csv`;
}
