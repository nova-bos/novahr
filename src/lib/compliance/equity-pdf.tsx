import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/format";
import {
  RACE_COLUMNS,
  type Eea2Cell,
  type EquityForms,
  type RaceColumn,
} from "./equity-forms";

const RACE_ABBR: Record<RaceColumn, string> = {
  african: "Af",
  coloured: "Co",
  indian: "In",
  white: "Wh",
  other: "Ot",
  foreign: "FN",
};

const LEVEL_W = 120;
const RACE_W = 26;
const NUM_W = 40;

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, color: "#1a1a1a", paddingVertical: 28, paddingHorizontal: 30, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  formTitle: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  formSub: { fontSize: 8, color: "#555", marginTop: 2 },
  company: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right" },
  companySub: { fontSize: 7, color: "#666", textAlign: "right", marginTop: 1 },
  band: { backgroundColor: "#e9e9ee", paddingVertical: 3, paddingHorizontal: 6, marginTop: 10, marginBottom: 4, fontSize: 8, fontFamily: "Helvetica-Bold", color: "#333", textTransform: "uppercase", letterSpacing: 0.3 },
  groupHead: { flexDirection: "row", backgroundColor: "#dcdce4", borderBottomWidth: 0.5, borderBottomColor: "#bbb" },
  subHead: { flexDirection: "row", backgroundColor: "#f2f2f5", borderBottomWidth: 0.5, borderBottomColor: "#ccc" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  totalRow: { flexDirection: "row", backgroundColor: "#f2f2f5", borderTopWidth: 0.5, borderTopColor: "#bbb" },
  cellLevel: { width: LEVEL_W, paddingVertical: 3, paddingHorizontal: 4, fontSize: 7.5 },
  cellLevelB: { width: LEVEL_W, paddingVertical: 3, paddingHorizontal: 4, fontSize: 7.5, fontFamily: "Helvetica-Bold" },
  cellRace: { width: RACE_W, paddingVertical: 3, textAlign: "center", fontSize: 7.5 },
  cellNum: { width: NUM_W, paddingVertical: 3, textAlign: "center", fontSize: 7.5 },
  cellNumR: { width: NUM_W + 30, paddingVertical: 3, textAlign: "right", paddingRight: 6, fontSize: 7.5 },
  headTxt: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "#444" },
  groupTxt: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#333", textAlign: "center", paddingVertical: 2 },
  note: { marginTop: 10, fontSize: 7, color: "#777" },
  footer: { position: "absolute", bottom: 16, left: 30, right: 30, textAlign: "center", fontSize: 6.5, color: "#999", borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 5 },
});

function GenderCells({ counts }: { counts: Record<RaceColumn, number> }) {
  return (
    <>
      {RACE_COLUMNS.map((c) => (
        <Text key={c} style={s.cellRace}>
          {counts[c] || "-"}
        </Text>
      ))}
    </>
  );
}

function Eea2Row({ label, cell, bold }: { label: string; cell: Eea2Cell; bold?: boolean }) {
  return (
    <View style={bold ? s.totalRow : s.row}>
      <Text style={bold ? s.cellLevelB : s.cellLevel}>{label}</Text>
      <GenderCells counts={cell.male} />
      <GenderCells counts={cell.female} />
      <Text style={s.cellNum}>{cell.disability || "-"}</Text>
      <Text style={s.cellNum}>{cell.total}</Text>
    </View>
  );
}

export function EquityFormsDocument({
  forms,
  companyName,
}: {
  forms: EquityForms;
  companyName: string;
}) {
  return (
    <Document title={`Employment Equity EEA2 EEA4 ${forms.asAt}`}>
      {/* EEA2 workforce profile */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.formTitle}>EEA2</Text>
            <Text style={s.formSub}>Workforce profile by occupational level</Text>
          </View>
          <View>
            <Text style={s.company}>{companyName}</Text>
            <Text style={s.companySub}>Snapshot as at {forms.asAt} · {forms.headcount} employees</Text>
          </View>
        </View>

        <Text style={s.band}>Number of employees by occupational level, population group and gender</Text>

        <View style={s.groupHead}>
          <Text style={[s.cellLevel, { fontFamily: "Helvetica-Bold" }]}>Occupational level</Text>
          <Text style={[s.groupTxt, { width: RACE_W * 6 }]}>Male</Text>
          <Text style={[s.groupTxt, { width: RACE_W * 6 }]}>Female</Text>
          <Text style={[s.cellNum, s.headTxt, { paddingVertical: 4 }]}>Disab.</Text>
          <Text style={[s.cellNum, s.headTxt, { paddingVertical: 4 }]}>Total</Text>
        </View>
        <View style={s.subHead}>
          <Text style={s.cellLevel}> </Text>
          {RACE_COLUMNS.map((c) => (
            <Text key={`m-${c}`} style={[s.cellRace, s.headTxt]}>
              {RACE_ABBR[c]}
            </Text>
          ))}
          {RACE_COLUMNS.map((c) => (
            <Text key={`f-${c}`} style={[s.cellRace, s.headTxt]}>
              {RACE_ABBR[c]}
            </Text>
          ))}
          <Text style={s.cellNum}> </Text>
          <Text style={s.cellNum}> </Text>
        </View>

        {forms.eea2Rows.map((r) => (
          <Eea2Row key={r.level} label={r.label} cell={r.cell} />
        ))}
        <Eea2Row label="Total" cell={forms.eea2Totals} bold />

        <Text style={s.note}>
          Population groups: Af African · Co Coloured · In Indian · Wh White · Ot Other/unspecified ·
          FN Foreign national. Generated by NovaHR; verify against the current Department of
          Employment and Labour EEA2 form before submission.
        </Text>
        <Text style={s.footer} fixed>
          NovaHR Employment Equity report · not an official Department of Employment and Labour form
        </Text>
      </Page>

      {/* EEA4 income differentials */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.formTitle}>EEA4</Text>
            <Text style={s.formSub}>Income differentials by occupational level and gender</Text>
          </View>
          <View>
            <Text style={s.company}>{companyName}</Text>
            <Text style={s.companySub}>Snapshot as at {forms.asAt}</Text>
          </View>
        </View>

        <Text style={s.band}>Average annual remuneration by occupational level</Text>
        <View style={s.subHead}>
          <Text style={[s.cellLevel, s.headTxt]}>Occupational level</Text>
          <Text style={[s.cellNum, s.headTxt]}>Male n</Text>
          <Text style={[s.cellNumR, s.headTxt]}>Male avg</Text>
          <Text style={[s.cellNum, s.headTxt]}>Female n</Text>
          <Text style={[s.cellNumR, s.headTxt]}>Female avg</Text>
          <Text style={[s.cellNum, s.headTxt]}>Total n</Text>
          <Text style={[s.cellNumR, s.headTxt]}>Overall avg</Text>
        </View>
        {forms.eea4Rows.map((r) => (
          <View key={r.level} style={s.row}>
            <Text style={s.cellLevel}>{r.label}</Text>
            <Text style={s.cellNum}>{r.maleCount || "-"}</Text>
            <Text style={s.cellNumR}>{r.maleCount ? formatCurrency(r.maleAvg) : "-"}</Text>
            <Text style={s.cellNum}>{r.femaleCount || "-"}</Text>
            <Text style={s.cellNumR}>{r.femaleCount ? formatCurrency(r.femaleAvg) : "-"}</Text>
            <Text style={s.cellNum}>{r.total}</Text>
            <Text style={s.cellNumR}>{formatCurrency(r.avg)}</Text>
          </View>
        ))}

        <Text style={s.band}>Average annual remuneration by population group</Text>
        <View style={s.subHead}>
          <Text style={[s.cellLevel, s.headTxt]}>Population group</Text>
          <Text style={[s.cellNum, s.headTxt]}>Employees</Text>
          <Text style={[s.cellNumR, s.headTxt]}>Average</Text>
        </View>
        {forms.eea4ByRace.map((r) => (
          <View key={r.column} style={s.row}>
            <Text style={s.cellLevel}>{r.label}</Text>
            <Text style={s.cellNum}>{r.count}</Text>
            <Text style={s.cellNumR}>{formatCurrency(r.avg)}</Text>
          </View>
        ))}

        <Text style={s.note}>
          Generated by NovaHR; verify against the current Department of Employment and Labour EEA4
          form before submission.
        </Text>
        <Text style={s.footer} fixed>
          NovaHR Employment Equity report · not an official Department of Employment and Labour form
        </Text>
      </Page>
    </Document>
  );
}
