import type { Tenant } from "@/lib/types";

export const tenants: Tenant[] = [
  {
    id: "novatech",
    name: "NovaTech Solutions",
    legalName: "NovaTech Solutions (Pty) Ltd",
    initials: "NT",
    industry: "Software & Technology",
    color: "#4C6FFF",
    founded: "2018",
    currency: "ZAR",
    payFrequency: "monthly",
    registrationNumber: "2018/123456/07",
    vatNumber: "4480123456",
    address: "12 Bree Street, Cape Town, 8001",
    city: "Cape Town",
    payDay: 25,
    bankName: "First National Bank",
    primaryContact: "Lerato Dlamini",
    plan: "subscribed" as const,
  },
  {
    id: "apex",
    name: "Apex Financial Group",
    legalName: "Apex Financial Group (Pty) Ltd",
    initials: "AF",
    industry: "Financial Services",
    color: "#0F9D8C",
    founded: "2014",
    currency: "ZAR",
    payFrequency: "monthly",
    registrationNumber: "2014/098765/07",
    vatNumber: "4470987654",
    address: "88 Maude Street, Sandton, Johannesburg, 2196",
    city: "Johannesburg",
    payDay: 25,
    bankName: "Standard Bank",
    primaryContact: "Nomvula Khumalo",
    plan: "subscribed" as const,
  },
  {
    id: "horizon",
    name: "Horizon Logistics",
    legalName: "Horizon Logistics & Freight (Pty) Ltd",
    initials: "HL",
    industry: "Logistics & Freight",
    color: "#E08A3C",
    founded: "2011",
    currency: "ZAR",
    payFrequency: "monthly",
    registrationNumber: "2011/045678/07",
    vatNumber: "4460456789",
    address: "4 Bayhead Road, Durban, 4001",
    city: "Durban",
    payDay: 25,
    bankName: "Nedbank",
    primaryContact: "Sipho Mokoena",
    plan: "subscribed" as const,
  },
];

export function getTenant(id: string): Tenant {
  const tenant = tenants.find((t) => t.id === id);
  if (!tenant) throw new Error(`Unknown tenant: ${id}`);
  return tenant;
}
