"use client";

const env = process.env.NEXT_PUBLIC_APP_ENV;

export function EnvBanner() {
  if (!env || env === "production") return null;

  const label = env === "staging" ? "STAGING" : "DEVELOPMENT";
  const colors =
    env === "staging"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
      : "bg-primary/15 text-primary dark:text-primary border-primary/30";

  return (
    <div className={`border-b py-1 text-center text-xs font-semibold tracking-widest ${colors}`}>
      {label}
    </div>
  );
}
