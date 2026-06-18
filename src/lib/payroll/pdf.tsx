import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatDate, formatMonthYear } from "@/lib/format";
import type { Employee, Payslip } from "@/lib/types";

const s = StyleSheet.create({
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
  netPayBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    padding: 12,
    marginBottom: 32,
  },
  netPayLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  netPayAmount: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#16a34a" },
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PayslipDocument({ employee, payslip }: { employee: Employee; payslip: Payslip }) {
  const period = formatMonthYear(payslip.period);
  const payDate = formatDate(payslip.payDate);

  return (
    <Document title={`Payslip ${employee.firstName} ${employee.lastName} ${period}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>NovaHR</Text>
            <Text style={s.brandSub}>Employee payslip</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerLabel}>Pay period</Text>
            <Text style={s.headerValue}>{period}</Text>
            <Text style={[s.headerLabel, { marginTop: 6 }]}>Pay date</Text>
            <Text style={s.headerValue}>{payDate}</Text>
          </View>
        </View>

        {/* Employee */}
        <View style={s.employeeBox}>
          <Text style={s.employeeName}>
            {employee.firstName} {employee.lastName}
          </Text>
          <Text style={s.employeeMeta}>
            {employee.jobTitle} · {employee.department} · {employee.employeeNumber}
          </Text>
        </View>

        {/* Earnings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Earnings</Text>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadCell, { flex: 3 }]}>Description</Text>
            <Text style={s.tableHeadCellRight}>Amount</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={[s.tableCell, { flex: 3 }]}>Basic salary</Text>
            <Text style={s.tableCellRight}>{formatCurrency(payslip.basicSalary)}</Text>
          </View>
          {payslip.earnings.map((item) => (
            <View key={item.label} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 3 }]}>{item.label}</Text>
              <Text style={s.tableCellRight}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={s.tableRowTotals}>
            <Text style={[s.tableCellBold, { flex: 3 }]}>Gross pay</Text>
            <Text style={s.tableCellRightBold}>{formatCurrency(payslip.grossPay)}</Text>
          </View>
        </View>

        {/* Deductions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Deductions</Text>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadCell, { flex: 3 }]}>Description</Text>
            <Text style={s.tableHeadCellRight}>Amount</Text>
          </View>
          {payslip.deductions.map((item) => (
            <View key={item.label} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 3 }]}>{item.label}</Text>
              <Text style={s.tableCellRight}>-{formatCurrency(item.amount)}</Text>
            </View>
          ))}
          <View style={s.tableRowTotals}>
            <Text style={[s.tableCellBold, { flex: 3 }]}>Total deductions</Text>
            <Text style={s.tableCellRightBold}>-{formatCurrency(payslip.totalDeductions)}</Text>
          </View>
        </View>

        {/* Net pay */}
        <View style={s.netPayBox}>
          <Text style={s.netPayLabel}>Net pay</Text>
          <Text style={s.netPayAmount}>{formatCurrency(payslip.netPay)}</Text>
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          Generated by NovaHR · {formatDate(today())}
        </Text>
      </Page>
    </Document>
  );
}
