export interface PricingTier {
  id: "starter" | "growth" | "scale";
  name: string;
  monthlyPrice: number;
  maxEmployees: number | null;
  tagline: string;
  features: string[];
  highlighted: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 499,
    maxEmployees: 10,
    tagline: "For growing teams",
    highlighted: false,
    features: [
      "Up to 10 employees",
      "Employee management and profiles",
      "Leave management and approvals",
      "Payroll processing and payslip generation",
      "Role-based access (Employee, Manager, HR)",
      "Reports and analytics",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthlyPrice: 999,
    maxEmployees: 30,
    tagline: "For scaling companies",
    highlighted: true,
    features: [
      "Up to 30 employees",
      "Everything in Starter",
      "Multi-department management",
      "Payroll run approvals",
      "Compliance tracking (EMP201, employment equity, POPIA)",
      "NetCash bank payment exports",
      "Executive reporting dashboard",
      "Priority email support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    monthlyPrice: 2499,
    maxEmployees: null,
    tagline: "For established businesses",
    highlighted: false,
    features: [
      "Unlimited employees",
      "Everything in Growth",
      "Dedicated onboarding session",
      "Priority support with faster response times",
    ],
  },
];

export function getMonthlyPrice(tierId: PricingTier["id"]): number {
  const tier = PRICING_TIERS.find((t) => t.id === tierId);
  if (!tier) {
    throw new Error(`Unknown tier id: ${tierId}`);
  }
  return tier.monthlyPrice;
}

export function getAnnualPrice(tierId: PricingTier["id"]): number {
  return getMonthlyPrice(tierId) * 12;
}

export function tierFitsEmployeeCount(
  tierId: PricingTier["id"],
  count: number
): boolean {
  const tier = PRICING_TIERS.find((t) => t.id === tierId);
  if (!tier) {
    throw new Error(`Unknown tier id: ${tierId}`);
  }
  if (tier.maxEmployees === null) {
    return true;
  }
  return count <= tier.maxEmployees;
}

export function suggestTier(
  employeeCount: number
): PricingTier["id"] | null {
  const match = PRICING_TIERS.find(
    (t) => t.maxEmployees === null || t.maxEmployees >= employeeCount
  );
  return match ? match.id : null;
}
