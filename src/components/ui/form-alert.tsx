import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FormAlertTone = "error" | "warning" | "info" | "success";

/**
 * A calm, consistent inline notice for forms. The tone sets both the colour and
 * the icon: red for genuine errors, amber for wait/next-step warnings, blue for
 * information, green for success. Renders nothing when there is no message, so
 * callers can drop it in unconditionally.
 */
const TONES: Record<FormAlertTone, { icon: LucideIcon; className: string }> = {
  error: {
    icon: AlertCircle,
    className: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  info: {
    icon: Info,
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
};

export function FormAlert({
  tone = "error",
  children,
  className,
}: {
  tone?: FormAlertTone;
  children: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
        toneClass,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
