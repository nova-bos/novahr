// Excel (.xlsx) export, mirroring the CSV export shape (headers + rows).
//
// `write-excel-file` is imported dynamically so the library only ships to the
// browser when a user actually exports, keeping it out of the main bundle.

type CellValue = string | number | null | undefined;

/**
 * Build and download a single-sheet .xlsx file from a header row and data rows.
 * Numbers are written as numeric cells so Excel treats them as numbers, not text.
 */
export async function downloadXLSX(
  headers: string[],
  rows: CellValue[][],
  filename: string,
  sheetName = "Sheet1"
): Promise<void> {
  const writeXlsxFile = (await import("write-excel-file")).default;

  const headerRow = headers.map((label) => ({
    value: label,
    fontWeight: "bold" as const,
    type: String,
  }));

  const dataRows = rows.map((row) =>
    row.map((cell) => {
      if (cell == null || cell === "") return { value: "", type: String };
      if (typeof cell === "number") return { value: cell, type: Number };
      return { value: String(cell), type: String };
    })
  );

  await writeXlsxFile([headerRow, ...dataRows], {
    fileName: `${filename}.xlsx`,
    sheet: sheetName.slice(0, 31), // Excel caps sheet names at 31 chars.
  });
}
