export type UserRole = "employee" | "manager" | "hr" | "exco";

/**
 * The authenticated user's profile, loaded from the `User` table by id
 * (Supabase `auth.users.id`). Returned by `getCurrentUserProfile()`.
 */
export interface AppUser {
  id: string;
  role: UserRole;
  name: string;
  title: string;
  email: string;
  tenantId: string;
  employeeId?: string;
  avatarColor: string;
  initials: string;
  /** Null means whole-company access; set limits this admin to one branch. */
  branchScopeId?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: "Employee",
  manager: "Manager",
  hr: "HR Administrator",
  exco: "Executive Committee",
};
