"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Paperclip } from "lucide-react";
import { getLeaveDocumentUrl } from "@/lib/leave/documents";
import { cn } from "@/lib/utils";

interface LeaveDocumentLinkProps {
  leaveRequestId: string;
  className?: string;
}

/**
 * Opens a leave request's supporting document via a short-lived signed URL.
 * The URL is fetched on demand through a server action, so no public URL is
 * ever embedded in the page.
 */
export function LeaveDocumentLink({ leaveRequestId, className }: LeaveDocumentLinkProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleOpen(event: React.MouseEvent) {
    event.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const result = await getLeaveDocumentUrl(leaveRequestId);
      if (result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Couldn't open document", {
          description: result.error ?? "Please try again.",
        });
      }
    } catch {
      toast.error("Couldn't open document", { description: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={loading}
      aria-label="View supporting document"
      className={cn(
        "inline-flex items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60",
        className
      )}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
    </button>
  );
}
