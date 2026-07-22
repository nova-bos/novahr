-- CreateEnum
CREATE TYPE "PayslipLogoAlignment" AS ENUM ('left', 'center', 'right');

-- AlterTable
ALTER TABLE "PayrollSettings" ADD COLUMN "payslipLogoAlignment" "PayslipLogoAlignment" NOT NULL DEFAULT 'left';
