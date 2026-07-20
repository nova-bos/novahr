-- Record the retirement annuity on salary-change history snapshots.
ALTER TABLE "EmployeeSalaryHistory" ADD COLUMN "retirementAnnuity" DECIMAL(15,2);
