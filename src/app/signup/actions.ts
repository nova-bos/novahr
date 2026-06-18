"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatMonthYear } from "@/lib/format";

const signupSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  yourName: z.string().min(2, "Your name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.input<typeof signupSchema>;

export type CreateCompanyResult =
  | { status: "success" }
  | { status: "check-email" }
  | { status: "error"; message: string };

/**
 * "Create your company" flow: signs up a Supabase Auth user, then creates a
 * `Tenant` row for the new company and a `User` row for the signer-upper as
 * its first `hr` (admin) user. Tenant fields that aren't collected at signup
 * get sensible placeholders, editable later from Settings.
 */
export async function createCompanyAccount(input: SignupInput): Promise<CreateCompanyResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { companyName, yourName, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { status: "error", message: error.message };
  }
  if (!data.user) {
    return { status: "error", message: "Couldn't create your account. Please try again." };
  }
  // Supabase returns success with an empty `identities` array (no error, for
  // security) if the email already belongs to an existing account.
  if (data.user.identities && data.user.identities.length === 0) {
    return {
      status: "error",
      message: "An account with this email already exists. Try signing in instead.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        legalName: companyName,
        initials: deriveInitials(companyName),
        industry: "General",
        color: "#4C6FFF",
        founded: String(new Date().getFullYear()),
        registrationNumber: "",
        vatNumber: "",
        address: "",
        city: "",
        bankName: "",
        primaryContact: yourName,
      },
    });

    await tx.user.create({
      data: {
        id: data.user!.id,
        tenantId: tenant.id,
        email,
        name: yourName,
        title: "HR Administrator",
        role: "hr",
        avatarColor: "#4C6FFF",
        initials: deriveInitials(yourName),
      },
    });

    // Create the first scheduled payroll run so the payroll page is never empty.
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const payDay = 25; // matches Prisma default
    const payDate = new Date(`${period}-${String(payDay).padStart(2, "0")}`);
    await tx.payrollRun.create({
      data: {
        id: `${tenant.id}-run-${period}`,
        tenantId: tenant.id,
        period,
        label: `${formatMonthYear(period)} Payroll`,
        payDate,
        status: "scheduled",
        employeeCount: 0,
      },
    });
  });

  return data.session ? { status: "success" } : { status: "check-email" };
}

function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
