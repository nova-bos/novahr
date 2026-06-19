"use client";

import * as React from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const LEAVE_DOC_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

interface LeaveDocumentUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

export function LeaveDocumentUpload({ value, onChange, error }: LeaveDocumentUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      onChange(null);
      // surface the size error via parent if needed; reset for now
      return;
    }
    onChange(file);
  }

  return (
    <div className="space-y-1.5">
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm">{value.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onChange(null)}
            aria-label="Remove document"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="size-3.5" />
          Attach supporting document
        </Button>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        Optional. JPEG, PNG or PDF up to 10 MB.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={LEAVE_DOC_ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
