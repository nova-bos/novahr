import { cn } from "@/lib/utils";

interface LogoProps {
  height?: number;
  className?: string;
  forceDark?: boolean;
}

function NovaHRIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <path d="M8 22L14 10L20 18L23 14L26 22H8Z" fill="white" fillOpacity="0.9" />
      <circle cx="23" cy="10" r="2.5" fill="white" fillOpacity="0.7" />
    </svg>
  );
}

export function LogoIcon({
  size = 32,
  className,
  forceDark: _,
}: {
  size?: number;
  className?: string;
  forceDark?: boolean;
}) {
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <NovaHRIcon size={size} />
    </span>
  );
}

export function Logo({ height = 24, className, forceDark: _ }: LogoProps) {
  const iconSize = Math.round(height * 1.15);
  const fontSize = Math.round(height * 0.72);
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-2", className)}
      aria-label="NovaHR"
    >
      <NovaHRIcon size={iconSize} />
      <span
        className="font-semibold tracking-tight"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
      >
        Nova<span style={{ color: "var(--primary)" }}>HR</span>
      </span>
    </span>
  );
}
