import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarRange,
  BarChart3,
  Building2,
  Settings,
  UserRound,
  ShieldCheck,
  Minus,
  type LucideIcon,
} from "lucide-react";
import type { AppUser } from "@/lib/auth/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export function getMobileNavItems(user: AppUser | null): NavItem[] {
  const items = getNavItems(user);
  if (items.length <= 5) return items;
  // HR has 9 items: cap to Dashboard, Employees, Payroll, Leave, Settings
  return [items[0], items[1], items[2], items[5], items[8]];
}

export function getNavItems(user: AppUser | null): NavItem[] {
  if (!user) return [];

  switch (user.role) {
    case "hr":
      return [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "Employees", href: "/employees", icon: Users },
        { title: "Payroll", href: "/payroll", icon: Wallet },
        { title: "Compliance", href: "/compliance", icon: ShieldCheck },
        { title: "Deductions", href: "/deductions", icon: Minus },
        { title: "Leave", href: "/leave", icon: CalendarRange },
        { title: "Reports", href: "/reports", icon: BarChart3 },
        { title: "Tenants", href: "/tenants", icon: Building2 },
        { title: "Settings", href: "/settings", icon: Settings },
      ];
    case "manager":
      return [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "My Team", href: "/employees", icon: Users },
        { title: "Leave", href: "/leave", icon: CalendarRange },
      ];
    case "employee":
      return [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "My Profile", href: `/employees/${user.employeeId}`, icon: UserRound },
        { title: "My Payslips", href: "/payroll", icon: Wallet },
        { title: "Leave", href: "/leave", icon: CalendarRange },
      ];
    case "exco":
      return [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "Reports", href: "/reports", icon: BarChart3 },
        { title: "Compliance", href: "/compliance", icon: ShieldCheck },
        { title: "Tenants", href: "/tenants", icon: Building2 },
      ];
  }
}
