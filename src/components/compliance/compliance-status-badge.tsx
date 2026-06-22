"use client";

import type { ComplianceStatus } from "@prisma/client";
import { isOverdue } from "@/lib/compliance/utils";

interface ComplianceStatusBadgeProps {
  status: ComplianceStatus;
  dueDate?: string | null;
}

export function ComplianceStatusBadge({ status, dueDate }: ComplianceStatusBadgeProps) {
  const overdue =
    status === "pending" && dueDate ? isOverdue(new Date(dueDate)) : false;

  if (overdue) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Overdue
      </span>
    );
  }

  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Pending
        </span>
      );
    case "submitted":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Submitted
        </span>
      );
    case "accepted":
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Accepted
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Rejected
        </span>
      );
    default:
      return null;
  }
}
