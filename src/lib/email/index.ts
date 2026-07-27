import { Resend } from "resend";
import { leaveTypeLabel, formatDate, formatMonthYear, formatCurrency } from "@/lib/format";
import type { LeaveType } from "@/lib/types";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

/** Escapes user-provided strings before interpolating them into email HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FROM = process.env.EMAIL_FROM ?? "NovaHR <no-reply@novabos.co.za>";

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#18181b;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">NovaHR</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f1f1f1;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#71717a;">This is an automated notification from NovaHR. Please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function pill(text: string, color: string): string {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600;background:${color};">${text}</span>`;
}

interface LeaveRequestEmailArgs {
  recipientEmails: string[];
  employeeName: string;
  leaveType: LeaveType;
  days: number;
  startDate: string;
  endDate: string;
  reason: string;
  appUrl?: string;
}

export async function sendLeaveRequestEmail(args: LeaveRequestEmailArgs): Promise<void> {
  const client = getResend();
  if (!client || args.recipientEmails.length === 0) return;

  const label = leaveTypeLabel(args.leaveType);
  const dayWord = args.days === 1 ? "day" : "days";
  const appUrl = args.appUrl ?? "https://novabos.co.za";

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">New leave request</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">${esc(args.employeeName)} has submitted a leave request that needs your review.</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9fb;border-radius:8px;padding:20px 20px 4px;">
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Employee</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#18181b;">${esc(args.employeeName)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Leave type</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${label} ${pill(`${args.days} ${dayWord}`, "#f4f4f5")}</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Dates</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${formatDate(args.startDate)} to ${formatDate(args.endDate)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:20px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${esc(args.reason)}</p>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;">
      <a href="${appUrl}/leave" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Review in NovaHR</a>
    </p>
  `;

  try {
    await client.emails.send({
      from: FROM,
      to: args.recipientEmails,
      subject: `Leave request from ${args.employeeName} (${args.days} ${dayWord} of ${label.toLowerCase()})`,
      html: baseLayout(`Leave request: ${esc(args.employeeName)}`, body),
    });
  } catch (err) {
    // Email failure must never break the main action
    console.error("[email] sendLeaveRequestEmail failed", err);
  }
}

interface LeaveDecisionEmailArgs {
  recipientEmail: string;
  employeeName: string;
  leaveType: LeaveType;
  days: number;
  startDate: string;
  endDate: string;
  status: "approved" | "rejected";
  decidedBy: string;
  decisionNote?: string;
  appUrl?: string;
}

export async function sendLeaveDecisionEmail(args: LeaveDecisionEmailArgs): Promise<void> {
  const client = getResend();
  if (!client) return;

  const label = leaveTypeLabel(args.leaveType).toLowerCase();
  const dayWord = args.days === 1 ? "day" : "days";
  const appUrl = args.appUrl ?? "https://novabos.co.za";

  const isApproved = args.status === "approved";
  const statusColor = isApproved ? "#dcfce7" : "#fee2e2";
  const statusTextColor = isApproved ? "#166534" : "#991b1b";
  const statusLabel = isApproved ? "Approved" : "Rejected";

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Your leave request has been ${isApproved ? "approved" : "rejected"}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Hi ${esc(args.employeeName.split(" ")[0])}, here is the outcome of your recent leave request.</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9fb;border-radius:8px;padding:20px 20px 4px;">
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Decision</p>
          <p style="margin:4px 0 0;">
            <span style="display:inline-block;padding:3px 10px;border-radius:9999px;font-size:13px;font-weight:700;background:${statusColor};color:${statusTextColor};">${statusLabel}</span>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Leave type</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${leaveTypeLabel(args.leaveType)} (${args.days} ${dayWord})</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Dates</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${formatDate(args.startDate)} to ${formatDate(args.endDate)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Decided by</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${esc(args.decidedBy)}</p>
        </td>
      </tr>
      ${args.decisionNote ? `
      <tr>
        <td style="padding-bottom:20px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Note</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${esc(args.decisionNote)}</p>
        </td>
      </tr>` : `<tr><td style="padding-bottom:6px;"></td></tr>`}
    </table>

    <p style="margin:28px 0 0;">
      <a href="${appUrl}/leave" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View in NovaHR</a>
    </p>
  `;

  try {
    await client.emails.send({
      from: FROM,
      to: args.recipientEmail,
      subject: `Your ${label} request has been ${isApproved ? "approved" : "rejected"}`,
      html: baseLayout(`Leave ${isApproved ? "approved" : "rejected"}`, body),
    });
  } catch (err) {
    // Email failure must never break the main action
    console.error("[email] sendLeaveDecisionEmail failed", err);
  }
}

interface InviteEmailArgs {
  recipientEmail: string;
  recipientName: string;
  inviterName: string;
  companyName: string;
  roleLabel: string;
  inviteUrl: string;
}

export async function sendInviteEmail(args: InviteEmailArgs): Promise<boolean> {
  const client = getResend();
  if (!client) return false;

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">You've been invited to ${esc(args.companyName)}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Hi ${esc(args.recipientName.split(" ")[0])}, ${esc(args.inviterName)} has invited you to join ${esc(args.companyName)} on NovaHR as ${esc(args.roleLabel)}.</p>

    <p style="margin:0 0 8px;font-size:15px;color:#52525b;">Click the button below to set your password and activate your account. This link expires in 7 days.</p>

    <p style="margin:28px 0 0;">
      <a href="${args.inviteUrl}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Accept invitation</a>
    </p>

    <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">If the button doesn't work, copy this link into your browser:<br/>${args.inviteUrl}</p>
  `;

  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: args.recipientEmail,
      subject: `${args.inviterName} invited you to join ${args.companyName} on NovaHR`,
      html: baseLayout(`Invitation to ${esc(args.companyName)}`, body),
    });
    if (error) {
      console.error("[email] sendInviteEmail rejected by Resend:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] sendInviteEmail threw:", err);
    return false;
  }
}

interface ContactFormEmailArgs {
  name: string;
  email: string;
  company?: string;
  message: string;
}

const SUPPORT_INBOX = process.env.SUPPORT_EMAIL ?? "support@novabos.co.za";

export async function sendContactFormEmail(args: ContactFormEmailArgs): Promise<void> {
  const client = getResend();
  if (!client) return;

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">New contact form submission</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Someone submitted the contact form on the NovaHR website.</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9fb;border-radius:8px;padding:20px 20px 4px;">
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Name</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${esc(args.name)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Email</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;"><a href="mailto:${esc(args.email)}" style="color:#18181b;">${esc(args.email)}</a></p>
        </td>
      </tr>
      ${args.company ? `
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Company</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${esc(args.company)}</p>
        </td>
      </tr>` : ""}
      <tr>
        <td style="padding-bottom:20px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;white-space:pre-wrap;">${esc(args.message)}</p>
        </td>
      </tr>
    </table>
  `;

  try {
    await client.emails.send({
      from: FROM,
      to: SUPPORT_INBOX,
      replyTo: args.email,
      subject: `New enquiry from ${args.name}${args.company ? ` (${args.company})` : ""}`,
      html: baseLayout("New contact form submission", body),
    });
  } catch (err) {
    // Email failure must never break the caller
    console.error("[email] sendContactFormEmail failed", err);
  }
}

interface PayslipEmailArgs {
  recipientEmail: string;
  employeeName: string;
  period: string;
  netPay: number;
  appUrl?: string;
}

export async function sendPayslipEmail(args: PayslipEmailArgs): Promise<void> {
  const client = getResend();
  if (!client) return;

  const periodLabel = formatMonthYear(args.period);
  const appUrl = args.appUrl ?? "https://novabos.co.za";

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Your ${periodLabel} payslip is ready</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#52525b;">Hi ${esc(args.employeeName.split(" ")[0])}, your payslip for ${periodLabel} has been published.</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9fb;border-radius:8px;padding:20px 20px 4px;">
      <tr>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Pay period</p>
          <p style="margin:4px 0 0;font-size:15px;color:#18181b;">${periodLabel}</p>
        </td>
      </tr>
      <tr>
        <td style="padding-bottom:20px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">Net pay</p>
          <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#18181b;">${formatCurrency(args.netPay)}</p>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;">
      <a href="${appUrl}/payroll" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View payslip</a>
    </p>
  `;

  try {
    await client.emails.send({
      from: FROM,
      to: args.recipientEmail,
      subject: `Your ${periodLabel} payslip is ready`,
      html: baseLayout(`${periodLabel} payslip`, body),
    });
  } catch (err) {
    // Email failure must never break the main action
    console.error("[email] sendPayslipEmail failed", err);
  }
}
