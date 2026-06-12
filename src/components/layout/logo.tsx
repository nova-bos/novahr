import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B7CFF] to-[#3046C4] text-sm font-bold text-white shadow-sm",
        className
      )}
    >
      N
    </div>
  );
}
