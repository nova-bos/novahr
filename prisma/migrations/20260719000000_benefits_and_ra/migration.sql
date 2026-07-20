-- Company-level benefit toggles: whether the business offers a pension /
-- provident fund and/or a medical aid contribution. Both default off so a new
-- SME that only wants payroll is not opted into either.
ALTER TABLE "PayrollSettings" ADD COLUMN "offersPension" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PayrollSettings" ADD COLUMN "offersMedicalAid" BOOLEAN NOT NULL DEFAULT false;

-- Optional per-employee retirement annuity (personal RA processed through
-- payroll). Nullable; contributes to the s11F retirement deduction cap.
ALTER TABLE "Employee" ADD COLUMN "salaryRetirementAnnuity" DECIMAL(15,2);
