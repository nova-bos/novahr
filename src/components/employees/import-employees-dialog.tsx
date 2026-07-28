"use client";

import * as React from "react";
import { Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  importEmployeesFromCsvAction,
  type ImportRowError,
} from "@/lib/employees/import-actions";
import { buildTemplateCsv, parseCsv, type CsvRow } from "@/lib/employees/import-columns";

// Compact set of columns shown in the preview table (the CSV itself carries far
// more). Kept short so the preview stays readable.
const PREVIEW_COLUMNS: { key: string; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "jobTitle", label: "Job title" },
  { key: "idNumber", label: "SA ID" },
  { key: "annualGross", label: "Salary" },
];

const PREVIEW_LIMIT = 5;

function downloadTemplate() {
  const blob = new Blob([buildTemplateCsv()], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employee-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Phase = "idle" | "preview" | "importing" | "done";

interface DoneState {
  imported: number;
  errors: ImportRowError[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportEmployeesDialog({ open, onOpenChange, onImportComplete }: Props) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [rows, setRows] = React.useState<CsvRow[]>([]);
  const [fileName, setFileName] = React.useState<string>("");
  const [result, setResult] = React.useState<DoneState | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setPhase("idle");
    setRows([]);
    setFileName("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const parsed = parseCsv(text);
      setRows(parsed);
      setPhase("preview");
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setPhase("importing");
    try {
      const res = await importEmployeesFromCsvAction(rows);
      setResult(res);
      setPhase("done");
      if (res.imported > 0) {
        onImportComplete();
        toast.success(
          `${res.imported} ${res.imported === 1 ? "employee" : "employees"} imported successfully`
        );
      }
    } catch (err) {
      setResult({
        imported: 0,
        errors: [
          {
            row: 0,
            field: "general",
            message: err instanceof Error ? err.message : "Import failed. Please try again.",
          },
        ],
      });
      setPhase("done");
    }
  }

  const previewRows = rows.slice(0, PREVIEW_LIMIT);
  const extraRows = rows.length - PREVIEW_LIMIT;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV to add multiple employees at once, with the same details
            as manual onboarding. Download the template for the full set of
            columns. Required: first name, last name, email, phone, SA ID number,
            job title, start date, annual gross salary, bank, account number and
            branch code.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Download template</p>
                <p className="text-xs text-muted-foreground">
                  Start from our pre-formatted CSV template.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download />
                Template
              </Button>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Upload className="size-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Select your CSV file</p>
                <p className="text-xs text-muted-foreground">
                  Columns are matched by their header name, so the order does not
                  matter. Values with commas can be wrapped in quotes.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {phase === "preview" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{fileName}</span>
                {" ("}
                {rows.length} {rows.length === 1 ? "row" : "rows"} found)
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                }}
              >
                Change file
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    {PREVIEW_COLUMNS.map((col) => (
                      <TableHead key={col.key} className="text-xs">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, idx) => (
                    <TableRow key={idx}>
                      {PREVIEW_COLUMNS.map((col) => (
                        <TableCell key={col.key} className="text-xs">
                          {row[col.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {extraRows > 0 && (
              <p className="text-xs text-muted-foreground">
                ...and {extraRows} more {extraRows === 1 ? "row" : "rows"} not shown
              </p>
            )}
          </div>
        )}

        {phase === "importing" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">
              Importing {rows.length} {rows.length === 1 ? "employee" : "employees"}...
            </p>
          </div>
        )}

        {phase === "done" && result !== null && (
          <div className="flex flex-col gap-4">
            {result.imported > 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/10 p-3">
                <CheckCircle className="size-4 shrink-0 text-success" />
                <p className="text-sm text-success">
                  {result.imported} {result.imported === 1 ? "employee" : "employees"} imported
                  successfully.
                </p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-destructive" />
                  <p className="text-sm font-medium text-destructive">
                    {result.errors.length} {result.errors.length === 1 ? "row" : "rows"} had errors:
                  </p>
                </div>
                <ul className="max-h-48 overflow-y-auto rounded-lg border border-border p-2 text-xs space-y-1">
                  {result.errors.map((err, idx) => (
                    <li key={idx} className="flex gap-2 text-muted-foreground">
                      <span className="shrink-0 font-medium text-foreground">
                        Row {err.row}
                        {err.field !== "general" ? ` (${err.field})` : ""}:
                      </span>
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.imported === 0 && result.errors.length === 0 && (
              <p className="text-sm text-muted-foreground">No rows were processed.</p>
            )}
          </div>
        )}

        <DialogFooter showCloseButton={phase === "done"}>
          {phase === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={rows.length === 0}>
                Import {rows.length} {rows.length === 1 ? "employee" : "employees"}
              </Button>
            </>
          )}
          {phase === "idle" && (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
