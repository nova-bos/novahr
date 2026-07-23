-- Persist employer-side contributions (UIF and SDL) on each payslip.
-- Informational only: not deducted from employee net pay, but surfaced on
-- statutory payslip templates and used for EMP201 reconciliation.
-- Nullable so payslips created before this migration map cleanly.
ALTER TABLE "Payslip" ADD COLUMN "employerUif" DECIMAL(15,2);
ALTER TABLE "Payslip" ADD COLUMN "employerSdl" DECIMAL(15,2);

-- Employer-paid benefits (e.g. employer-owned income protection). Taxable
-- benefits are fringe benefits added to remuneration for PAYE, SDL, and UIF.
-- Configured per employee; snapshotted onto each payslip at run time.
ALTER TABLE "Employee" ADD COLUMN "salaryEmployerBenefits" JSONB;
ALTER TABLE "Payslip" ADD COLUMN "employerBenefits" JSONB;

-- Outstanding loan/garnishee balances remaining after this run's instalment,
-- snapshotted onto the payslip as a closing-balance summary.
ALTER TABLE "Payslip" ADD COLUMN "closingBalances" JSONB;
