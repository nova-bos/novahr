import type { UserRole } from "./types";

/**
 * Display data + credentials for the 4 demo personas shown on the `/login`
 * picker. This is the source list for `prisma/seed.ts`, which creates a real
 * Supabase Auth user + `User` row for each entry - it is not read at runtime
 * by the app itself.
 */
export interface DemoPersona {
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

export const demoUsers: DemoPersona[] = [
  {
    id: "user-employee",
    role: "employee",
    name: "Aisha Patel",
    title: "Senior Software Engineer",
    email: "aisha.patel@novatech.co.za",
    password: "employee123",
    tenantId: "novatech",
    employeeId: "novatech-emp-003",
    avatarColor: "#A855F7",
    initials: "AP",
  },
  {
    id: "user-manager",
    role: "manager",
    name: "Thabo Nkosi",
    title: "VP of Engineering",
    email: "thabo.nkosi@novatech.co.za",
    password: "manager123",
    tenantId: "novatech",
    employeeId: "novatech-emp-002",
    avatarColor: "#0F9D8C",
    initials: "TN",
  },
  {
    id: "user-hr",
    role: "hr",
    name: "Lerato Dlamini",
    title: "Chief People Officer",
    email: "lerato.dlamini@novatech.co.za",
    password: "hr123",
    tenantId: "novatech",
    employeeId: "novatech-emp-001",
    avatarColor: "#4C6FFF",
    initials: "LD",
  },
  {
    id: "user-exco",
    role: "exco",
    name: "Michael van der Berg",
    title: "Group Chief Executive",
    email: "michael.vandenberg@novagroup.co.za",
    password: "exco123",
    tenantId: "novatech",
    avatarColor: "#E08A3C",
    initials: "MV",
  },
];
