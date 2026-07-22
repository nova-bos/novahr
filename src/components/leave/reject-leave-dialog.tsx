"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RejectLeaveDialogProps {
  employeeName: string;
  disabled?: boolean;
  /** Called with the optional rejection note when the user confirms. */
  onReject: (note: string) => Promise<void>;
  /** Override the trigger appearance. Defaults to the standard icon button. */
  trigger?: React.ReactNode;
}

export function RejectLeaveDialog({
  employeeName,
  disabled,
  onReject,
  trigger,
}: RejectLeaveDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onReject(note.trim());
      setOpen(false);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(value: boolean) {
    if (!submitting) {
      setOpen(value);
      if (!value) setNote("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="icon-sm"
            variant="outline"
            disabled={disabled}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" />
            <span className="sr-only">Decline</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Decline leave request</DialogTitle>
          <DialogDescription>
            Declining {employeeName}&apos;s leave request. Add a note so they understand the reason.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="reject-note">
            Reason <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="reject-note"
            rows={3}
            placeholder="e.g. Staffing levels during that period, please reapply for alternate dates."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">The employee will see this note.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Declining..." : "Decline request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
