export interface SABank {
  name: string;
  universalBranchCode: string;
}

export const SA_BANKS: SABank[] = [
  { name: "Absa Bank", universalBranchCode: "632005" },
  { name: "African Bank", universalBranchCode: "430000" },
  { name: "Bidvest Bank", universalBranchCode: "462005" },
  { name: "Capitec Bank", universalBranchCode: "470010" },
  { name: "Discovery Bank", universalBranchCode: "679000" },
  { name: "First National Bank", universalBranchCode: "250655" },
  { name: "Grindrod Bank", universalBranchCode: "223626" },
  { name: "HBZ Bank", universalBranchCode: "570101" },
  { name: "Investec Bank", universalBranchCode: "580105" },
  { name: "Nedbank", universalBranchCode: "198765" },
  { name: "Sasfin Bank", universalBranchCode: "683000" },
  { name: "Standard Bank", universalBranchCode: "051001" },
  { name: "TymeBank", universalBranchCode: "678910" },
  { name: "Ubank", universalBranchCode: "431010" },
];

export function getBankByName(name: string): SABank | undefined {
  return SA_BANKS.find((b) => b.name.toLowerCase() === name.toLowerCase());
}

export function mapAccountType(raw: string): "1" | "2" | "3" | "9" {
  const t = raw.toLowerCase();
  if (t.includes("savings")) return "2";
  if (t.includes("transmission")) return "3";
  if (t.includes("public")) return "9";
  return "1";
}
