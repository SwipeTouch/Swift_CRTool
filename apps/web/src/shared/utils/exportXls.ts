export function exportRowsToXls(
  rows: Record<string, unknown>[],
  columns: { key: string; title: string; render?: (row: Record<string, unknown>) => string }[],
  filename: string,
) {
  const header = columns.map((c) => c.title);
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.render ? c.render(row) : row[c.key];
        return escape(raw == null ? '' : String(raw));
      })
      .join(','),
  );
  const csv = ['\ufeff' + header.map(escape).join(','), ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}
