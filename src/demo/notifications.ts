import type { NotificationItem } from "@/lib/types";

export const notifications: NotificationItem[] = [
  // NovaTech Solutions
  {
    id: "novatech-notif-001",
    tenantId: "novatech",
    title: "Leave request awaiting approval",
    description: "Buhle Khumalo requested 5 days of annual leave starting 22 June.",
    timestamp: "2026-06-08T14:22:00",
    read: false,
    type: "warning",
  },
  {
    id: "novatech-notif-002",
    tenantId: "novatech",
    title: "Leave request awaiting approval",
    description: "Johan Pretorius requested family responsibility leave on 15 June.",
    timestamp: "2026-06-09T09:05:00",
    read: false,
    type: "warning",
  },
  {
    id: "novatech-notif-003",
    tenantId: "novatech",
    title: "Payroll scheduled",
    description: "June 2026 payroll is scheduled to run on 25 June.",
    timestamp: "2026-06-07T08:00:00",
    read: false,
    type: "info",
  },
  {
    id: "novatech-notif-004",
    tenantId: "novatech",
    title: "Payslips published",
    description: "May 2026 payslips have been generated and shared with employees.",
    timestamp: "2026-05-25T09:30:00",
    read: true,
    type: "success",
  },
  {
    id: "novatech-notif-005",
    tenantId: "novatech",
    title: "New team member onboarding",
    description: "Sarah Williams started onboarding as Customer Success Manager.",
    timestamp: "2026-06-01T08:10:00",
    read: true,
    type: "info",
  },

  // Apex Financial Group
  {
    id: "apex-notif-001",
    tenantId: "apex",
    title: "Leave request awaiting approval",
    description: "Bongani Zulu requested 5 days of annual leave starting 29 June.",
    timestamp: "2026-06-06T13:15:00",
    read: false,
    type: "warning",
  },
  {
    id: "apex-notif-002",
    tenantId: "apex",
    title: "Leave request awaiting approval",
    description: "Riaan Cloete requested family responsibility leave on 18 June.",
    timestamp: "2026-06-09T15:40:00",
    read: false,
    type: "warning",
  },
  {
    id: "apex-notif-003",
    tenantId: "apex",
    title: "Payroll scheduled",
    description: "June 2026 payroll is scheduled to run on 25 June.",
    timestamp: "2026-06-07T08:00:00",
    read: false,
    type: "info",
  },
  {
    id: "apex-notif-004",
    tenantId: "apex",
    title: "Payslips published",
    description: "May 2026 payslips have been generated and shared with employees.",
    timestamp: "2026-05-25T09:30:00",
    read: true,
    type: "success",
  },
  {
    id: "apex-notif-005",
    tenantId: "apex",
    title: "New team member onboarding",
    description: "Yusuf Cassim started onboarding as Client Relationship Manager.",
    timestamp: "2026-06-08T08:30:00",
    read: true,
    type: "info",
  },

  // Horizon Logistics
  {
    id: "horizon-notif-001",
    tenantId: "horizon",
    title: "Leave request awaiting approval",
    description: "Grant Naidoo requested 4 days of annual leave starting 24 June.",
    timestamp: "2026-06-08T12:18:00",
    read: false,
    type: "warning",
  },
  {
    id: "horizon-notif-002",
    tenantId: "horizon",
    title: "Leave request awaiting approval",
    description: "Mpho Tlhabane requested family responsibility leave on 20 June.",
    timestamp: "2026-06-10T14:05:00",
    read: false,
    type: "warning",
  },
  {
    id: "horizon-notif-003",
    tenantId: "horizon",
    title: "Payroll scheduled",
    description: "June 2026 payroll is scheduled to run on 25 June.",
    timestamp: "2026-06-07T08:00:00",
    read: false,
    type: "info",
  },
  {
    id: "horizon-notif-004",
    tenantId: "horizon",
    title: "Payslips published",
    description: "May 2026 payslips have been generated and shared with employees.",
    timestamp: "2026-05-25T09:30:00",
    read: true,
    type: "success",
  },
  {
    id: "horizon-notif-005",
    tenantId: "horizon",
    title: "Onboarding in progress",
    description: "Zinhle Buthelezi is progressing through onboarding as Account Manager.",
    timestamp: "2026-06-10T09:45:00",
    read: true,
    type: "info",
  },
];

export function getNotificationsByTenant(tenantId: string): NotificationItem[] {
  return notifications
    .filter((n) => n.tenantId === tenantId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
