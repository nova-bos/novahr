import Image from "next/image";
import { cn } from "@/lib/utils";

// NH monogram mark, always square.
// Pass forceDark when the background is always dark (e.g. the app sidebar).
export function LogoIcon({ size = 32, className, forceDark }: { size?: number; className?: string; forceDark?: boolean }) {
  if (forceDark) {
    return (
      <span className={cn("inline-flex shrink-0", className)}>
        <Image src="/icon-dark-sq.png" width={size} height={size} alt="NovaHR" priority />
      </span>
    );
  }
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
// Pass forceDark when the background is always dark (e.g. the app sidebar).
export function Logo({ height = 24, className, forceDark }: { height?: number; className?: string; forceDark?: boolean }) {
  const width = Math.round(height * (918 / 200));
  if (forceDark) {
    return (
      <span className={cn("inline-flex shrink-0", className)} aria-label="NovaHR">
        <Image src="/logo-dark-crop.png" width={width} height={height} alt="NovaHR" priority />
      </span>
    );
  }
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
