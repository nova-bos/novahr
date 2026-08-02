"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, clientKey } from "@/lib/security/rate-limit";
import { friendlyAuthError } from "@/lib/errors";
import { getAppUrl } from "@/lib/app-url";
import { generateTenantId } from "@/lib/tenant/tenant-id";
import { formatMonthYear } from "@/lib/format";

const signupSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  yourName: z.string().min(2, "Your name is required"),
  jobTitle: z.string().max(120).optional(),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupInput = z.input<typeof signupSchema>;

export type CreateCompanyResult =
  | { status: "success" }
  | { status: "check-email" }
  | { status: "error"; message: string };

/**
 * "Sign your company up" flow: signs up a Supabase Auth user, then creates a
 * `Tenant` row for the new company and a `User` row for the signer-upper as
 * its first `hr` (admin) user. Tenant fields that aren't collected at signup
 * get sensible placeholders, editable later from Settings.
 */
export async function createCompanyAccount(input: SignupInput): Promise<CreateCompanyResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { companyName, yourName, jobTitle, email, password } = parsed.data;

  // Throttle new-company signups to curb spam. Keyed by client IP when
  // available, otherwise the submitted email.
  const ip = await clientKey();
  const rateKey = ip !== "unknown" ? ip : email.toLowerCase();
  const signupRate = await checkRateLimit(rateKey, { name: "signup", limit: 5, windowMs: 60 * 60 * 1000 });
  if (!signupRate.allowed) {
    return {
      status: "error",
      message: "Too many sign-up attempts. Please wait a few minutes and try again.",
    };
  }

  const supabase = await createClient();
  const appUrl = await getAppUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  });
  if (error) {
    return { status: "error", message: friendlyAuthError(error) };
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

  // New companies start on a 14-day full-feature trial.
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        id: generateTenantId(companyName),
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
        plan: "trial",
        trialEndsAt,
      },
    });

    await tx.user.create({
      data: {
        id: data.user!.id,
        tenantId: tenant.id,
        email,
        name: yourName,
        title: jobTitle?.trim() || "",
        role: "hr",
        avatarColor: "#4C6FFF",
        initials: deriveInitials(yourName),
      },
    });
    await tx.tenantMembership.create({
      data: { userId: data.user!.id, tenantId: tenant.id, role: "hr", title: jobTitle?.trim() || "" },
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

export async function completeGoogleSignup(
  companyName: string,
  agreedToTerms: boolean
): Promise<CreateCompanyResult> {
  const name = companyName.trim();
  if (name.length < 2) {
    return { status: "error", message: "Company name must be at least 2 characters." };
  }
  if (!agreedToTerms) {
    return {
      status: "error",
      message: "Please accept the Terms of Service, Privacy Policy and Data Processing Agreement to continue.",
    };
  }

  const googleRate = await checkRateLimit(await clientKey(), { name: "signup", limit: 5, windowMs: 60 * 60 * 1000 });
  if (!googleRate.allowed) {
    return {
      status: "error",
      message: "Too many sign-up attempts. Please wait a few minutes and try again.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { status: "error", message: "Session expired. Please sign in again." };
  }

  const { user } = data;
  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (existing) return { status: "success" };

  const yourName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Admin";
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        id: generateTenantId(name),
        name,
        legalName: name,
        initials: deriveInitials(name),
        industry: "General",
        color: "#4C6FFF",
        founded: String(new Date().getFullYear()),
        registrationNumber: "",
        vatNumber: "",
        address: "",
        city: "",
        bankName: "",
        primaryContact: yourName,
        plan: "trial",
        trialEndsAt,
      },
    });

    await tx.user.create({
      data: {
        id: user.id,
        tenantId: tenant.id,
        email: user.email!,
        name: yourName,
        title: "",
        role: "hr",
        avatarColor: "#4C6FFF",
        initials: deriveInitials(yourName),
      },
    });
    await tx.tenantMembership.create({
      data: { userId: user.id, tenantId: tenant.id, role: "hr", title: "" },
    });

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const payDay = 25;
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

  return { status: "success" };
}

function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
