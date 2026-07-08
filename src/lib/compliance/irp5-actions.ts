"use server";

import { ComplianceType } from "@prisma/client";
import { runAsTenant } from "@/lib/db-context";
import { requireTenant } from "@/lib/auth/require";
import { buildIrp5, taxYearPeriods, type Irp5Certificate, type Irp5Input } from "./irp5";

/** The interim reconciliation half (1 March to 31 August). */
function interimPeriods(taxYear: string): string[] {
  return taxYearPeriods(taxYear).slice(0, 6);
}

type Irp5Bucket = keyof Irp5Input;

/**
 * Maps a normalised PayrollItem label to its IRP5 aggregation bucket. Items
 * that do not map to a certificate source code (unpaid leave, garnishees,
 * loans) return null and are excluded.
 */
function bucketForItem(itemType: string, label: string): Irp5Bucket | null {
  const l = label.toLowerCase();
  if (itemType === "earning") {
    if (l.includes("travel")) return "travelAllowance";
    if (l.includes("bonus") || l.includes("13th") || l.includes("annual")) return "annualPayment";
    if (l.includes("commission")) return "commission";
    if (l.includes("basic") || l.includes("overtime") || l.includes("salary")) return "income";
    return "otherAllowances";
  }
  if (l.includes("paye")) return "paye";
  if (l.includes("uif")) return "uif";
  if (l.includes("pension") || l.includes("retirement")) return "pension";
  if (l.includes("medical")) return "medicalAid";
  return null;
}

function emptyInput(): Irp5Input {
  return {
    income: 0,
    annualPayment: 0,
    commission: 0,
    travelAllowance: 0,
    otherAllowances: 0,
    pension: 0,
    medicalAid: 0,
    paye: 0,
    uif: 0,
  };
}

export interface EmployeeCertificate {
  employeeId: string;
  employeeNumber: string;
  name: string;
  idNumber: string;
  taxNumber: string;
  taxYear: string;
  certificate: Irp5Certificate;
}

/**
 * Builds an IRP5/IT3(a) certificate for every employee with payslips in the
 * given tax year, aggregating their normalised PayrollItem rows by source code.
 */
export async function getTaxYearCertificatesAction(
  tenantId: string,
  taxYear: string
): Promise<EmployeeCertificate[]> {
  await requireTenant(tenantId, "hr");
  const periods = taxYearPeriods(taxYear);

  return runAsTenant(tenantId, async (tx) => {
    // Aggregate from payslips (every completed run writes one per employee), not
    // the normalised PayrollItem table which is only populated for app-completed
    // runs and would silently undercount historical months. Basic salary is a
    // column; allowances and statutory deductions live in the JSON line items.
    const payslips = await tx.payslip.findMany({
      where: { tenantId, period: { in: periods } },
      select: {
        employeeId: true,
        basicSalary: true,
        earnings: true,
        deductions: true,
        employee: {
          select: {
            employeeNumber: true,
            firstName: true,
            lastName: true,
            idNumber: true,
            taxNumber: true,
          },
        },
      },
    });

    const byEmployee = new Map<
      string,
      { input: Irp5Input; meta: (typeof payslips)[number]["employee"] }
    >();

    const asLines = (v: unknown): { label: string; amount: number }[] =>
      Array.isArray(v) ? (v as { label: string; amount: number }[]) : [];

    for (const slip of payslips) {
      let entry = byEmployee.get(slip.employeeId);
      if (!entry) {
        entry = { input: emptyInput(), meta: slip.employee };
        byEmployee.set(slip.employeeId, entry);
      }
      // Basic salary (and overtime) map to income code 3601.
      entry.input.income += slip.basicSalary.toNumber();
      for (const line of asLines(slip.earnings)) {
        const bucket = bucketForItem("earning", line.label);
        if (bucket) entry.input[bucket] += line.amount;
      }
      for (const line of asLines(slip.deductions)) {
        const bucket = bucketForItem("deduction", line.label);
        if (bucket) entry.input[bucket] += line.amount;
      }
    }

    const certificates: EmployeeCertificate[] = [];
    for (const [employeeId, { input, meta }] of byEmployee) {
      certificates.push({
        employeeId,
        employeeNumber: meta.employeeNumber,
        name: `${meta.firstName} ${meta.lastName}`,
        idNumber: meta.idNumber,
        taxNumber: meta.taxNumber,
        taxYear,
        certificate: buildIrp5(input),
      });
    }
    certificates.sort((a, b) => a.name.localeCompare(b.name));
    return certificates;
  });
}

export interface Emp501Reconciliation {
  taxYear: string;
  /** Summed from the monthly EMP201 declarations. */
  declared: { paye: number; uif: number; sdl: number; eti: number };
  /** Summed from the IRP5/IT3(a) certificates. */
  certified: { paye: number; uif: number };
  /** declared minus certified. Zero means the reconciliation balances. */
  difference: { paye: number; uif: number };
  interim: { declaredPaye: number };
  certificateCount: number;
  irp5Count: number;
  it3aCount: number;
}

/**
 * Reconciles the tax year: the sum of the monthly EMP201 declarations against
 * the sum of the IRP5/IT3(a) certificates. A non-zero difference flags a
 * mismatch to investigate before filing the EMP501.
 */
export async function getEmp501ReconciliationAction(
  tenantId: string,
  taxYear: string
): Promise<Emp501Reconciliation> {
  await requireTenant(tenantId, "hr");
  const periods = taxYearPeriods(taxYear);
  const interim = new Set(interimPeriods(taxYear));

  const certificates = await getTaxYearCertificatesAction(tenantId, taxYear);

  return runAsTenant(tenantId, async (tx) => {
    const emp201s = await tx.complianceRecord.findMany({
      where: { tenantId, type: ComplianceType.emp201, period: { in: periods } },
      select: { period: true, totalPaye: true, totalUif: true, totalSdl: true, totalEti: true },
    });

    const declared = { paye: 0, uif: 0, sdl: 0, eti: 0 };
    let interimPaye = 0;
    for (const r of emp201s) {
      declared.paye += r.totalPaye.toNumber();
      declared.uif += r.totalUif.toNumber();
      declared.sdl += r.totalSdl.toNumber();
      declared.eti += r.totalEti.toNumber();
      if (interim.has(r.period)) interimPaye += r.totalPaye.toNumber();
    }

    const certified = { paye: 0, uif: 0 };
    let irp5Count = 0;
    let it3aCount = 0;
    for (const c of certificates) {
      certified.paye += c.certificate.paye;
      certified.uif += c.certificate.uif;
      if (c.certificate.type === "IRP5") irp5Count++;
      else it3aCount++;
    }

    const round2 = (v: number) => Math.round(v * 100) / 100;
    return {
      taxYear,
      declared: {
        paye: round2(declared.paye),
        uif: round2(declared.uif),
        sdl: round2(declared.sdl),
        eti: round2(declared.eti),
      },
      certified: { paye: round2(certified.paye), uif: round2(certified.uif) },
      difference: {
        paye: round2(declared.paye - certified.paye),
        uif: round2(declared.uif - certified.uif),
      },
      interim: { declaredPaye: round2(interimPaye) },
      certificateCount: certificates.length,
      irp5Count,
      it3aCount,
    };
  });
}
