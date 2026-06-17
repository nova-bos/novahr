import { createClient } from "@supabase/supabase-js";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { tenants } from "@/lib/data/tenants";
import { getEmployeesByTenant } from "@/lib/data/employees";
import { departments } from "@/lib/data/departments";
import { leaveRequests } from "@/lib/data/leave";
import { payrollRuns, payslips } from "@/lib/data/payroll";
import { activityFeed } from "@/lib/data/activity";
import { notifications } from "@/lib/data/notifications";
import { parseTimestamp } from "@/lib/workspace/mappers";
import { demoUsers } from "@/lib/auth/demo-users";

async function main() {
  console.log("Seeding tenants...");
  for (const tenant of tenants) {
    await prisma.tenant.upsert({
      where: { id: tenant.id },
      update: {},
      create: { ...tenant },
    });
  }
  console.log(`  -> ${tenants.length} tenants ready`);

  console.log("Seeding employees...");
  let employeeCount = 0;
  for (const tenant of tenants) {
    for (const employee of getEmployeesByTenant(tenant.id)) {
      await prisma.employee.upsert({
        where: { id: employee.id },
        update: {},
        create: {
          id: employee.id,
          tenantId: employee.tenantId,
          employeeNumber: employee.employeeNumber,
          firstName: employee.firstName,
          lastName: employee.lastName,
          preferredName: employee.preferredName,
          email: employee.email,
          phone: employee.phone,
          avatarColor: employee.avatarColor,
          initials: employee.initials,
          jobTitle: employee.jobTitle,
          department: employee.department,
          employmentType: employee.employmentType,
          status: employee.status,
          startDate: new Date(employee.startDate),
          location: employee.location,
          managerId: employee.managerId,
          salaryAnnualGross: employee.salary.annualGross,
          salaryCurrency: employee.salary.currency,
          salaryPayFrequency: employee.salary.payFrequency,
          salaryTravelAllowance: employee.salary.travelAllowance,
          salaryHousingAllowance: employee.salary.housingAllowance,
          salaryPensionContributionPct: employee.salary.pensionContributionPct,
          salaryMedicalAid: employee.salary.medicalAid,
          bankName: employee.bankDetails.bank,
          bankAccountNumber: employee.bankDetails.accountNumber,
          bankBranchCode: employee.bankDetails.branchCode,
          bankAccountType: employee.bankDetails.accountType,
          taxNumber: employee.taxNumber,
          idNumber: employee.idNumber,
          address: employee.address,
          emergencyContactName: employee.emergencyContact.name,
          emergencyContactRelationship: employee.emergencyContact.relationship,
          emergencyContactPhone: employee.emergencyContact.phone,
          onboarding: employee.onboarding as Prisma.InputJsonValue | undefined,
        },
      });

      for (const balance of employee.leaveBalances) {
        await prisma.leaveBalance.upsert({
          where: { employeeId_type: { employeeId: employee.id, type: balance.type } },
          update: {},
          create: {
            employeeId: employee.id,
            type: balance.type,
            total: balance.total,
            used: balance.used,
          },
        });
      }

      employeeCount++;
    }
  }
  console.log(`  -> ${employeeCount} employees ready`);

  console.log("Seeding departments...");
  for (const department of departments) {
    await prisma.department.upsert({
      where: { id: department.id },
      update: {},
      create: {
        id: department.id,
        tenantId: department.tenantId,
        name: department.name,
        description: department.description,
        headId: department.headId,
        color: department.color,
        budget: department.budget,
      },
    });
  }
  console.log(`  -> ${departments.length} departments ready`);

  console.log("Seeding leave requests...");
  for (const request of leaveRequests) {
    await prisma.leaveRequest.upsert({
      where: { id: request.id },
      update: {},
      create: {
        id: request.id,
        tenantId: request.tenantId,
        employeeId: request.employeeId,
        type: request.type,
        startDate: new Date(request.startDate),
        endDate: new Date(request.endDate),
        days: request.days,
        reason: request.reason,
        status: request.status,
        appliedOn: new Date(request.appliedOn),
        decisionNote: request.decisionNote,
        decidedBy: request.decidedBy,
        decidedOn: request.decidedOn ? new Date(request.decidedOn) : undefined,
      },
    });
  }
  console.log(`  -> ${leaveRequests.length} leave requests ready`);

  console.log("Seeding payroll runs...");
  for (const run of payrollRuns) {
    await prisma.payrollRun.upsert({
      where: { id: run.id },
      update: {},
      create: {
        id: run.id,
        tenantId: run.tenantId,
        period: run.period,
        label: run.label,
        payDate: new Date(run.payDate),
        status: run.status,
        totalGross: run.totalGross,
        totalDeductions: run.totalDeductions,
        totalNet: run.totalNet,
        totalPaye: run.totalPaye,
        totalUif: run.totalUif,
        employeeCount: run.employeeCount,
        processedOn: run.processedOn ? parseTimestamp(run.processedOn) : undefined,
      },
    });
  }
  console.log(`  -> ${payrollRuns.length} payroll runs ready`);

  console.log("Seeding payslips...");
  for (const payslip of payslips) {
    await prisma.payslip.upsert({
      where: { id: payslip.id },
      update: {},
      create: {
        id: payslip.id,
        tenantId: payslip.tenantId,
        runId: payslip.runId,
        employeeId: payslip.employeeId,
        period: payslip.period,
        payDate: new Date(payslip.payDate),
        basicSalary: payslip.basicSalary,
        earnings: payslip.earnings as unknown as Prisma.InputJsonValue,
        deductions: payslip.deductions as unknown as Prisma.InputJsonValue,
        grossPay: payslip.grossPay,
        totalDeductions: payslip.totalDeductions,
        netPay: payslip.netPay,
        paye: payslip.paye,
        uif: payslip.uif,
      },
    });
  }
  console.log(`  -> ${payslips.length} payslips ready`);

  console.log("Seeding activity feed...");
  for (const item of activityFeed) {
    await prisma.activityItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        tenantId: item.tenantId,
        type: item.type,
        message: item.message,
        actor: item.actor,
        employeeId: item.employeeId,
        timestamp: parseTimestamp(item.timestamp),
      },
    });
  }
  console.log(`  -> ${activityFeed.length} activity items ready`);

  console.log("Seeding notifications...");
  for (const item of notifications) {
    await prisma.notificationItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        tenantId: item.tenantId,
        title: item.title,
        description: item.description,
        timestamp: parseTimestamp(item.timestamp),
        read: item.read,
        type: item.type,
      },
    });
  }
  console.log(`  -> ${notifications.length} notifications ready`);

  console.log("Seeding demo accounts...");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to seed demo accounts",
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /**
   * Creates a confirmed Supabase Auth user for a demo persona, or returns the
   * id of the existing one if it was already created by a previous seed run.
   */
  async function ensureAuthUser(email: string, password: string): Promise<string> {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (!error) return data.user.id;

    if (error.code === "email_exists") {
      const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      const existing = list.users.find((u) => u.email === email);
      if (existing) return existing.id;
    }

    throw error;
  }

  for (const persona of demoUsers) {
    const authUserId = await ensureAuthUser(persona.email, persona.password);

    await prisma.user.upsert({
      where: { email: persona.email },
      update: {},
      create: {
        id: authUserId,
        tenantId: persona.tenantId,
        email: persona.email,
        name: persona.name,
        title: persona.title,
        role: persona.role,
        employeeId: persona.employeeId,
        avatarColor: persona.avatarColor,
        initials: persona.initials,
      },
    });
  }
  console.log(`  -> ${demoUsers.length} demo accounts ready`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
