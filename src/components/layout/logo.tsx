import Image from "next/image";
import { cn } from "@/lib/utils";

// NH monogram mark, always square.
export function LogoIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <Image
        src="/icon-light-sq.png"
        width={size}
        height={size}
        alt="NovaHR"
        priority
        className="dark:hidden"
      />
      <Image
        src="/icon-dark-sq.png"
        width={size}
        height={size}
        alt="NovaHR"
        priority
        className="hidden dark:block"
      />
    </span>
  );
}

// Full NOVA HR wordmark. Natural aspect ratio is 918:200 (~4.59:1).
export function Logo({ height = 24, className }: { height?: number; className?: string }) {
  const width = Math.round(height * (918 / 200));
  return (
    <span className={cn("inline-flex shrink-0", className)} aria-label="NovaHR">
      <Image
        src="/logo-light-crop.png"
        width={width}
        height={height}
        alt="NovaHR"
        priority
        className="dark:hidden"
      />
      <Image
        src="/logo-dark-crop.png"
        width={width}
        height={height}
        alt=""
        priority
        className="hidden dark:block"
      />
    </span>
  );
}
