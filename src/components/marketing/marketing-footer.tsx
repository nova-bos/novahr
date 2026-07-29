import Link from "next/link";
import { appLink } from "@/lib/marketing/app-link";
import { Logo } from "@/components/layout/logo";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/security", label: "Security" },
  { href: "/legal/compliance", label: "Compliance" },
  { href: "/legal", label: "Legal" },
  { href: "/legal/paia-manual", label: "PAIA Manual" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Logo height={20} />
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
          <Link href={appLink("/login")} className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link
            href={appLink("/signup")}
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Get started
          </Link>
        </nav>
      </div>

      <nav className="mx-auto mt-6 flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 text-xs text-muted-foreground/80 sm:justify-start">
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
