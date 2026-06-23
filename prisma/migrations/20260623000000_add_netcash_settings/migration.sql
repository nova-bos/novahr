-- AlterTable: add Netcash integration fields and statutory reference numbers to PayrollSettings
ALTER TABLE "PayrollSettings" ADD COLUMN "netcashServiceKey" TEXT;
ALTER TABLE "PayrollSettings" ADD COLUMN "netcashInstruction" TEXT NOT NULL DEFAULT 'DatedSalaries';
ALTER TABLE "PayrollSettings" ADD COLUMN "payeReferenceNumber" TEXT;
ALTER TABLE "PayrollSettings" ADD COLUMN "uifReferenceNumber" TEXT;
ALTER TABLE "PayrollSettings" ADD COLUMN "sdlReferenceNumber" TEXT;
