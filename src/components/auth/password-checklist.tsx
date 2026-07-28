import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

/**
 * The password rules we enforce when a user sets a password (sign up, invite
 * acceptance). Kept in one place so the live checklist and the submit guard
 * always agree. The server still validates independently.
 */
export const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "An uppercase and a lowercase letter", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/**
 * A live list of password requirements that tick green as they are met. Shows
 * only once the user has started typing so an empty field is not covered in
 * red crosses.
 */
export function PasswordChecklist({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  if (!password) return null;
  return (
    <ul className={cn("mt-2 space-y-1", className)}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              met ? "text-success" : "text-muted-foreground",
            )}
          >
            {met ? (
              <Check size={13} className="shrink-0" />
            ) : (
              <X size={13} className="shrink-0 opacity-50" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
