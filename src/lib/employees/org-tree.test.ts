import { describe, it, expect } from "vitest";
import { buildOrgForest, type OrgNode } from "./org-tree";
import type { Employee } from "@/lib/types";

function emp(over: Partial<Employee> & { id: string }): Employee {
  return {
    tenantId: "t",
    employeeNumber: over.id,
    firstName: over.firstName ?? over.id,
    lastName: over.lastName ?? "Z",
    email: `${over.id}@x.co`,
    phone: "",
    avatarColor: "#000",
    initials: "XX",
    jobTitle: "Staff",
    department: "Ops",
    employmentType: "full_time",
    status: over.status ?? "active",
    startDate: "2024-01-01",
    location: "CPT",
    managerId: over.managerId,
    // Minimal salary/bank/identity to satisfy the type; irrelevant to the tree.
    salary: { annualGross: 0, currency: "ZAR", payFrequency: "monthly" },
    bankDetails: { bank: "", accountNumber: "", branchCode: "", accountType: "Cheque" },
    emergencyContact: { name: "", relationship: "", phone: "" },
    taxNumber: "",
    idNumber: "",
    idType: "sa_id",
    address: "",
    leaveBalances: [],
    ...over,
  } as Employee;
}

function ids(nodes: OrgNode[]): string[] {
  return nodes.map((n) => n.employee.id);
}

describe("buildOrgForest", () => {
  it("nests reports under their manager", () => {
    const forest = buildOrgForest([
      emp({ id: "ceo" }),
      emp({ id: "cfo", managerId: "ceo" }),
      emp({ id: "clerk", managerId: "cfo" }),
    ]);
    expect(ids(forest)).toEqual(["ceo"]);
    expect(ids(forest[0].reports)).toEqual(["cfo"]);
    expect(ids(forest[0].reports[0].reports)).toEqual(["clerk"]);
  });

  it("treats a missing or out-of-scope manager as a root", () => {
    const forest = buildOrgForest([
      emp({ id: "a", managerId: "ghost" }),
      emp({ id: "b" }),
    ]);
    expect(ids(forest).sort()).toEqual(["a", "b"]);
  });

  it("does not let an employee be their own manager", () => {
    const forest = buildOrgForest([emp({ id: "loop", managerId: "loop" })]);
    expect(ids(forest)).toEqual(["loop"]);
    expect(forest[0].reports).toEqual([]);
  });

  it("excludes terminated employees", () => {
    const forest = buildOrgForest([
      emp({ id: "ceo" }),
      emp({ id: "gone", managerId: "ceo", status: "terminated" }),
    ]);
    expect(forest[0].reports).toEqual([]);
  });

  it("sorts each level by full name", () => {
    const forest = buildOrgForest([
      emp({ id: "boss" }),
      emp({ id: "z", firstName: "Zara", managerId: "boss" }),
      emp({ id: "a", firstName: "Amy", managerId: "boss" }),
    ]);
    expect(forest[0].reports.map((n) => n.employee.firstName)).toEqual(["Amy", "Zara"]);
  });
});
