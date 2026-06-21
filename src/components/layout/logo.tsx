import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  height?: number;
  className?: string;
  forceDark?: boolean;
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
      <Image src="/logo-icon.png" width={size} height={size} alt="NovaHR" priority />
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
      <Image src="/logo-icon.png" width={iconSize} height={iconSize} alt="" aria-hidden priority />
      <span
        className="font-semibold tracking-tight"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1 }}
      >
        Nova<span style={{ color: "var(--primary)" }}>HR</span>
      </span>
    </span>
  );
}
