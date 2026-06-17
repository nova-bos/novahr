import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Logo />
          <span className="font-semibold text-foreground">NovaHR</span>
          <span className="hidden sm:inline">&middot;</span>
          <span className="hidden text-sm sm:inline">
            &copy; 2026 NovaHR. All rights reserved.
          </span>
        </div>

        <span className="text-sm text-muted-foreground sm:hidden">
          &copy; 2026 NovaHR. All rights reserved.
        </span>

        <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/#pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Get started
          </Link>
        </nav>
      </div>
    </footer>
  );
}
