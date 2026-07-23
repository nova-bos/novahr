-- PAYE transparency: store the annual taxable income the SARS tables were
-- applied to and the annual rebate subtracted, so the payslip can show
-- employees how their PAYE was derived. Nullable; older payslips omit it.
ALTER TABLE "Payslip" ADD COLUMN "taxableIncomeAnnual" DECIMAL(15,2);
ALTER TABLE "Payslip" ADD COLUMN "taxRebateAnnual" DECIMAL(15,2);
