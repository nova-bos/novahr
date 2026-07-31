-- Migration: rate_limit
-- Additive only: introduces the RateLimit table backing the shared, cross
-- instance security rate limiter. No existing tables or columns are altered
-- or dropped.

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
