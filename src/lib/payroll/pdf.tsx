/* eslint-disable jsx-a11y/alt-text -- react-pdf's Image renders into a PDF, not the DOM; alt does not exist on it */
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import { formatCurrency, formatDate, formatMonthYear, leaveTypeLabel } from "@/lib/format";
import type { Employee, LeaveBalance, Payslip } from "@/lib/types";
import type { PayslipYtd } from "./ytd";

export type LogoAlignment = "left" | "center" | "right";

export interface PayslipDocumentProps {
  employee: Employee;
  payslip: Payslip;
  companyName?: string;
  companyAddress?: string;
  companyRegistration?: string;
  logoUrl?: string;
  logoAlignment?: LogoAlignment;
  accentColor?: string;
  template?: string;
  footerNote?: string;
  showBanking?: boolean;
  showYtd?: boolean;
  payeReference?: string;
  uifReference?: string;
  sdlReference?: string;
  /** Real year-to-date figures. When present and showYtd is on, a YTD column renders. */
  ytd?: PayslipYtd;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function maskId(id: string): string {
  if (!id || id.length <= 6) return id || "-";
  return `******${id.slice(-6)}`;
}

function maskAccount(account: string): string {
  if (!account || account.length <= 4) return account || "-";
  return `****${account.slice(-4)}`;
}

function flexForAlignment(a: LogoAlignment): "flex-start" | "center" | "flex-end" {
  return a === "center" ? "center" : a === "right" ? "flex-end" : "flex-start";
}

function textAlignFor(a: LogoAlignment): "left" | "center" | "right" {
  return a;
}

// SARS tax year label for a "YYYY-MM" period (tax year starts in March).
function taxYearLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const start = m >= 3 ? y : y - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

// Plain-language explanation of how PAYE was derived, shown on every template.
// Returns null for payslips generated before the tax basis was captured.
function payeNoteText(payslip: Payslip): string | null {
  if (payslip.taxableIncomeAnnual == null) return null;
  const rebate = payslip.taxRebateAnnual
    ? `, less a tax rebate of ${formatCurrency(payslip.taxRebateAnnual)}`
    : "";
  return `How your PAYE was calculated: the SARS ${taxYearLabel(payslip.period)} tax tables were applied to an annual taxable income of ${formatCurrency(payslip.taxableIncomeAnnual)}${rebate}, then apportioned to this pay period.`;
}

// Leave balances worth surfacing on a payslip, in display order.
const PAYSLIP_LEAVE_TYPES = ["annual", "sick", "family"] as const;

interface LeaveSummaryRow {
  label: string;
  balance: number;
  taken: number;
}

function summariseLeave(balances: LeaveBalance[]): LeaveSummaryRow[] {
  return PAYSLIP_LEAVE_TYPES.map((type) => {
    const b = balances.find((x) => x.type === type);
    if (!b) return null;
    const entitlement = b.accrued ?? b.total;
    return { label: leaveTypeLabel(type), balance: Math.max(0, entitlement - b.used), taken: b.used };
  }).filter((x): x is LeaveSummaryRow => x !== null);
}

// ─── CLASSIC TEMPLATE · "The Ledger" ─────────────────────────────────────────
// Monochrome, print-first. Labelled identity grid, hairline ledger tables,
// understated ruled net-pay line, and an employer signature block.

function ClassicPayslipDocument(props: PayslipDocumentProps) {
  const {
    employee, payslip, companyName, companyAddress, logoUrl, logoAlignment = "left",
    accentColor = "#6366f1", footerNote, showBanking, showYtd, ytd, payeReference,
  } = props;
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const payslipNumber = `${payslip.period}-${employee.employeeNumber}`;
  const withYtd = !!(showYtd && ytd);

  const s = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", paddingTop: 40, paddingBottom: 56, paddingHorizontal: 46, backgroundColor: "#fff" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    brandCol: { flexDirection: "column", alignItems: flexForAlignment(logoAlignment), flexGrow: 1 },
    brand: { fontSize: 17, fontFamily: "Helvetica-Bold", letterSpacing: -0.4, textAlign: textAlignFor(logoAlignment) },
    brandSub: { fontSize: 7.5, color: "#6b6b6b", marginTop: 2, textAlign: textAlignFor(logoAlignment) },
    metaBox: { borderWidth: 0.75, borderColor: "#1a1a1a", padding: 8, minWidth: 150 },
    metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
    metaLabel: { fontSize: 7.5, color: "#555" },
    metaValue: { fontSize: 8, fontFamily: "Helvetica-Bold" },
    rule: { borderBottomWidth: 2, borderBottomColor: "#1a1a1a", marginTop: 14, marginBottom: 16 },
    idGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
    idCell: { width: "50%", marginBottom: 7, paddingRight: 10 },
    idLabel: { fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
    idValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginTop: 1 },
    sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: "#1a1a1a", paddingBottom: 3 },
    section: { marginBottom: 16 },
    row: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0" },
    totalRow: { flexDirection: "row", paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#1a1a1a", marginTop: 2 },
    desc: { flex: 3, fontSize: 9 },
    descBold: { flex: 3, fontSize: 9.5, fontFamily: "Helvetica-Bold" },
    amt: { flex: 2, fontSize: 9, textAlign: "right" },
    amtBold: { flex: 2, fontSize: 9.5, fontFamily: "Helvetica-Bold", textAlign: "right" },
    colHead: { flexDirection: "row", marginBottom: 3 },
    colHeadDesc: { flex: 3, fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
    colHeadAmt: { flex: 2, fontSize: 7, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" },
    netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 2, borderBottomWidth: 2, borderColor: "#1a1a1a", paddingVertical: 9, marginBottom: 20 },
    netLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1 },
    netYtd: { fontSize: 7.5, color: "#666", marginTop: 3 },
    netValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: accentColor },
    payeNote: { fontSize: 7.5, color: "#666", marginBottom: 20, lineHeight: 1.4 },
    footer: { position: "absolute", bottom: 26, left: 46, right: 46, textAlign: "center", fontSize: 7, color: "#999", borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 8 },
  });

  function LedgerTable({ title, kind }: { title: string; kind: "earnings" | "deductions" }) {
    const isDeduction = kind === "deductions";
    const rows = isDeduction ? payslip.deductions : payslip.earnings;
    const totalLabel = isDeduction ? "Total deductions" : "Gross pay";
    const totalAmt = isDeduction ? payslip.totalDeductions : payslip.grossPay;
    const sign = isDeduction ? "-" : "";
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.colHead}>
          <Text style={s.colHeadDesc}>Description</Text>
          <Text style={s.colHeadAmt}>Amount</Text>
          {withYtd ? <Text style={s.colHeadAmt}>Year to date</Text> : null}
        </View>
        {!isDeduction ? (
          <View style={s.row}>
            <Text style={s.desc}>Basic salary</Text>
            <Text style={s.amt}>{formatCurrency(payslip.basicSalary)}</Text>
            {withYtd ? <Text style={s.amt}>{formatCurrency(ytd!.basicSalary)}</Text> : null}
          </View>
        ) : null}
        {rows.map((item) => (
          <View key={item.label} style={s.row}>
            <Text style={s.desc}>{item.label}</Text>
            <Text style={s.amt}>{sign}{formatCurrency(item.amount)}</Text>
            {withYtd ? (
              <Text style={s.amt}>{sign}{formatCurrency((isDeduction ? ytd!.deductions : ytd!.earnings)[item.label] ?? 0)}</Text>
            ) : null}
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={s.descBold}>{totalLabel}</Text>
          <Text style={s.amtBold}>{sign}{formatCurrency(totalAmt)}</Text>
          {withYtd ? <Text style={s.amtBold}>{sign}{formatCurrency(isDeduction ? ytd!.totalDeductions : ytd!.grossPay)}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.brandCol}>
            {logoUrl ? <Image src={logoUrl} style={{ width: 90, height: 44, objectFit: "contain", marginBottom: 4 }} /> : null}
            <Text style={s.brand}>{companyName ?? "NovaHR"}</Text>
            {companyAddress ? <Text style={s.brandSub}>{companyAddress}</Text> : null}
            {payeReference ? <Text style={s.brandSub}>PAYE reference: {payeReference}</Text> : null}
          </View>
          <View style={s.metaBox}>
            <View style={s.metaRow}><Text style={s.metaLabel}>Payslip</Text><Text style={s.metaValue}>{payslipNumber}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Pay period</Text><Text style={s.metaValue}>{period}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Pay date</Text><Text style={s.metaValue}>{payDate}</Text></View>
          </View>
        </View>
        <View style={s.rule} />

        <View style={s.idGrid}>
          <View style={s.idCell}><Text style={s.idLabel}>Employee</Text><Text style={s.idValue}>{employee.firstName} {employee.lastName}</Text></View>
          <View style={s.idCell}><Text style={s.idLabel}>Employee number</Text><Text style={s.idValue}>{employee.employeeNumber}</Text></View>
          <View style={s.idCell}><Text style={s.idLabel}>Job title</Text><Text style={s.idValue}>{employee.jobTitle}</Text></View>
          <View style={s.idCell}><Text style={s.idLabel}>Department</Text><Text style={s.idValue}>{employee.department}</Text></View>
          <View style={s.idCell}><Text style={s.idLabel}>Identity number</Text><Text style={s.idValue}>{maskId(employee.idNumber)}</Text></View>
          <View style={s.idCell}><Text style={s.idLabel}>Engagement date</Text><Text style={s.idValue}>{formatDate(employee.startDate)}</Text></View>
          {employee.address ? (
            <View style={[s.idCell, { width: "100%" }]}><Text style={s.idLabel}>Residential address</Text><Text style={s.idValue}>{employee.address}</Text></View>
          ) : null}
        </View>

        <LedgerTable title="Earnings" kind="earnings" />
        <LedgerTable title="Deductions" kind="deductions" />

        <View style={s.netRow}>
          <View>
            <Text style={s.netLabel}>Net pay</Text>
            {withYtd ? <Text style={s.netYtd}>Year to date: {formatCurrency(ytd!.netPay)}</Text> : null}
          </View>
          <Text style={s.netValue}>{formatCurrency(payslip.netPay)}</Text>
        </View>

        {payeNoteText(payslip) ? <Text style={s.payeNote}>{payeNoteText(payslip)}</Text> : null}

        {showBanking ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Banking details</Text>
            <View style={s.row}><Text style={s.desc}>Bank</Text><Text style={s.amt}>{employee.bankDetails.bank || "-"}</Text></View>
            <View style={s.row}><Text style={s.desc}>Account number</Text><Text style={s.amt}>{maskAccount(employee.bankDetails.accountNumber)}</Text></View>
            <View style={s.row}><Text style={s.desc}>Account type</Text><Text style={s.amt}>{employee.bankDetails.accountType}</Text></View>
          </View>
        ) : null}

        <Text style={s.footer}>
          {companyName ?? "NovaHR"}{footerNote ? ` · ${footerNote}` : ""} · This is a computer-generated payslip · Generated by NovaHR on {formatDate(today())}
        </Text>
      </Page>
    </Document>
  );
}

// ─── MODERN TEMPLATE · "The Card" ────────────────────────────────────────────
// Accent header band, a 3-up summary strip, and side-by-side earnings/deductions.

function ModernPayslipDocument(props: PayslipDocumentProps) {
  const {
    employee, payslip, companyName, logoUrl, logoAlignment = "left", accentColor = "#6366f1",
    footerNote, showBanking, showYtd, ytd,
  } = props;
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const payslipNumber = `${payslip.period}-${employee.employeeNumber}`;
  const withYtd = !!(showYtd && ytd);
  const tint = `${accentColor}14`;

  const s = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", paddingBottom: 48, backgroundColor: "#fff" },
    band: { backgroundColor: accentColor, paddingVertical: 22, paddingHorizontal: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    bandLeft: { flexDirection: "column", alignItems: flexForAlignment(logoAlignment), flexGrow: 1 },
    brand: { fontSize: 19, fontFamily: "Helvetica-Bold", color: "#fff", textAlign: textAlignFor(logoAlignment) },
    brandSub: { fontSize: 8, color: "rgba(255,255,255,0.85)", marginTop: 2, textAlign: textAlignFor(logoAlignment) },
    bandRight: { alignItems: "flex-end" },
    bandLabel: { fontSize: 7, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.5 },
    bandValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fff", marginTop: 1 },
    body: { paddingHorizontal: 40, paddingTop: 20 },
    employeeName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
    employeeMeta: { fontSize: 8.5, color: "#6b6b6b", marginTop: 2 },
    summaryStrip: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 22 },
    summaryCard: { flex: 1, borderRadius: 8, padding: 12, backgroundColor: tint },
    summaryCardAccent: { flex: 1, borderRadius: 8, padding: 12, backgroundColor: accentColor },
    summaryLabel: { fontSize: 7.5, color: "#6b6b6b", textTransform: "uppercase", letterSpacing: 0.5 },
    summaryLabelLight: { fontSize: 7.5, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.5 },
    summaryValue: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 4 },
    summaryValueLight: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 4, color: "#fff" },
    columns: { flexDirection: "row", gap: 16 },
    column: { flex: 1 },
    sectionTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: accentColor, marginBottom: 6 },
    tHead: { flexDirection: "row", backgroundColor: tint, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4 },
    tHeadCell: { flex: 2, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555" },
    tHeadCellR: { flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", textAlign: "right" },
    row: { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
    cell: { flex: 2, fontSize: 8.5, color: "#3a3a3a" },
    cellR: { flex: 1, fontSize: 8.5, color: "#3a3a3a", textAlign: "right" },
    totalRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, marginTop: 2 },
    totalCell: { flex: 2, fontSize: 9, fontFamily: "Helvetica-Bold" },
    totalCellR: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
    netHero: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: accentColor, borderRadius: 10, padding: 16, marginTop: 24 },
    netLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#fff" },
    netSub: { fontSize: 7.5, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    netValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#fff" },
    payeNote: { fontSize: 7.5, color: "#6b6b6b", marginTop: 14, lineHeight: 1.4 },
    bankWrap: { marginTop: 18 },
    footer: { position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center", fontSize: 7, color: "#aaa", paddingTop: 8 },
  });

  const ytdNote = withYtd ? ` · YTD net ${formatCurrency(ytd!.netPay)}` : "";

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View style={s.bandLeft}>
            {logoUrl ? <Image src={logoUrl} style={{ width: 64, height: 32, objectFit: "contain", marginBottom: 4 }} /> : null}
            <Text style={s.brand}>{companyName ?? "NovaHR"}</Text>
            <Text style={s.brandSub}>Employee payslip</Text>
          </View>
          <View style={s.bandRight}>
            <Text style={s.bandLabel}>Payslip</Text>
            <Text style={s.bandValue}>{payslipNumber}</Text>
            <Text style={[s.bandLabel, { marginTop: 5 }]}>Pay period</Text>
            <Text style={s.bandValue}>{period}</Text>
            <Text style={[s.bandLabel, { marginTop: 5 }]}>Pay date</Text>
            <Text style={s.bandValue}>{payDate}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.employeeName}>{employee.firstName} {employee.lastName}</Text>
          <Text style={s.employeeMeta}>{employee.jobTitle} · {employee.department} · {employee.employeeNumber}</Text>

          <View style={s.summaryStrip}>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Gross pay</Text>
              <Text style={s.summaryValue}>{formatCurrency(payslip.grossPay)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Deductions</Text>
              <Text style={s.summaryValue}>-{formatCurrency(payslip.totalDeductions)}</Text>
            </View>
            <View style={s.summaryCardAccent}>
              <Text style={s.summaryLabelLight}>Net pay</Text>
              <Text style={s.summaryValueLight}>{formatCurrency(payslip.netPay)}</Text>
            </View>
          </View>

          <View style={s.columns}>
            <View style={s.column}>
              <Text style={s.sectionTitle}>Earnings</Text>
              <View style={s.tHead}><Text style={s.tHeadCell}>Description</Text><Text style={s.tHeadCellR}>{withYtd ? "Month" : "Amount"}</Text>{withYtd ? <Text style={s.tHeadCellR}>YTD</Text> : null}</View>
              <View style={s.row}><Text style={s.cell}>Basic salary</Text><Text style={s.cellR}>{formatCurrency(payslip.basicSalary)}</Text>{withYtd ? <Text style={s.cellR}>{formatCurrency(ytd!.basicSalary)}</Text> : null}</View>
              {payslip.earnings.map((item) => (
                <View key={item.label} style={s.row}><Text style={s.cell}>{item.label}</Text><Text style={s.cellR}>{formatCurrency(item.amount)}</Text>{withYtd ? <Text style={s.cellR}>{formatCurrency(ytd!.earnings[item.label] ?? 0)}</Text> : null}</View>
              ))}
              <View style={s.totalRow}><Text style={s.totalCell}>Gross</Text><Text style={s.totalCellR}>{formatCurrency(payslip.grossPay)}</Text>{withYtd ? <Text style={s.totalCellR}>{formatCurrency(ytd!.grossPay)}</Text> : null}</View>
            </View>
            <View style={s.column}>
              <Text style={s.sectionTitle}>Deductions</Text>
              <View style={s.tHead}><Text style={s.tHeadCell}>Description</Text><Text style={s.tHeadCellR}>{withYtd ? "Month" : "Amount"}</Text>{withYtd ? <Text style={s.tHeadCellR}>YTD</Text> : null}</View>
              {payslip.deductions.map((item) => (
                <View key={item.label} style={s.row}><Text style={s.cell}>{item.label}</Text><Text style={s.cellR}>-{formatCurrency(item.amount)}</Text>{withYtd ? <Text style={s.cellR}>-{formatCurrency(ytd!.deductions[item.label] ?? 0)}</Text> : null}</View>
              ))}
              <View style={s.totalRow}><Text style={s.totalCell}>Total</Text><Text style={s.totalCellR}>-{formatCurrency(payslip.totalDeductions)}</Text>{withYtd ? <Text style={s.totalCellR}>-{formatCurrency(ytd!.totalDeductions)}</Text> : null}</View>
            </View>
          </View>

          <View style={s.netHero}>
            <View>
              <Text style={s.netLabel}>Net pay</Text>
              <Text style={s.netSub}>Paid on {payDate}{ytdNote}</Text>
            </View>
            <Text style={s.netValue}>{formatCurrency(payslip.netPay)}</Text>
          </View>

          {payeNoteText(payslip) ? <Text style={s.payeNote}>{payeNoteText(payslip)}</Text> : null}

          {showBanking ? (
            <View style={s.bankWrap}>
              <Text style={s.sectionTitle}>Banking details</Text>
              <View style={s.row}><Text style={s.cell}>Bank</Text><Text style={s.cellR}>{employee.bankDetails.bank || "-"}</Text></View>
              <View style={s.row}><Text style={s.cell}>Account number</Text><Text style={s.cellR}>{maskAccount(employee.bankDetails.accountNumber)}</Text></View>
            </View>
          ) : null}
        </View>

        <Text style={s.footer}>
          {companyName ?? "NovaHR"}{footerNote ? ` · ${footerNote}` : ""} · Generated by NovaHR on {formatDate(today())}
        </Text>
      </Page>
    </Document>
  );
}

// ─── CORPORATE TEMPLATE · "The Compliance Statement" ─────────────────────────
// Statutory-complete: registration + PAYE/UIF/SDL refs, full identity grid,
// bordered tables, employer contributions and a leave-balance summary.

function CorporatePayslipDocument(props: PayslipDocumentProps) {
  const {
    employee, payslip, companyName, companyAddress, companyRegistration, logoUrl, logoAlignment = "left",
    accentColor = "#6366f1", footerNote, showBanking, showYtd, ytd, payeReference, uifReference, sdlReference,
  } = props;
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const payslipNumber = `${payslip.period}-${employee.employeeNumber}`;
  const withYtd = !!(showYtd && ytd);
  const leave = summariseLeave(employee.leaveBalances ?? []);
  const benefits = payslip.employerBenefits ?? [];
  const closingBalances = payslip.closingBalances ?? [];
  const payFrequency = employee.salary.payFrequency;

  // Employer contributions (informational, not deducted from the employee).
  // Uses the persisted employer figures from the run; falls back to the 1:1 UIF
  // match for payslips created before those were stored. ytd is null where we do
  // not track a running total for that line.
  const employerContribs: { label: string; amount: number; ytd: number | null }[] = [];
  const employerUifAmt = payslip.employerUif ?? payslip.uif; // employer matches employee UIF 1:1 in SA
  employerContribs.push({
    label: "UIF (employer)",
    amount: employerUifAmt,
    ytd: withYtd ? ytd!.employerUif || employerUifAmt : null,
  });
  if ((payslip.employerSdl ?? 0) > 0) {
    employerContribs.push({
      label: "SDL (employer)",
      amount: payslip.employerSdl!,
      ytd: withYtd ? ytd!.employerSdl : null,
    });
  }
  // pensionContributionPct is stored as a fraction (e.g. 0.075), so multiply directly.
  const pensionPct = employee.salary.pensionContributionPct;
  if (pensionPct && pensionPct > 0) {
    employerContribs.push({
      label: "Pension (employer)",
      amount: Math.round(payslip.basicSalary * pensionPct * 100) / 100,
      ytd: null,
    });
  }

  const s = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 8.5, color: "#1a1a1a", paddingBottom: 50, backgroundColor: "#fff" },
    band: { backgroundColor: "#f4f4f6", paddingVertical: 16, paddingHorizontal: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: accentColor },
    bandLeft: { flexDirection: "column", alignItems: flexForAlignment(logoAlignment), maxWidth: "60%" },
    companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: textAlignFor(logoAlignment) },
    companyMeta: { fontSize: 7.5, color: "#6b6b6b", marginTop: 1.5, textAlign: textAlignFor(logoAlignment) },
    bandRight: { alignItems: "flex-end" },
    hLabel: { fontSize: 7, color: "#6b6b6b", textTransform: "uppercase", letterSpacing: 0.4 },
    hValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginTop: 1 },
    body: { paddingHorizontal: 40, paddingTop: 16 },
    idGrid: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.5, borderColor: "#d5d5d8", borderRadius: 3, padding: 10, marginBottom: 16 },
    idCell: { width: "33.33%", marginBottom: 6, paddingRight: 8 },
    idLabel: { fontSize: 6.5, color: "#888", textTransform: "uppercase", letterSpacing: 0.4 },
    idValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginTop: 1 },
    twoCol: { flexDirection: "row", gap: 14 },
    blockGap: { marginBottom: 18 },
    col: { flex: 1 },
    sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, color: "#444", marginBottom: 6 },
    tHead: { flexDirection: "row", backgroundColor: "#ececef", paddingVertical: 3.5, paddingHorizontal: 5, borderWidth: 0.5, borderColor: "#ccc" },
    tHeadCell: { flex: 2, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#333" },
    tHeadCellR: { flex: 1, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#333", textAlign: "right" },
    row: { flexDirection: "row", paddingVertical: 3.5, paddingHorizontal: 5, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: "#e0e0e0" },
    cell: { flex: 2, fontSize: 8, color: "#3a3a3a" },
    cellR: { flex: 1, fontSize: 8, color: "#3a3a3a", textAlign: "right" },
    totalRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5, backgroundColor: "#ececef", borderWidth: 0.5, borderColor: "#ccc" },
    totalCell: { flex: 2, fontSize: 8, fontFamily: "Helvetica-Bold" },
    totalCellR: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "right" },
    section: { marginBottom: 14 },
    netBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: accentColor, borderRadius: 3, padding: 12, marginTop: 4, marginBottom: 14 },
    netLabel: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    netSub: { fontSize: 7, color: "#6b6b6b", marginTop: 1 },
    netValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: accentColor },
    payeNote: { fontSize: 7, color: "#6b6b6b", marginTop: -4, marginBottom: 16, lineHeight: 1.4 },
    footer: { position: "absolute", bottom: 26, left: 40, right: 40, textAlign: "center", fontSize: 6.5, color: "#999", borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 7 },
  });

  function Table({ title, kind }: { title: string; kind: "earnings" | "deductions" }) {
    const isDeduction = kind === "deductions";
    const rows = isDeduction ? payslip.deductions : payslip.earnings;
    const sign = isDeduction ? "-" : "";
    const totalLabel = isDeduction ? "Total deductions" : "Gross pay";
    const totalAmt = isDeduction ? payslip.totalDeductions : payslip.grossPay;
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.tHead}><Text style={s.tHeadCell}>Description</Text><Text style={s.tHeadCellR}>Month</Text>{withYtd ? <Text style={s.tHeadCellR}>YTD</Text> : null}</View>
        {!isDeduction ? (
          <View style={s.row}><Text style={s.cell}>Basic salary</Text><Text style={s.cellR}>{formatCurrency(payslip.basicSalary)}</Text>{withYtd ? <Text style={s.cellR}>{formatCurrency(ytd!.basicSalary)}</Text> : null}</View>
        ) : null}
        {rows.map((item) => (
          <View key={item.label} style={s.row}><Text style={s.cell}>{item.label}</Text><Text style={s.cellR}>{sign}{formatCurrency(item.amount)}</Text>{withYtd ? <Text style={s.cellR}>{sign}{formatCurrency((isDeduction ? ytd!.deductions : ytd!.earnings)[item.label] ?? 0)}</Text> : null}</View>
        ))}
        <View style={s.totalRow}><Text style={s.totalCell}>{totalLabel}</Text><Text style={s.totalCellR}>{sign}{formatCurrency(totalAmt)}</Text>{withYtd ? <Text style={s.totalCellR}>{sign}{formatCurrency(isDeduction ? ytd!.totalDeductions : ytd!.grossPay)}</Text> : null}</View>
      </View>
    );
  }

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View style={s.bandLeft}>
            {logoUrl ? <Image src={logoUrl} style={{ width: 80, height: 40, objectFit: "contain", marginBottom: 5 }} /> : null}
            <Text style={s.companyName}>{companyName ?? "NovaHR"}</Text>
            {companyRegistration ? <Text style={s.companyMeta}>Registration: {companyRegistration}</Text> : null}
            {companyAddress ? <Text style={s.companyMeta}>{companyAddress}</Text> : null}
            {payeReference ? <Text style={s.companyMeta}>PAYE: {payeReference}{uifReference ? ` · UIF: ${uifReference}` : ""}{sdlReference ? ` · SDL: ${sdlReference}` : ""}</Text> : null}
          </View>
          <View style={s.bandRight}>
            <Text style={s.hLabel}>Payslip number</Text>
            <Text style={s.hValue}>{payslipNumber}</Text>
            <Text style={[s.hLabel, { marginTop: 5 }]}>Pay period</Text>
            <Text style={s.hValue}>{period}</Text>
            <Text style={[s.hLabel, { marginTop: 5 }]}>Pay date</Text>
            <Text style={s.hValue}>{payDate}</Text>
            <Text style={[s.hLabel, { marginTop: 5 }]}>Frequency</Text>
            <Text style={s.hValue}>{payFrequency === "monthly" ? "Monthly" : payFrequency === "weekly" ? "Weekly" : "Bi-weekly"}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.idGrid}>
            <View style={s.idCell}><Text style={s.idLabel}>Employee</Text><Text style={s.idValue}>{employee.firstName} {employee.lastName}</Text></View>
            <View style={s.idCell}><Text style={s.idLabel}>Employee number</Text><Text style={s.idValue}>{employee.employeeNumber}</Text></View>
            <View style={s.idCell}><Text style={s.idLabel}>Identity number</Text><Text style={s.idValue}>{maskId(employee.idNumber)}</Text></View>
            <View style={s.idCell}><Text style={s.idLabel}>Tax number</Text><Text style={s.idValue}>{employee.taxNumber || "-"}</Text></View>
            <View style={s.idCell}><Text style={s.idLabel}>Job title</Text><Text style={s.idValue}>{employee.jobTitle}</Text></View>
            <View style={s.idCell}><Text style={s.idLabel}>Department</Text><Text style={s.idValue}>{employee.department}</Text></View>
            <View style={s.idCell}><Text style={s.idLabel}>Engagement date</Text><Text style={s.idValue}>{formatDate(employee.startDate)}</Text></View>
            <View style={s.idCell}><Text style={s.idLabel}>Location</Text><Text style={s.idValue}>{employee.location || "-"}</Text></View>
            <View style={s.idCell}><Text style={s.idLabel}>Employment type</Text><Text style={s.idValue}>{employee.employmentType === "full_time" ? "Full time" : employee.employmentType === "part_time" ? "Part time" : "Contract"}</Text></View>
            {employee.address ? (
              <View style={[s.idCell, { width: "100%" }]}><Text style={s.idLabel}>Residential address</Text><Text style={s.idValue}>{employee.address}</Text></View>
            ) : null}
          </View>

          <View style={s.twoCol}>
            <View style={s.col}><Table title="Earnings" kind="earnings" /></View>
            <View style={s.col}><Table title="Deductions" kind="deductions" /></View>
          </View>

          <View style={s.netBlock}>
            <View>
              <Text style={s.netLabel}>Net pay</Text>
              <Text style={s.netSub}>{withYtd ? `Amount paid into bank account · Year to date ${formatCurrency(ytd!.netPay)}` : "Amount paid into bank account"}</Text>
            </View>
            <Text style={s.netValue}>{formatCurrency(payslip.netPay)}</Text>
          </View>

          {payeNoteText(payslip) ? <Text style={s.payeNote}>{payeNoteText(payslip)}</Text> : null}

          <View style={[s.twoCol, s.blockGap]}>
            <View style={s.col}>
              <Text style={s.sectionTitle}>Employer contributions</Text>
              <View style={s.tHead}><Text style={s.tHeadCell}>Description</Text><Text style={s.tHeadCellR}>Month</Text>{withYtd ? <Text style={s.tHeadCellR}>YTD</Text> : null}</View>
              {employerContribs.map((c) => (
                <View key={c.label} style={s.row}><Text style={s.cell}>{c.label}</Text><Text style={s.cellR}>{formatCurrency(c.amount)}</Text>{withYtd ? <Text style={s.cellR}>{c.ytd != null ? formatCurrency(c.ytd) : "-"}</Text> : null}</View>
              ))}
            </View>
            <View style={s.col}>
              {showBanking ? (
                <>
                  <Text style={s.sectionTitle}>Payment details</Text>
                  <View style={s.tHead}><Text style={s.tHeadCell}>Field</Text><Text style={s.tHeadCellR}>Value</Text></View>
                  <View style={s.row}><Text style={s.cell}>Bank</Text><Text style={s.cellR}>{employee.bankDetails.bank || "-"}</Text></View>
                  <View style={s.row}><Text style={s.cell}>Account</Text><Text style={s.cellR}>{maskAccount(employee.bankDetails.accountNumber)}</Text></View>
                  <View style={s.row}><Text style={s.cell}>Type</Text><Text style={s.cellR}>{employee.bankDetails.accountType}</Text></View>
                </>
              ) : null}
            </View>
          </View>

          {benefits.length > 0 || closingBalances.length > 0 ? (
            <View style={[s.twoCol, s.blockGap]}>
              <View style={s.col}>
                {benefits.length > 0 ? (
                  <>
                    <Text style={s.sectionTitle}>Benefits</Text>
                    <View style={s.tHead}><Text style={s.tHeadCell}>Description</Text><Text style={s.tHeadCellR}>Month</Text></View>
                    {benefits.map((b) => (
                      <View key={b.label} style={s.row}>
                        <Text style={s.cell}>{b.label}{b.taxable ? " (taxable)" : ""}</Text>
                        <Text style={s.cellR}>{formatCurrency(b.amount)}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
              </View>
              <View style={s.col}>
                {closingBalances.length > 0 ? (
                  <>
                    <Text style={s.sectionTitle}>Closing balances</Text>
                    <View style={s.tHead}><Text style={s.tHeadCell}>Description</Text><Text style={s.tHeadCellR}>Balance</Text></View>
                    {closingBalances.map((c) => (
                      <View key={c.label} style={s.row}><Text style={s.cell}>{c.label}</Text><Text style={s.cellR}>{formatCurrency(c.balance)}</Text></View>
                    ))}
                  </>
                ) : null}
              </View>
            </View>
          ) : null}

          {leave.length > 0 ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Leave balances (days)</Text>
              <View style={s.tHead}><Text style={s.tHeadCell}>Leave type</Text><Text style={s.tHeadCellR}>Balance</Text><Text style={s.tHeadCellR}>Taken</Text></View>
              {leave.map((l) => (
                <View key={l.label} style={s.row}>
                  <Text style={s.cell}>{l.label}</Text>
                  <Text style={s.cellR}>{l.balance.toFixed(2)}</Text>
                  <Text style={s.cellR}>{l.taken.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={s.footer}>
          {companyName ?? "NovaHR"}{footerNote ? ` · ${footerNote}` : ""} · This payslip reflects statutory deductions in terms of the Income Tax Act and UIF Act · Generated by NovaHR on {formatDate(today())}
        </Text>
      </Page>
    </Document>
  );
}

// ─── BRANDED TEMPLATE · "The Statement" ──────────────────────────────────────
// Designed, marketing-grade. Full-bleed hero, an immediate net-pay statement,
// minimal rows under accent section bars.

function BrandedPayslipDocument(props: PayslipDocumentProps) {
  const {
    employee, payslip, companyName, logoUrl, logoAlignment = "center", accentColor = "#6366f1",
    footerNote, showBanking, showYtd, ytd,
  } = props;
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const payslipNumber = `${payslip.period}-${employee.employeeNumber}`;
  const withYtd = !!(showYtd && ytd);

  const s = StyleSheet.create({
    page: { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", paddingBottom: 48, backgroundColor: "#fff" },
    hero: { backgroundColor: accentColor, paddingTop: 30, paddingBottom: 28, paddingHorizontal: 40, alignItems: flexForAlignment(logoAlignment) },
    brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#fff", textAlign: textAlignFor(logoAlignment) },
    brandSub: { fontSize: 9, color: "rgba(255,255,255,0.85)", marginTop: 4, textAlign: textAlignFor(logoAlignment), textTransform: "uppercase", letterSpacing: 1 },
    body: { paddingHorizontal: 44, paddingTop: 24 },
    statement: { alignItems: "center", marginBottom: 24 },
    statementLead: { fontSize: 9, color: "#6b6b6b" },
    statementName: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
    statementNet: { fontSize: 32, fontFamily: "Helvetica-Bold", color: accentColor, marginTop: 8 },
    statementSub: { fontSize: 8.5, color: "#6b6b6b", marginTop: 4 },
    divider: { height: 3, width: 48, backgroundColor: accentColor, borderRadius: 2, alignSelf: "center", marginBottom: 24 },
    sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    sectionBar: { width: 3, height: 12, backgroundColor: accentColor, borderRadius: 2, marginRight: 6 },
    sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8 },
    section: { marginBottom: 20 },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
    label: { fontSize: 9.5, color: "#3a3a3a", flex: 3 },
    amt: { fontSize: 9.5, textAlign: "right", flex: 2 },
    ytdAmt: { fontSize: 8, color: "#999", textAlign: "right", flex: 2 },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 2 },
    totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", flex: 3 },
    totalAmt: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right", flex: 2 },
    colHeadRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
    colHeadL: { fontSize: 6.5, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, flex: 3 },
    colHeadR: { fontSize: 6.5, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right", flex: 2 },
    metaRow: { flexDirection: "row", justifyContent: "center", gap: 18, marginBottom: 22 },
    metaItem: { alignItems: "center" },
    metaLabel: { fontSize: 6.5, color: "#aaa", textTransform: "uppercase", letterSpacing: 0.5 },
    metaValue: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },
    payeNote: { fontSize: 7.5, color: "#6b6b6b", textAlign: "center", marginTop: 4, marginBottom: 4, lineHeight: 1.4 },
    footer: { position: "absolute", bottom: 24, left: 44, right: 44, textAlign: "center", fontSize: 7.5, color: accentColor, paddingTop: 8 },
  });

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={s.page}>
        <View style={s.hero}>
          {logoUrl ? <Image src={logoUrl} style={{ width: 90, height: 44, objectFit: "contain", marginBottom: 8 }} /> : null}
          <Text style={s.brand}>{companyName ?? "NovaHR"}</Text>
          <Text style={s.brandSub}>Payslip · {period}</Text>
        </View>

        <View style={s.body}>
          <View style={s.statement}>
            <Text style={s.statementLead}>Net pay for</Text>
            <Text style={s.statementName}>{employee.firstName} {employee.lastName}</Text>
            <Text style={s.statementNet}>{formatCurrency(payslip.netPay)}</Text>
            <Text style={s.statementSub}>{employee.jobTitle} · {employee.department} · Paid {payDate}</Text>
            {withYtd ? <Text style={s.statementSub}>Year to date net {formatCurrency(ytd!.netPay)}</Text> : null}
          </View>

          <View style={s.metaRow}>
            <View style={s.metaItem}><Text style={s.metaLabel}>Payslip</Text><Text style={s.metaValue}>{payslipNumber}</Text></View>
            <View style={s.metaItem}><Text style={s.metaLabel}>Employee no.</Text><Text style={s.metaValue}>{employee.employeeNumber}</Text></View>
            <View style={s.metaItem}><Text style={s.metaLabel}>Gross</Text><Text style={s.metaValue}>{formatCurrency(payslip.grossPay)}</Text></View>
          </View>

          <View style={s.divider} />

          <View style={s.section}>
            <View style={s.sectionHead}><View style={s.sectionBar} /><Text style={s.sectionTitle}>Earnings</Text></View>
            {withYtd ? <View style={s.colHeadRow}><Text style={s.colHeadL}>Description</Text><Text style={s.colHeadR}>Month</Text><Text style={s.colHeadR}>YTD</Text></View> : null}
            <View style={s.row}><Text style={s.label}>Basic salary</Text><Text style={s.amt}>{formatCurrency(payslip.basicSalary)}</Text>{withYtd ? <Text style={s.ytdAmt}>{formatCurrency(ytd!.basicSalary)}</Text> : null}</View>
            {payslip.earnings.map((item) => (
              <View key={item.label} style={s.row}><Text style={s.label}>{item.label}</Text><Text style={s.amt}>{formatCurrency(item.amount)}</Text>{withYtd ? <Text style={s.ytdAmt}>{formatCurrency(ytd!.earnings[item.label] ?? 0)}</Text> : null}</View>
            ))}
            <View style={s.totalRow}><Text style={s.totalLabel}>Gross pay</Text><Text style={s.totalAmt}>{formatCurrency(payslip.grossPay)}</Text>{withYtd ? <Text style={s.ytdAmt}>{formatCurrency(ytd!.grossPay)}</Text> : null}</View>
          </View>

          <View style={s.section}>
            <View style={s.sectionHead}><View style={s.sectionBar} /><Text style={s.sectionTitle}>Deductions</Text></View>
            {withYtd ? <View style={s.colHeadRow}><Text style={s.colHeadL}>Description</Text><Text style={s.colHeadR}>Month</Text><Text style={s.colHeadR}>YTD</Text></View> : null}
            {payslip.deductions.map((item) => (
              <View key={item.label} style={s.row}><Text style={s.label}>{item.label}</Text><Text style={s.amt}>-{formatCurrency(item.amount)}</Text>{withYtd ? <Text style={s.ytdAmt}>-{formatCurrency(ytd!.deductions[item.label] ?? 0)}</Text> : null}</View>
            ))}
            <View style={s.totalRow}><Text style={s.totalLabel}>Total deductions</Text><Text style={s.totalAmt}>-{formatCurrency(payslip.totalDeductions)}</Text>{withYtd ? <Text style={s.ytdAmt}>-{formatCurrency(ytd!.totalDeductions)}</Text> : null}</View>
          </View>

          {showBanking ? (
            <View style={s.section}>
              <View style={s.sectionHead}><View style={s.sectionBar} /><Text style={s.sectionTitle}>Banking</Text></View>
              <View style={s.row}><Text style={s.label}>Bank</Text><Text style={s.amt}>{employee.bankDetails.bank || "-"}</Text></View>
              <View style={s.row}><Text style={s.label}>Account number</Text><Text style={s.amt}>{maskAccount(employee.bankDetails.accountNumber)}</Text></View>
            </View>
          ) : null}

          {payeNoteText(payslip) ? <Text style={s.payeNote}>{payeNoteText(payslip)}</Text> : null}
        </View>

        <Text style={s.footer}>
          {companyName ?? "NovaHR"}{footerNote ? ` · ${footerNote}` : ""} · Generated by NovaHR on {formatDate(today())}
        </Text>
      </Page>
    </Document>
  );
}

// ─── PUBLIC EXPORT ────────────────────────────────────────────────────────────

export function PayslipDocument(props: PayslipDocumentProps) {
  switch (props.template) {
    case "modern":
      return <ModernPayslipDocument {...props} />;
    case "corporate":
      return <CorporatePayslipDocument {...props} />;
    case "branded":
      return <BrandedPayslipDocument {...props} />;
    default:
      return <ClassicPayslipDocument {...props} />;
  }
}
