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
  forceDark,
}: {
  size?: number;
  className?: string;
  forceDark?: boolean;
}) {
  if (forceDark) {
    return (
      <span className={cn("inline-flex shrink-0", className)}>
        <Image src="/favicon-dark.png" width={size} height={size} alt="NovaHR" priority />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <Image
        src="/favicon-light.png"
        width={size}
        height={size}
        alt="NovaHR"
        priority
        className="dark:hidden"
      />
      <Image
        src="/favicon-dark.png"
        width={size}
        height={size}
        alt="NovaHR"
        priority
        className="hidden dark:block"
      />
    </span>
  );
}

export function Logo({ height = 24, className, forceDark }: LogoProps) {
  const width = Math.round(height * 4.2);
  if (forceDark) {
    return (
      <span className={cn("inline-flex shrink-0", className)} aria-label="NovaHR">
        <Image src="/logo-dark.png" width={width} height={height} alt="NovaHR" priority />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex shrink-0", className)} aria-label="NovaHR">
      <Image
        src="/logo-light.png"
        width={width}
        height={height}
        alt="NovaHR"
        priority
        className="dark:hidden"
      />
      <Image
        src="/logo-dark.png"
        width={width}
        height={height}
        alt=""
        priority
        className="hidden dark:block"
      />
    </span>
  );
}
