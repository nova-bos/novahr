"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Employee } from "@/lib/types";
import { generateLetterAction, type LetterType } from "@/lib/documents/letter-actions";

const LETTER_OPTIONS: { value: LetterType; label: string; needsOffence?: boolean }[] = [
  { value: "employment_contract", label: "Employment contract" },
  { value: "termination_letter", label: "Termination letter" },
  { value: "warning_verbal", label: "Verbal warning", needsOffence: true },
  { value: "warning_written", label: "Written warning", needsOffence: true },
  { value: "warning_final", label: "Final written warning", needsOffence: true },
];

function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProfileLetters({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const canManage = user?.role === "hr";
  const [letterType, setLetterType] = React.useState<LetterType>("employment_contract");
  const [offence, setOffence] = React.useState("");
  const [hearingDate, setHearingDate] = React.useState("");
  const [isGenerating, startGenerateTransition] = React.useTransition();

  const option = LETTER_OPTIONS.find((o) => o.value === letterType);

  function handleGenerate() {
    startGenerateTransition(async () => {
      try {
        const { html, filename } = await generateLetterAction({
          employeeId: employee.id,
          type: letterType,
          offence: offence || undefined,
          hearingDate: hearingDate || undefined,
        });
        downloadHtml(html, filename);
        toast.success("Document generated. Open the downloaded file and use Print to save as PDF.");
      } catch (err) {
        toast.error("Could not generate document", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <CardTitle>Generate letter or document</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="letter-type">Document type</Label>
          <Select value={letterType} onValueChange={(v) => setLetterType(v as LetterType)}>
            <SelectTrigger id="letter-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LETTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {option?.needsOffence ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="letter-offence">
                Offence description{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="letter-offence"
                value={offence}
                onChange={(e) => setOffence(e.target.value)}
                placeholder="e.g. Unauthorised absence on 2026-07-15"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="letter-hearing">
                Hearing date{" "}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <DatePicker
                id="letter-hearing"
                value={hearingDate}
                onValueChange={setHearingDate}
                placeholder="Select hearing date"
                captionLayout="dropdown"
                fromYear={new Date().getFullYear() - 1}
                toYear={new Date().getFullYear() + 2}
              />
            </div>
          </>
        ) : null}

        <p className="text-xs text-muted-foreground">
          The document is pre-filled with this employee&apos;s current details. Open the downloaded
          file in your browser and use <strong>Print &gt; Save as PDF</strong> to create a PDF.
        </p>

        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full sm:w-auto">
          <Download className="mr-2 size-4" />
          {isGenerating ? "Generating..." : "Generate document"}
        </Button>
      </CardContent>
    </Card>
  );
}
