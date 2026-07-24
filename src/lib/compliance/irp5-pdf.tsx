import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/format";
import type { Irp5FullCertificate } from "./irp5-actions";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8.5, color: "#1a1a1a", paddingVertical: 34, paddingHorizontal: 40, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },
  titleSub: { fontSize: 8, color: "#555", textAlign: "right", marginTop: 2 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap" },
  metaCell: { width: "25%", marginBottom: 6, paddingRight: 8 },
  metaLabel: { fontSize: 6.5, color: "#888" },
  metaValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginTop: 1 },
  band: { backgroundColor: "#e9e9ee", paddingVertical: 3, paddingHorizontal: 6, marginTop: 8, marginBottom: 6, fontSize: 8, fontFamily: "Helvetica-Bold", color: "#333", textTransform: "uppercase", letterSpacing: 0.3 },
  twoCol: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  idGrid: { flexDirection: "row", flexWrap: "wrap" },
  idCell: { width: "50%", marginBottom: 5, paddingRight: 8 },
  idCellFull: { width: "100%", marginBottom: 5 },
  idLabel: { fontSize: 6.5, color: "#888" },
  idValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginTop: 1 },
  tHead: { flexDirection: "row", backgroundColor: "#f2f2f5", paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: "#ccc" },
  tHeadCode: { width: 46, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#555" },
  tHeadDesc: { flex: 1, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#555" },
  tHeadAmt: { width: 90, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#555", textAlign: "right" },
  row: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  code: { width: 46, fontSize: 8.5 },
  desc: { flex: 1, fontSize: 8.5 },
  amt: { width: 90, fontSize: 8.5, textAlign: "right" },
  totalRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5, backgroundColor: "#f2f2f5" },
  codeB: { width: 46, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  descB: { flex: 1, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  amtB: { width: 90, fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "right" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, textAlign: "center", fontSize: 6.5, color: "#999", borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 6 },
});

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={full ? s.idCellFull : s.idCell}>
      <Text style={s.idLabel}>{label}</Text>
      <Text style={s.idValue}>{value || "-"}</Text>
    </View>
  );
}

export function Irp5Document({ cert }: { cert: Irp5FullCertificate }) {
  const { employee: e, employer: r, payPeriods: p, certificate: c } = cert;
  return (
    <Document title={`${c.type} ${e.surname} ${cert.taxYear}`}>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold" }}>{r.name}</Text>
            <Text style={{ fontSize: 7, color: "#666", marginTop: 1 }}>{r.address}</Text>
          </View>
          <View>
            <Text style={s.title}>Employee Income Tax Certificate</Text>
            <Text style={s.titleSub}>Type of Certificate: {c.type}</Text>
          </View>
        </View>

        <View style={s.metaGrid}>
          <View style={s.metaCell}><Text style={s.metaLabel}>Year of Assessment</Text><Text style={s.metaValue}>{cert.yearOfAssessment}</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Period of Reconciliation</Text><Text style={s.metaValue}>{cert.periodOfReconciliation}</Text></View>
          <View style={[s.metaCell, { width: "50%" }]}><Text style={s.metaLabel}>Certificate No.</Text><Text style={s.metaValue}>{cert.certificateNumber}</Text></View>
        </View>

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.band}>Employee Information</Text>
            <View style={s.idGrid}>
              <Field label="Surname" value={e.surname} />
              <Field label="First names" value={e.firstNames} />
              <Field label="Initials" value={e.initials} />
              <Field label="Nature of Person" value={e.natureOfPerson} />
              <Field label="Date of Birth (CCYYMMDD)" value={e.dateOfBirth} />
              <Field label="ID No." value={e.idNumber} />
              <Field label="Income Tax Ref No." value={e.taxNumber} />
              <Field label="Employee No." value={e.employeeNumber} />
              <Field label="Residential Address" value={e.residentialAddress} full />
            </View>
          </View>
          <View style={s.col}>
            <Text style={s.band}>Employer Reference Numbers</Text>
            <View style={s.idGrid}>
              <Field label="PAYE Ref No." value={r.payeRef} />
              <Field label="SDL Ref No." value={r.sdlRef} />
              <Field label="UIF Ref No." value={r.uifRef} />
            </View>
            <Text style={s.band}>Bank Account Details</Text>
            <View style={s.idGrid}>
              <Field label="Bank Name" value={e.bank.name} />
              <Field label="Account Type" value={e.bank.accountType} />
              <Field label="Account No." value={e.bank.accountNumber} />
              <Field label="Branch No." value={e.bank.branchCode} />
              <Field label="Account Holder" value={e.bank.holderName} full />
            </View>
          </View>
        </View>

        <Text style={s.band}>Pay Periods</Text>
        <View style={s.idGrid}>
          <Field label="Periods in Year of Assessment" value={p.periodsInYear.toFixed(4)} />
          <Field label="No. of Periods Worked" value={p.periodsWorked.toFixed(4)} />
          <Field label="Period Employed From (CCYYMMDD)" value={p.employedFrom} />
          <Field label="Period Employed To (CCYYMMDD)" value={p.employedTo} />
        </View>

        <Text style={s.band}>Income Received</Text>
        <View style={s.tHead}><Text style={s.tHeadCode}>Code</Text><Text style={s.tHeadDesc}>Description</Text><Text style={s.tHeadAmt}>Amount</Text></View>
        {c.incomeLines.map((l) => (
          <View key={l.code} style={s.row}><Text style={s.code}>{l.code}</Text><Text style={s.desc}>{l.label}</Text><Text style={s.amt}>{formatCurrency(l.amount)}</Text></View>
        ))}
        <View style={s.totalRow}><Text style={s.codeB}>3699</Text><Text style={s.descB}>Gross employment income</Text><Text style={s.amtB}>{formatCurrency(c.grossRemuneration)}</Text></View>

        <Text style={s.band}>Deductions / Contributions and Tax Withheld</Text>
        <View style={s.tHead}><Text style={s.tHeadCode}>Code</Text><Text style={s.tHeadDesc}>Description</Text><Text style={s.tHeadAmt}>Amount</Text></View>
        {c.deductionLines.map((l) => (
          <View key={l.code} style={s.row}><Text style={s.code}>{l.code}</Text><Text style={s.desc}>{l.label}</Text><Text style={s.amt}>{formatCurrency(l.amount)}</Text></View>
        ))}
        <View style={s.row}><Text style={s.code}>4102</Text><Text style={s.desc}>PAYE</Text><Text style={s.amt}>{formatCurrency(c.paye)}</Text></View>
        <View style={s.row}><Text style={s.code}>4141</Text><Text style={s.desc}>UIF contribution (employer and employee)</Text><Text style={s.amt}>{formatCurrency(c.totalUif)}</Text></View>
        {c.sdl > 0 ? (
          <View style={s.row}><Text style={s.code}>4142</Text><Text style={s.desc}>SDL contribution</Text><Text style={s.amt}>{formatCurrency(c.sdl)}</Text></View>
        ) : null}
        <View style={s.totalRow}><Text style={s.codeB}>4149</Text><Text style={s.descB}>Total Tax, SDL and UIF</Text><Text style={s.amtB}>{formatCurrency(c.totalTaxSdlUif)}</Text></View>

        <Text style={s.footer}>
          Generated by NovaHR. This is a draft certificate for record purposes. Source codes and the certificate number must be verified against the current SARS PAYE BRS, and the certificate submitted through SARS e@syFile, before filing.
        </Text>
      </Page>
    </Document>
  );
}
