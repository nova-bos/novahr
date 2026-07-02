/**
 * Escapes a single CSV cell value.
 * Wraps values containing commas, quotes, or newlines in double quotes.
 */
function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of rows into a CSV string.
 * @param headers Column header labels
 * @param rows    Array of row values in the same column order as headers
 */
export function toCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines: string[] = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return lines.join("\r\n");
}

/**
 * Triggers a browser file download for the given CSV string.
 * @param csv      The CSV content string
 * @param filename The suggested filename (without extension)
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
