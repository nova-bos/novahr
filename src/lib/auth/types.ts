export type UserRole = "employee" | "manager" | "hr" | "exco";

export interface DemoUser {
  id: string;
  role: UserRole;
  name: string;
  title: string;
  email: string;
  password: string;
  tenantId: string;
  employeeId?: string;
  avatarColor: string;
  initials: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: "Employee",
  manager: "Manager",
  hr: "HR Administrator",
  exco: "Executive Committee",
};
