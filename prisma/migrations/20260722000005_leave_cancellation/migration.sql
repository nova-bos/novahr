-- AlterEnum
ALTER TYPE "LeaveStatus" ADD VALUE 'cancelled';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'leave_cancelled';

-- AlterTable
ALTER TABLE "LeaveRequest"
  ADD COLUMN "cancelledBy" TEXT,
  ADD COLUMN "cancelledOn" TIMESTAMP(3);
