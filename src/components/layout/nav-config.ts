import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarRange,
  BarChart3,
  Settings,
  UserRound,
  ShieldCheck,
  BanknoteArrowDown,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { AppUser } from "@/lib/auth/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const MOBILE_NAV_HREFS = ["/dashboard", "/employees", "/payroll", "/leave", "/settings"];

export function getMobileNavItems(user: AppUser | null): NavItem[] {
  const items = getNavItems(user);
  if (items.length <= 5) return items;
  return items.filter((item) => MOBILE_NAV_HREFS.includes(item.href));
}

export function getNavItems(user: AppUser | null): NavItem[] {
  if (!user) return [];

  switch (user.role) {
    case "hr":
      return [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "Employees", href: "/employees", icon: Users },
        { title: "Payroll", href: "/payroll", icon: Wallet },
        { title: "Leave", href: "/leave", icon: CalendarRange },
        { title: "Compliance", href: "/compliance", icon: ShieldCheck },
        { title: "Deductions", href: "/deductions", icon: BanknoteArrowDown },
        { title: "Reports", href: "/reports", icon: BarChart3 },
        { title: "Billing", href: "/billing", icon: CreditCard },
        { title: "Settings", href: "/settings", icon: Settings },
      ];
    case "manager":
      return [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "My Team", href: "/employees", icon: Users },
        { title: "My Payslips", href: "/payroll", icon: Wallet },
        ...(user.employeeId
          ? [{ title: "My Profile", href: `/employees/${user.employeeId}`, icon: UserRound }]
          : []),
        { title: "Leave", href: "/leave", icon: CalendarRange },
      ];
    case "employee":
      return [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ...(user.employeeId
          ? [{ title: "My Profile", href: `/employees/${user.employeeId}`, icon: UserRound }]
          : []),
        { title: "My Payslips", href: "/payroll", icon: Wallet },
        { title: "Leave", href: "/leave", icon: CalendarRange },
      ];
    case "exco":
      return [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { title: "Reports", href: "/reports", icon: BarChart3 },
        { title: "Compliance", href: "/compliance", icon: ShieldCheck },
      ];
  }
}
