"use server";

import { runAsTenant } from "@/lib/db-context";
import { requireRole, requireEmployeeScope } from "@/lib/auth/require";
import type { PerformanceReview, PerformanceReviewStatus } from "@/lib/types";

function mapReview(row: {
  id: string;
  tenantId: string;
  employeeId: string;
  cycle: string;
  reviewDate: Date;
  rating: number;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  reviewer: string;
  status: string;
  acknowledgedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}): PerformanceReview {
  return {
    id: row.id,
    tenantId: row.tenantId,
    employeeId: row.employeeId,
    cycle: row.cycle,
    reviewDate: row.reviewDate.toISOString(),
    rating: row.rating,
    strengths: row.strengths,
    improvements: row.improvements,
    goals: row.goals,
    reviewer: row.reviewer,
    status: row.status as PerformanceReviewStatus,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Performance reviews for one employee. Scoped via requireEmployeeScope so an
 * employee can read their own reviews (and their manager and HR can too).
 */
export async function getPerformanceReviewsAction(
  employeeId: string
): Promise<PerformanceReview[]> {
  const user = await requireEmployeeScope(employeeId);
  return runAsTenant(user.tenantId, async (tx) => {
    const rows = await tx.performanceReview.findMany({
      where: { tenantId: user.tenantId, employeeId },
      orderBy: { reviewDate: "desc" },
    });
    return rows.map(mapReview);
  });
}

export async function createPerformanceReviewAction(input: {
  employeeId: string;
  cycle: string;
  reviewDate: string;
  rating: number;
  strengths?: string;
  improvements?: string;
  goals?: string;
}): Promise<PerformanceReview> {
  const session = await requireRole("hr", "manager");
  const tenantId = session.tenantId;

  if (!input.employeeId || !input.cycle.trim() || !input.reviewDate) {
    throw new Error("Employee, cycle and review date are required.");
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be a whole number from 1 to 5.");
  }

  return runAsTenant(tenantId, async (tx) => {
    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, tenantId },
      select: { id: true, firstName: true, lastName: true, managerId: true },
    });
    if (!employee) throw new Error("Employee not found.");
    // A manager may only review their own direct reports; HR may review anyone.
    if (session.role === "manager" && employee.managerId !== session.employeeId) {
      throw new Error("You can only review your own team members.");
    }

    const row = await tx.performanceReview.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        cycle: input.cycle.trim(),
        reviewDate: new Date(input.reviewDate),
        rating: input.rating,
        strengths: input.strengths?.trim() || null,
        improvements: input.improvements?.trim() || null,
        goals: input.goals?.trim() || null,
        reviewer: session.name,
        createdBy: session.name,
      },
    });

    await tx.activityItem.create({
      data: {
        tenantId,
        type: "promotion",
        message: `recorded a performance review for ${employee.firstName} ${employee.lastName} (${input.cycle.trim()})`,
        actor: session.name,
      },
    });

    return mapReview(row);
  });
}

/** The reviewed employee acknowledges (signs off) their review. */
export async function acknowledgePerformanceReviewAction(
  reviewId: string
): Promise<PerformanceReview> {
  const user = await requireRole("employee", "manager", "hr", "exco");
  return runAsTenant(user.tenantId, async (tx) => {
    const review = await tx.performanceReview.findFirst({
      where: { id: reviewId, tenantId: user.tenantId },
    });
    if (!review) throw new Error("Review not found.");
    // Only the reviewed employee may acknowledge their own review.
    if (review.employeeId !== user.employeeId) {
      throw new Error("Only the reviewed employee can acknowledge this review.");
    }
    const row = await tx.performanceReview.update({
      where: { id: reviewId },
      data: { status: "acknowledged", acknowledgedAt: new Date() },
    });
    return mapReview(row);
  });
}

export async function deletePerformanceReviewAction(reviewId: string): Promise<void> {
  const session = await requireRole("hr");
  const tenantId = session.tenantId;
  return runAsTenant(tenantId, async (tx) => {
    const review = await tx.performanceReview.findFirst({ where: { id: reviewId, tenantId } });
    if (!review) throw new Error("Review not found.");
    await tx.performanceReview.delete({ where: { id: reviewId } });
  });
}
