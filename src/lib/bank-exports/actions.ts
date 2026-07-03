"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";
import { generateNifFile, submitNifBatch, type NifInstruction } from "@/lib/bank-exports/netcash";
import { getNetcashServiceKeys } from "@/lib/settings/actions";

export async function generateBankExportCsvAction(
  tenantId: string,
  payrollRunId: string
): Promise<{ csv: string; filename: string; error?: string }> {
  await requireTenant(tenantId, "hr");
  try {
    const result = await runAsTenant(tenantId, async (tx) => {
      const run = await tx.payrollRun.findUnique({ where: { id: payrollRunId } });
      if (!run) return null;

      const payslips = await tx.payslip.findMany({
        where: { runId: payrollRunId },
        include: {
          employee: {
            select: {
              employeeNumber: true,
              firstName: true,
              lastName: true,
              bankName: true,
              bankAccountNumber: true,
              bankBranchCode: true,
              bankAccountType: true,
            },
          },
        },
      });

      return { run, payslips };
    });

    if (!result) {
      return { csv: "", filename: "", error: "Payroll run not found." };
    }

    const { run, payslips } = result;

    const header = `"Employee No","Employee Name","Bank","Account Number","Branch Code","Account Type","Net Pay"`;
    const rows = payslips.map((p) => {
      const emp = p.employee;
      const name = `${emp.firstName} ${emp.lastName}`;
      return [
        `"${emp.employeeNumber}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${emp.bankName.replace(/"/g, '""')}"`,
        `"${emp.bankAccountNumber}"`,
        `"${emp.bankBranchCode}"`,
        `"${emp.bankAccountType}"`,
        `"${p.netPay.toFixed(2)}"`,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const filename = `payroll-export-${run.period}.csv`;

    return { csv, filename };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { csv: "", filename: "", error: message };
  }
}

export async function generateNetcashNifAction(
  tenantId: string,
  payrollRunId: string
): Promise<{ nif: string; filename: string; error?: string }> {
  await requireTenant(tenantId, "hr");
  try {
    const result = await runAsTenant(tenantId, async (tx) => {
      const run = await tx.payrollRun.findUnique({ where: { id: payrollRunId } });
      if (!run) return null;

      const settings = await tx.payrollSettings.findUnique({ where: { tenantId } });

      const payslips = await tx.payslip.findMany({
        where: { runId: payrollRunId },
        include: {
          employee: {
            select: {
              employeeNumber: true,
              firstName: true,
              lastName: true,
              bankAccountNumber: true,
              bankBranchCode: true,
              bankAccountType: true,
            },
          },
        },
      });

      return { run, settings, payslips };
    });

    if (!result) return { nif: "", filename: "", error: "Payroll run not found." };

    const { run, settings, payslips } = result;

    const serviceKey = "";
    const instruction = (settings?.netcashInstruction ?? "DatedSalaries") as NifInstruction;
    const batchName = `NovaHR-${run.period}`;

    const nif = generateNifFile({
      serviceKey,
      instruction,
      batchName,
      actionDate: run.payDate,
      employees: payslips.map((p) => ({
        employeeNumber: p.employee.employeeNumber,
        firstName: p.employee.firstName,
        lastName: p.employee.lastName,
        bankAccountNumber: p.employee.bankAccountNumber,
        bankBranchCode: p.employee.bankBranchCode,
        bankAccountType: p.employee.bankAccountType,
        netPay: p.netPay,
      })),
    });

    const filename = `netcash-nif-${run.period}.txt`;
    return { nif, filename };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { nif: "", filename: "", error: message };
  }
}

export async function submitNetcashBatchAction(
  tenantId: string,
  payrollRunId: string
): Promise<{ token: string; error?: string }> {
  await requireTenant(tenantId, "hr");
  try {
    const result = await runAsTenant(tenantId, async (tx) => {
      const run = await tx.payrollRun.findUnique({ where: { id: payrollRunId } });
      if (!run) return null;

      const payslips = await tx.payslip.findMany({
        where: { runId: payrollRunId },
        include: {
          employee: {
            select: {
              employeeNumber: true,
              firstName: true,
              lastName: true,
              bankAccountNumber: true,
              bankBranchCode: true,
              bankAccountType: true,
            },
          },
        },
      });

      return { run, payslips };
    });

    if (!result) return { token: "", error: "Payroll run not found." };

    const { run, payslips } = result;
    const keys = await getNetcashServiceKeys(tenantId);

    if (!keys.salaryKey) {
      return { token: "", error: "No Netcash salary key configured. Add it in Settings > Payroll > Netcash." };
    }

    const nif = generateNifFile({
      serviceKey: keys.salaryKey,
      instruction: (keys.instruction ?? "DatedSalaries") as NifInstruction,
      batchName: `NovaHR-${run.period}`,
      actionDate: run.payDate,
      employees: payslips.map((p) => ({
        employeeNumber: p.employee.employeeNumber,
        firstName: p.employee.firstName,
        lastName: p.employee.lastName,
        bankAccountNumber: p.employee.bankAccountNumber,
        bankBranchCode: p.employee.bankBranchCode,
        bankAccountType: p.employee.bankAccountType,
        netPay: p.netPay,
      })),
    });

    return submitNifBatch(keys.salaryKey, nif);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { token: "", error: message };
  }
}

export async function createBankExportRecordAction(
  tenantId: string,
  payrollRunId: string,
  data: { totalAmount: number; paymentCount: number; approvedBy?: string }
): Promise<{ id: string; error?: string }> {
  await requireTenant(tenantId, "hr");
  try {
    const record = await runAsTenant(tenantId, async (tx) => {
      return tx.bankExport.create({
        data: {
          tenantId,
          payrollRunId,
          status: "exported",
          totalAmount: data.totalAmount,
          paymentCount: data.paymentCount,
          approvedBy: data.approvedBy,
          exportedAt: new Date(),
          fileFormat: "csv",
        },
      });
    });
    return { id: record.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { id: "", error: message };
  }
}
