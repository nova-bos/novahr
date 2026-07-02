import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/format";
import type { Employee, Payslip } from "@/lib/types";

export interface PayslipDocumentProps {
  employee: Employee;
  payslip: Payslip;
  companyName?: string;
  companyAddress?: string;
  logoUrl?: string;
  accentColor?: string;
  template?: string;
  footerNote?: string;
  showBanking?: boolean;
  showYtd?: boolean;
  payeReference?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function maskId(id: string): string {
  if (id.length <= 6) return id;
  return `******${id.slice(-6)}`;
}

function maskAccount(account: string): string {
  if (account.length <= 4) return account;
  return `****${account.slice(-4)}`;
}

// ─── CLASSIC TEMPLATE ────────────────────────────────────────────────────────

const classicStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1a1a1a",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 44,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
  },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: -0.5 },
  brandSub: { fontSize: 8, color: "#6b6b6b", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerLabel: { fontSize: 7, color: "#6b6b6b", textTransform: "uppercase", letterSpacing: 0.5 },
  headerValue: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },
  employeeBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  employeeName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  employeeMeta: { fontSize: 8, color: "#6b6b6b", marginTop: 2 },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#6b6b6b",
    marginBottom: 5,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableHeadCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", flex: 1 },
  tableHeadCellRight: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  tableRowTotals: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: "#f5f5f5",
  },
  tableCell: { flex: 1, fontSize: 9, color: "#3a3a3a" },
  tableCellBold: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },
  tableCellRight: { fontSize: 9, color: "#3a3a3a", textAlign: "right" },
  tableCellRightBold: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 7,
    color: "#aaa",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
  },
});

function EarningsTable({
  payslip,
  showYtd,
  styles,
}: {
  payslip: Payslip;
  showYtd?: boolean;
  styles: typeof classicStyles;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Earnings</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.tableHeadCell, { flex: 3 }]}>Description</Text>
        <Text style={styles.tableHeadCellRight}>Amount</Text>
        {showYtd ? <Text style={[styles.tableHeadCellRight, { marginLeft: 16 }]}>YTD</Text> : null}
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { flex: 3 }]}>Basic salary</Text>
        <Text style={styles.tableCellRight}>{formatCurrency(payslip.basicSalary)}</Text>
        {showYtd ? <Text style={[styles.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
      </View>
      {payslip.earnings.map((item) => (
        <View key={item.label} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 3 }]}>{item.label}</Text>
          <Text style={styles.tableCellRight}>{formatCurrency(item.amount)}</Text>
          {showYtd ? <Text style={[styles.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
        </View>
      ))}
      <View style={styles.tableRowTotals}>
        <Text style={[styles.tableCellBold, { flex: 3 }]}>Gross pay</Text>
        <Text style={styles.tableCellRightBold}>{formatCurrency(payslip.grossPay)}</Text>
        {showYtd ? <Text style={[styles.tableCellRightBold, { marginLeft: 16 }]}>-</Text> : null}
      </View>
    </View>
  );
}

function DeductionsTable({
  payslip,
  showYtd,
  styles,
}: {
  payslip: Payslip;
  showYtd?: boolean;
  styles: typeof classicStyles;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Deductions</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.tableHeadCell, { flex: 3 }]}>Description</Text>
        <Text style={styles.tableHeadCellRight}>Amount</Text>
        {showYtd ? <Text style={[styles.tableHeadCellRight, { marginLeft: 16 }]}>YTD</Text> : null}
      </View>
      {payslip.deductions.map((item) => (
        <View key={item.label} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 3 }]}>{item.label}</Text>
          <Text style={styles.tableCellRight}>-{formatCurrency(item.amount)}</Text>
          {showYtd ? <Text style={[styles.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
        </View>
      ))}
      <View style={styles.tableRowTotals}>
        <Text style={[styles.tableCellBold, { flex: 3 }]}>Total deductions</Text>
        <Text style={styles.tableCellRightBold}>-{formatCurrency(payslip.totalDeductions)}</Text>
        {showYtd ? <Text style={[styles.tableCellRightBold, { marginLeft: 16 }]}>-</Text> : null}
      </View>
    </View>
  );
}

function ClassicPayslipDocument(props: PayslipDocumentProps) {
  const { employee, payslip, companyName, logoUrl, accentColor = "#6366f1", footerNote, showBanking, showYtd } = props;
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const payslipNumber = `${payslip.period}-${employee.employeeNumber}`;

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={classicStyles.page}>
        <View style={classicStyles.header}>
          <View>
            {logoUrl ? (
              <Image src={logoUrl} style={{ width: 80, height: 40, objectFit: "contain" }} />
            ) : null}
            <Text style={classicStyles.brand}>{companyName ?? "NovaHR"}</Text>
            <Text style={classicStyles.brandSub}>Employee payslip</Text>
          </View>
          <View style={classicStyles.headerRight}>
            <Text style={classicStyles.headerLabel}>Payslip no</Text>
            <Text style={classicStyles.headerValue}>{payslipNumber}</Text>
            <Text style={[classicStyles.headerLabel, { marginTop: 6 }]}>Pay period</Text>
            <Text style={classicStyles.headerValue}>{period}</Text>
            <Text style={[classicStyles.headerLabel, { marginTop: 6 }]}>Pay date</Text>
            <Text style={classicStyles.headerValue}>{payDate}</Text>
          </View>
        </View>

        <View style={classicStyles.employeeBox}>
          <Text style={classicStyles.employeeName}>
            {employee.firstName} {employee.lastName}
          </Text>
          <Text style={classicStyles.employeeMeta}>
            {employee.jobTitle} · {employee.department} · {employee.employeeNumber}
          </Text>
          <Text style={[classicStyles.employeeMeta, { marginTop: 2 }]}>
            ID: {maskId(employee.idNumber)}
          </Text>
        </View>

        <EarningsTable payslip={payslip} showYtd={showYtd} styles={classicStyles} />
        <DeductionsTable payslip={payslip} showYtd={showYtd} styles={classicStyles} />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: `${accentColor}15`,
            borderRadius: 6,
            padding: 12,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>Net pay</Text>
          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: accentColor }}>
            {formatCurrency(payslip.netPay)}
          </Text>
        </View>

        {showBanking ? (
          <View style={[classicStyles.section]}>
            <Text style={classicStyles.sectionTitle}>Banking details</Text>
            <View style={classicStyles.tableRow}>
              <Text style={[classicStyles.tableCell, { flex: 2 }]}>Bank</Text>
              <Text style={[classicStyles.tableCellRight, { flex: 3 }]}>{employee.bankDetails.bank}</Text>
            </View>
            <View style={classicStyles.tableRow}>
              <Text style={[classicStyles.tableCell, { flex: 2 }]}>Account number</Text>
              <Text style={[classicStyles.tableCellRight, { flex: 3 }]}>{maskAccount(employee.bankDetails.accountNumber)}</Text>
            </View>
            <View style={classicStyles.tableRow}>
              <Text style={[classicStyles.tableCell, { flex: 2 }]}>Account type</Text>
              <Text style={[classicStyles.tableCellRight, { flex: 3 }]}>{employee.bankDetails.accountType}</Text>
            </View>
          </View>
        ) : null}

        <Text style={classicStyles.footer}>
          {companyName ?? "NovaHR"}{footerNote ? ` · ${footerNote}` : ""} · Generated by NovaHR on {formatDate(today())}
        </Text>
      </Page>
    </Document>
  );
}

// ─── MODERN TEMPLATE ─────────────────────────────────────────────────────────

function ModernPayslipDocument(props: PayslipDocumentProps) {
  const { employee, payslip, companyName, logoUrl, accentColor = "#6366f1", footerNote, showBanking, showYtd } = props;
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const payslipNumber = `${payslip.period}-${employee.employeeNumber}`;

  const modernPage = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 9,
      color: "#1a1a1a",
      paddingBottom: 40,
      backgroundColor: "#fff",
    },
    headerBand: {
      backgroundColor: accentColor,
      paddingVertical: 20,
      paddingHorizontal: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    headerLeft: { flexDirection: "column" },
    brandText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#fff" },
    brandSub: { fontSize: 8, color: "rgba(255,255,255,0.8)", marginTop: 2 },
    headerRight: { alignItems: "flex-end" },
    headerLabel: { fontSize: 7, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 0.5 },
    headerValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fff", marginTop: 1 },
    body: { paddingHorizontal: 40 },
    section: { marginBottom: 18 },
    sectionTitle: {
      fontSize: 7,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: "#6b6b6b",
      marginBottom: 5,
    },
    tableHead: {
      flexDirection: "row",
      backgroundColor: `${accentColor}18`,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    tableHeadCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", flex: 1 },
    tableHeadCellRight: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", textAlign: "right" },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e5e5",
    },
    tableRowTotals: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 6,
      backgroundColor: `${accentColor}18`,
    },
    tableCell: { flex: 1, fontSize: 9, color: "#3a3a3a" },
    tableCellBold: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },
    tableCellRight: { fontSize: 9, color: "#3a3a3a", textAlign: "right" },
    tableCellRightBold: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
    employeeBox: {
      backgroundColor: "#f9f9fb",
      borderRadius: 5,
      padding: 10,
      marginBottom: 20,
    },
    employeeName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
    employeeMeta: { fontSize: 8, color: "#6b6b6b", marginTop: 2 },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 7,
      color: "#aaa",
      borderTopWidth: 0.5,
      borderTopColor: "#e5e5e5",
      paddingTop: 8,
    },
  });

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={modernPage.page}>
        <View style={modernPage.headerBand}>
          <View style={modernPage.headerLeft}>
            {logoUrl ? (
              <Image src={logoUrl} style={{ width: 60, height: 30, objectFit: "contain", marginBottom: 4 }} />
            ) : null}
            <Text style={modernPage.brandText}>{companyName ?? "NovaHR"}</Text>
            <Text style={modernPage.brandSub}>Employee Payslip</Text>
          </View>
          <View style={modernPage.headerRight}>
            <Text style={modernPage.headerLabel}>Payslip no</Text>
            <Text style={modernPage.headerValue}>{payslipNumber}</Text>
            <Text style={[modernPage.headerLabel, { marginTop: 6 }]}>Pay period</Text>
            <Text style={modernPage.headerValue}>{period}</Text>
            <Text style={[modernPage.headerLabel, { marginTop: 6 }]}>Pay date</Text>
            <Text style={modernPage.headerValue}>{payDate}</Text>
          </View>
        </View>

        <View style={modernPage.body}>
          <View style={modernPage.employeeBox}>
            <Text style={modernPage.employeeName}>
              {employee.firstName} {employee.lastName}
            </Text>
            <Text style={modernPage.employeeMeta}>
              {employee.jobTitle} · {employee.department} · {employee.employeeNumber}
            </Text>
          </View>

          <View style={modernPage.section}>
            <Text style={modernPage.sectionTitle}>Earnings</Text>
            <View style={modernPage.tableHead}>
              <Text style={[modernPage.tableHeadCell, { flex: 3 }]}>Description</Text>
              <Text style={modernPage.tableHeadCellRight}>Amount</Text>
              {showYtd ? <Text style={[modernPage.tableHeadCellRight, { marginLeft: 16 }]}>YTD</Text> : null}
            </View>
            <View style={modernPage.tableRow}>
              <Text style={[modernPage.tableCell, { flex: 3 }]}>Basic salary</Text>
              <Text style={modernPage.tableCellRight}>{formatCurrency(payslip.basicSalary)}</Text>
              {showYtd ? <Text style={[modernPage.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
            </View>
            {payslip.earnings.map((item) => (
              <View key={item.label} style={modernPage.tableRow}>
                <Text style={[modernPage.tableCell, { flex: 3 }]}>{item.label}</Text>
                <Text style={modernPage.tableCellRight}>{formatCurrency(item.amount)}</Text>
                {showYtd ? <Text style={[modernPage.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
              </View>
            ))}
            <View style={modernPage.tableRowTotals}>
              <Text style={[modernPage.tableCellBold, { flex: 3 }]}>Gross pay</Text>
              <Text style={modernPage.tableCellRightBold}>{formatCurrency(payslip.grossPay)}</Text>
              {showYtd ? <Text style={[modernPage.tableCellRightBold, { marginLeft: 16 }]}>-</Text> : null}
            </View>
          </View>

          <View style={modernPage.section}>
            <Text style={modernPage.sectionTitle}>Deductions</Text>
            <View style={modernPage.tableHead}>
              <Text style={[modernPage.tableHeadCell, { flex: 3 }]}>Description</Text>
              <Text style={modernPage.tableHeadCellRight}>Amount</Text>
              {showYtd ? <Text style={[modernPage.tableHeadCellRight, { marginLeft: 16 }]}>YTD</Text> : null}
            </View>
            {payslip.deductions.map((item) => (
              <View key={item.label} style={modernPage.tableRow}>
                <Text style={[modernPage.tableCell, { flex: 3 }]}>{item.label}</Text>
                <Text style={modernPage.tableCellRight}>-{formatCurrency(item.amount)}</Text>
                {showYtd ? <Text style={[modernPage.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
              </View>
            ))}
            <View style={modernPage.tableRowTotals}>
              <Text style={[modernPage.tableCellBold, { flex: 3 }]}>Total deductions</Text>
              <Text style={modernPage.tableCellRightBold}>-{formatCurrency(payslip.totalDeductions)}</Text>
              {showYtd ? <Text style={[modernPage.tableCellRightBold, { marginLeft: 16 }]}>-</Text> : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: accentColor,
              borderRadius: 6,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#fff" }}>Net pay</Text>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#fff" }}>
              {formatCurrency(payslip.netPay)}
            </Text>
          </View>

          {showBanking ? (
            <View style={modernPage.section}>
              <Text style={modernPage.sectionTitle}>Banking details</Text>
              <View style={modernPage.tableRow}>
                <Text style={[modernPage.tableCell, { flex: 2 }]}>Bank</Text>
                <Text style={[modernPage.tableCellRight, { flex: 3 }]}>{employee.bankDetails.bank}</Text>
              </View>
              <View style={modernPage.tableRow}>
                <Text style={[modernPage.tableCell, { flex: 2 }]}>Account number</Text>
                <Text style={[modernPage.tableCellRight, { flex: 3 }]}>{maskAccount(employee.bankDetails.accountNumber)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <Text style={modernPage.footer}>
          {companyName ?? "NovaHR"}{footerNote ? ` · ${footerNote}` : ""} · Generated by NovaHR on {formatDate(today())}
        </Text>
      </Page>
    </Document>
  );
}

// ─── CORPORATE TEMPLATE ──────────────────────────────────────────────────────

function CorporatePayslipDocument(props: PayslipDocumentProps) {
  const { employee, payslip, companyName, companyAddress, logoUrl, accentColor = "#6366f1", footerNote, showBanking, showYtd, payeReference } = props;
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const payslipNumber = `${payslip.period}-${employee.employeeNumber}`;

  const s = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 9,
      color: "#1a1a1a",
      paddingBottom: 40,
      backgroundColor: "#fff",
    },
    headerBand: {
      backgroundColor: "#f5f5f5",
      paddingVertical: 16,
      paddingHorizontal: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
      borderBottomWidth: 0.5,
      borderBottomColor: "#ccc",
    },
    headerLeft: {},
    headerRight: { alignItems: "flex-end" },
    companyName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
    companyMeta: { fontSize: 8, color: "#6b6b6b", marginTop: 2 },
    headerLabel: { fontSize: 7, color: "#6b6b6b", textTransform: "uppercase", letterSpacing: 0.5 },
    headerValue: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },
    body: { paddingHorizontal: 40 },
    employeeBox: {
      backgroundColor: "#fafafa",
      borderRadius: 4,
      padding: 10,
      marginBottom: 16,
      borderWidth: 0.5,
      borderColor: "#e0e0e0",
    },
    employeeName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
    employeeMeta: { fontSize: 8, color: "#6b6b6b", marginTop: 2 },
    section: { marginBottom: 16 },
    sectionTitle: {
      fontSize: 7,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: "#6b6b6b",
      marginBottom: 5,
    },
    tableHead: {
      flexDirection: "row",
      backgroundColor: "#eeeeee",
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderWidth: 0.5,
      borderColor: "#ccc",
    },
    tableHeadCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#333", flex: 1 },
    tableHeadCellRight: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#333", textAlign: "right" },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e0e0e0",
      borderLeftWidth: 0.5,
      borderLeftColor: "#e0e0e0",
      borderRightWidth: 0.5,
      borderRightColor: "#e0e0e0",
    },
    tableRowTotals: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 6,
      backgroundColor: "#eeeeee",
      borderWidth: 0.5,
      borderColor: "#ccc",
    },
    tableCell: { flex: 1, fontSize: 9, color: "#3a3a3a" },
    tableCellBold: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },
    tableCellRight: { fontSize: 9, color: "#3a3a3a", textAlign: "right" },
    tableCellRightBold: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 7,
      color: "#aaa",
      borderTopWidth: 0.5,
      borderTopColor: "#e5e5e5",
      paddingTop: 8,
    },
  });

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            {logoUrl ? (
              <Image src={logoUrl} style={{ width: 80, height: 40, objectFit: "contain", marginBottom: 6 }} />
            ) : null}
            <Text style={s.companyName}>{companyName ?? "NovaHR"}</Text>
            {companyAddress ? <Text style={s.companyMeta}>{companyAddress}</Text> : null}
            {payeReference ? <Text style={s.companyMeta}>PAYE Ref: {payeReference}</Text> : null}
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>Payslip no</Text>
            <Text style={s.headerValue}>{payslipNumber}</Text>
            <Text style={[s.headerLabel, { marginTop: 6 }]}>Pay period</Text>
            <Text style={s.headerValue}>{period}</Text>
            <Text style={[s.headerLabel, { marginTop: 6 }]}>Pay date</Text>
            <Text style={s.headerValue}>{payDate}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.employeeBox}>
            <Text style={s.employeeName}>{employee.firstName} {employee.lastName}</Text>
            <Text style={s.employeeMeta}>{employee.jobTitle} · {employee.department} · Emp No: {employee.employeeNumber}</Text>
            <Text style={s.employeeMeta}>ID: {maskId(employee.idNumber)} · Tax No: {employee.taxNumber}</Text>
            <Text style={s.employeeMeta}>Start date: {formatDate(employee.startDate)}</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Earnings</Text>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Description</Text>
              <Text style={s.tableHeadCellRight}>Amount</Text>
              {showYtd ? <Text style={[s.tableHeadCellRight, { marginLeft: 16 }]}>YTD</Text> : null}
            </View>
            <View style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 3 }]}>Basic salary</Text>
              <Text style={s.tableCellRight}>{formatCurrency(payslip.basicSalary)}</Text>
              {showYtd ? <Text style={[s.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
            </View>
            {payslip.earnings.map((item) => (
              <View key={item.label} style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 3 }]}>{item.label}</Text>
                <Text style={s.tableCellRight}>{formatCurrency(item.amount)}</Text>
                {showYtd ? <Text style={[s.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
              </View>
            ))}
            <View style={s.tableRowTotals}>
              <Text style={[s.tableCellBold, { flex: 3 }]}>Gross pay</Text>
              <Text style={s.tableCellRightBold}>{formatCurrency(payslip.grossPay)}</Text>
              {showYtd ? <Text style={[s.tableCellRightBold, { marginLeft: 16 }]}>-</Text> : null}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Deductions</Text>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Description</Text>
              <Text style={s.tableHeadCellRight}>Amount</Text>
              {showYtd ? <Text style={[s.tableHeadCellRight, { marginLeft: 16 }]}>YTD</Text> : null}
            </View>
            {payslip.deductions.map((item) => (
              <View key={item.label} style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 3 }]}>{item.label}</Text>
                <Text style={s.tableCellRight}>-{formatCurrency(item.amount)}</Text>
                {showYtd ? <Text style={[s.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
              </View>
            ))}
            <View style={s.tableRowTotals}>
              <Text style={[s.tableCellBold, { flex: 3 }]}>Total deductions</Text>
              <Text style={s.tableCellRightBold}>-{formatCurrency(payslip.totalDeductions)}</Text>
              {showYtd ? <Text style={[s.tableCellRightBold, { marginLeft: 16 }]}>-</Text> : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: `${accentColor}15`,
              borderRadius: 4,
              padding: 12,
              marginBottom: 16,
              borderWidth: 0.5,
              borderColor: accentColor,
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>Net pay</Text>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: accentColor }}>
              {formatCurrency(payslip.netPay)}
            </Text>
          </View>

          {showBanking ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Payment details</Text>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 2 }]}>Bank</Text>
                <Text style={[s.tableCellRight, { flex: 3 }]}>{employee.bankDetails.bank}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 2 }]}>Account number</Text>
                <Text style={[s.tableCellRight, { flex: 3 }]}>{maskAccount(employee.bankDetails.accountNumber)}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 2 }]}>Account type</Text>
                <Text style={[s.tableCellRight, { flex: 3 }]}>{employee.bankDetails.accountType}</Text>
              </View>
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

// ─── BRANDED TEMPLATE ────────────────────────────────────────────────────────

function BrandedPayslipDocument(props: PayslipDocumentProps) {
  const { employee, payslip, companyName, logoUrl, accentColor = "#6366f1", footerNote, showBanking, showYtd } = props;
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);
  const payslipNumber = `${payslip.period}-${employee.employeeNumber}`;

  const s = StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 9,
      color: "#1a1a1a",
      paddingBottom: 40,
      backgroundColor: "#fff",
    },
    headerGradient: {
      backgroundColor: accentColor,
      paddingVertical: 28,
      paddingHorizontal: 40,
      alignItems: "center",
      marginBottom: 24,
    },
    brandText: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#fff", textAlign: "center" },
    brandSub: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 4, textAlign: "center" },
    body: { paddingHorizontal: 40 },
    employeeBox: {
      backgroundColor: "#f9f9fb",
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
      alignItems: "center",
    },
    employeeName: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center" },
    employeeMeta: { fontSize: 8, color: "#6b6b6b", marginTop: 3, textAlign: "center" },
    payMeta: { fontSize: 8, color: "#6b6b6b", textAlign: "center", marginTop: 2 },
    section: { marginBottom: 18 },
    sectionTitle: {
      fontSize: 7,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      color: "#6b6b6b",
      marginBottom: 5,
    },
    tableHead: {
      flexDirection: "row",
      backgroundColor: "#f5f5f5",
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    tableHeadCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", flex: 1 },
    tableHeadCellRight: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555", textAlign: "right" },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e5e5",
    },
    tableRowTotals: {
      flexDirection: "row",
      paddingVertical: 5,
      paddingHorizontal: 6,
      backgroundColor: "#f5f5f5",
    },
    tableCell: { flex: 1, fontSize: 9, color: "#3a3a3a" },
    tableCellBold: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },
    tableCellRight: { fontSize: 9, color: "#3a3a3a", textAlign: "right" },
    tableCellRightBold: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 40,
      right: 40,
      textAlign: "center",
      fontSize: 7,
      color: "#aaa",
      borderTopWidth: 0.5,
      borderTopColor: "#e5e5e5",
      paddingTop: 8,
    },
  });

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={s.page}>
        <View style={s.headerGradient}>
          {logoUrl ? (
            <Image src={logoUrl} style={{ width: 80, height: 40, objectFit: "contain", marginBottom: 8 }} />
          ) : null}
          <Text style={s.brandText}>{companyName ?? "NovaHR"}</Text>
          <Text style={s.brandSub}>Payslip</Text>
        </View>

        <View style={s.body}>
          <View style={s.employeeBox}>
            <Text style={s.employeeName}>{employee.firstName} {employee.lastName}</Text>
            <Text style={s.employeeMeta}>{employee.jobTitle} · {employee.department}</Text>
            <Text style={s.payMeta}>Employee No: {employee.employeeNumber} · Payslip: {payslipNumber}</Text>
            <Text style={s.payMeta}>Period: {period} · Pay date: {payDate}</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Earnings</Text>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Description</Text>
              <Text style={s.tableHeadCellRight}>Amount</Text>
              {showYtd ? <Text style={[s.tableHeadCellRight, { marginLeft: 16 }]}>YTD</Text> : null}
            </View>
            <View style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 3 }]}>Basic salary</Text>
              <Text style={s.tableCellRight}>{formatCurrency(payslip.basicSalary)}</Text>
              {showYtd ? <Text style={[s.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
            </View>
            {payslip.earnings.map((item) => (
              <View key={item.label} style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 3 }]}>{item.label}</Text>
                <Text style={s.tableCellRight}>{formatCurrency(item.amount)}</Text>
                {showYtd ? <Text style={[s.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
              </View>
            ))}
            <View style={s.tableRowTotals}>
              <Text style={[s.tableCellBold, { flex: 3 }]}>Gross pay</Text>
              <Text style={s.tableCellRightBold}>{formatCurrency(payslip.grossPay)}</Text>
              {showYtd ? <Text style={[s.tableCellRightBold, { marginLeft: 16 }]}>-</Text> : null}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Deductions</Text>
            <View style={s.tableHead}>
              <Text style={[s.tableHeadCell, { flex: 3 }]}>Description</Text>
              <Text style={s.tableHeadCellRight}>Amount</Text>
              {showYtd ? <Text style={[s.tableHeadCellRight, { marginLeft: 16 }]}>YTD</Text> : null}
            </View>
            {payslip.deductions.map((item) => (
              <View key={item.label} style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 3 }]}>{item.label}</Text>
                <Text style={s.tableCellRight}>-{formatCurrency(item.amount)}</Text>
                {showYtd ? <Text style={[s.tableCellRight, { marginLeft: 16 }]}>-</Text> : null}
              </View>
            ))}
            <View style={s.tableRowTotals}>
              <Text style={[s.tableCellBold, { flex: 3 }]}>Total deductions</Text>
              <Text style={s.tableCellRightBold}>-{formatCurrency(payslip.totalDeductions)}</Text>
              {showYtd ? <Text style={[s.tableCellRightBold, { marginLeft: 16 }]}>-</Text> : null}
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: accentColor,
              borderRadius: 8,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: "#fff" }}>Net pay</Text>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#fff" }}>
              {formatCurrency(payslip.netPay)}
            </Text>
          </View>

          {showBanking ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Banking details</Text>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 2 }]}>Bank</Text>
                <Text style={[s.tableCellRight, { flex: 3 }]}>{employee.bankDetails.bank}</Text>
              </View>
              <View style={s.tableRow}>
                <Text style={[s.tableCell, { flex: 2 }]}>Account</Text>
                <Text style={[s.tableCellRight, { flex: 3 }]}>{maskAccount(employee.bankDetails.accountNumber)}</Text>
              </View>
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
