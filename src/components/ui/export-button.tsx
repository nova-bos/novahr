"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toCSV, downloadCSV } from "@/lib/export/csv";
import { downloadXLSX } from "@/lib/export/xlsx";

export interface ExportData {
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export interface ExportButtonProps {
  /** Builds the export data lazily, on click, so nothing is computed up front. */
  build: () => ExportData;
  /** Filename without extension. */
  filename: string;
  /** Worksheet name for the Excel export. */
  sheetName?: string;
  label?: string;
  disabled?: boolean;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}

/**
 * A single control offering CSV and Excel (.xlsx) downloads of the same table,
 * so every report exports consistently. Used in place of the old single
 * "Download CSV" buttons.
 */
export function ExportButton({
  build,
  filename,
  sheetName,
  label = "Export",
  disabled,
  size = "sm",
  variant = "outline",
}: ExportButtonProps) {
  const [busy, setBusy] = React.useState(false);

  function exportCsv() {
    const { headers, rows } = build();
    downloadCSV(toCSV(headers, rows), filename);
  }

  async function exportXlsx() {
    setBusy(true);
    try {
      const { headers, rows } = build();
      await downloadXLSX(headers, rows, filename, sheetName);
    } catch {
      toast.error("Could not generate the Excel file. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled || busy}>
          <Download className="size-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCsv}>Download CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={exportXlsx}>Download Excel (.xlsx)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
