"use client";

import Link from "next/link";
import { useEffect } from "react";

const BILLING_ERRORS = ["trial has ended", "subscription has ended", "payment is overdue", "subscription is not active"];

function isBillingError(message: string) {
  return BILLING_ERRORS.some((phrase) => message.toLowerCase().includes(phrase));
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const billing = isBillingError(error.message);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-destructive">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div>
        <p className="font-semibold">{billing ? "Subscription required" : "Something went wrong"}</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {billing
            ? error.message
            : "An unexpected error occurred. Try again or contact support if the problem persists."}
        </p>
      </div>
      <div className="flex gap-3">
        {billing ? (
          <Link
            href="/billing"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to Billing
          </Link>
        ) : (
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
        )}
        {!billing && (
          <a
            href="mailto:support@novabos.co.za"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Contact support
          </a>
        )}
      </div>
    </div>
  );
}
