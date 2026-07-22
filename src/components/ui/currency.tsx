import * as React from "react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type Breakpoint = "sm" | "md" | "lg" | "xl";

const FULL_AT: Record<Breakpoint, string> = {
  sm: "hidden sm:inline",
  md: "hidden md:inline",
  lg: "hidden lg:inline",
  xl: "hidden xl:inline",
};

const COMPACT_AT: Record<Breakpoint, string> = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
};

interface CurrencyProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  amount: number;
  currency?: string;
  /**
   * Show cents in the full (large-screen) form. Defaults to false so headline
   * figures read cleanly as "R 40,000"; pass `cents` for precise money.
   */
  cents?: boolean;
  /** Breakpoint at and above which the full form is shown. Default "sm". */
  from?: Breakpoint;
  /** Force a single representation regardless of screen width. */
  variant?: "responsive" | "full" | "compact";
}

/**
 * Renders a money amount that adapts to screen size: the full grouped value
 * ("R 40,000") on wider screens and a compact value ("R 40K") on narrow ones.
 *
 * Screen readers always receive the precise value with cents, independent of
 * which visual form is shown, so nothing is lost to assistive tech.
 */
export function Currency({
  amount,
  currency = "ZAR",
  cents = false,
  from = "sm",
  variant = "responsive",
  className,
  ...props
}: CurrencyProps) {
  const full = formatCurrency(amount, currency, { cents });
  const compact = formatCurrencyCompact(amount, currency);

  if (variant === "full") {
    return <span className={cn("tabular-nums", className)} {...props}>{full}</span>;
  }
  if (variant === "compact") {
    return <span className={cn("tabular-nums", className)} {...props}>{compact}</span>;
  }

  return (
    <span className={cn("tabular-nums", className)} {...props}>
      <span className="sr-only">{formatCurrency(amount, currency, { cents: true })}</span>
      <span aria-hidden className={FULL_AT[from]}>{full}</span>
      <span aria-hidden className={COMPACT_AT[from]}>{compact}</span>
    </span>
  );
}
