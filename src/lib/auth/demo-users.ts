import type { DemoUser } from "./types";

export const demoUsers: DemoUser[] = [
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

export function findDemoUser(email: string, password: string): DemoUser | null {
  const normalized = email.trim().toLowerCase();
  return (
    demoUsers.find(
      (user) => user.email.toLowerCase() === normalized && user.password === password
    ) ?? null
  );
}

export function getDemoUserById(id: string): DemoUser | undefined {
  return demoUsers.find((user) => user.id === id);
}
