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
      const run = await tx.payrollRun.findFirst({ where: { id: payrollRunId, tenantId } });
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
      const run = await tx.payrollRun.findFirst({ where: { id: payrollRunId, tenantId } });
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

// A pending ledger row older than this is treated as a crashed attempt and
// released so the batch can be retried.
const SUBMISSION_STALE_MS = 10 * 60 * 1000;

export async function submitNetcashBatchAction(
  tenantId: string,
  payrollRunId: string
): Promise<{ token: string; error?: string }> {
  const session = await requireTenant(tenantId, "hr");
  try {
    // Phase 1: load the run and claim a submission ledger row in one
    // transaction. The ledger makes the action idempotent: a run that was
    // already submitted, or has a submission in flight, is refused.
    const result = await runAsTenant(tenantId, async (tx) => {
      const run = await tx.payrollRun.findFirst({ where: { id: payrollRunId, tenantId } });
      if (!run) return { error: "Payroll run not found." as const };

      const priorNif = await tx.bankExport.findFirst({
        where: { tenantId, payrollRunId, fileFormat: "nif", status: { in: ["pending", "exported"] } },
        orderBy: { createdAt: "desc" },
      });
      if (priorNif?.status === "exported") {
        return {
          error: `This payroll was already submitted to Netcash on ${priorNif.exportedAt?.toISOString().slice(0, 10) ?? "a previous date"}. Submitting again would pay employees twice.` as const,
        };
      }
      if (priorNif?.status === "pending") {
        const ageMs = Date.now() - priorNif.createdAt.getTime();
        if (ageMs < SUBMISSION_STALE_MS) {
          return { error: "A submission for this payroll is already in progress. Wait a few minutes before retrying." as const };
        }
        // Stale claim from a crashed attempt: release it and continue.
        await tx.bankExport.update({
          where: { id: priorNif.id },
          data: { status: "cancelled", notes: "Superseded: previous attempt did not complete." },
        });
      }

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
      if (payslips.length === 0) return { error: "This payroll run has no payslips to pay." as const };

      const ledger = await tx.bankExport.create({
        data: {
          tenantId,
          payrollRunId,
          status: "pending",
          fileFormat: "nif",
          totalAmount: payslips.reduce((s, p) => s + p.netPay, 0),
          paymentCount: payslips.length,
          bankName: "Netcash",
          approvedBy: session.name,
          notes: "Netcash NIF submission in progress",
        },
      });

      return { run, payslips, ledgerId: ledger.id };
    });

    if ("error" in result) return { token: "", error: result.error };

    const { run, payslips, ledgerId } = result;
    const keys = await getNetcashServiceKeys(tenantId);

    if (!keys.salaryKey) {
      await releaseLedger(tenantId, ledgerId, "No Netcash salary key configured.");
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

    // Phase 2: submit outside the transaction so the network call does not
    // hold a database transaction open.
    const submitResult = await submitNifBatch(keys.salaryKey, nif);

    // Phase 3: record the outcome on the ledger row.
    if (submitResult.error) {
      await releaseLedger(tenantId, ledgerId, submitResult.error);
      return submitResult;
    }
    await runAsTenant(tenantId, async (tx) => {
      await tx.bankExport.update({
        where: { id: ledgerId },
        data: {
          status: "exported",
          exportedAt: new Date(),
          notes: `Netcash file token: ${submitResult.token}`,
        },
      });
      await tx.activityItem.create({
        data: {
          tenantId,
          type: "payroll_run",
          message: `submitted ${run.period} salary batch to Netcash (${payslips.length} payments)`,
          actor: session.name,
        },
      });
    });
    return submitResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { token: "", error: message };
  }
}

async function releaseLedger(tenantId: string, ledgerId: string, reason: string): Promise<void> {
  try {
    await runAsTenant(tenantId, async (tx) => {
      await tx.bankExport.update({
        where: { id: ledgerId },
        data: { status: "cancelled", notes: `Failed: ${reason.slice(0, 400)}` },
      });
    });
  } catch {
    // The ledger row will be released by the stale-claim check on retry.
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
