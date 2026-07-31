-- Add South African employment categories to the EmploymentType enum.
-- Additive only: existing values (full_time, part_time, contract) are untouched,
-- so historic Employee rows keep their values. ADD VALUE IF NOT EXISTS is
-- idempotent and safe to re-run.
ALTER TYPE "EmploymentType" ADD VALUE IF NOT EXISTS 'temporary';
ALTER TYPE "EmploymentType" ADD VALUE IF NOT EXISTS 'casual';
ALTER TYPE "EmploymentType" ADD VALUE IF NOT EXISTS 'learnership';
ALTER TYPE "EmploymentType" ADD VALUE IF NOT EXISTS 'internship';
