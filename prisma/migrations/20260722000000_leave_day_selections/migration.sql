-- Add daySelections JSON column to LeaveRequest (nullable for backward compat)
ALTER TABLE "LeaveRequest" ADD COLUMN "daySelections" JSONB;
