import type { Employee } from "@/lib/types";

export interface OrgNode {
  employee: Employee;
  reports: OrgNode[];
}

/**
 * Builds a manager -> reports forest from a flat employee list. Terminated
 * employees are excluded. An employee whose manager is missing, out of scope, or
 * themselves becomes a root, so nobody is ever dropped. Each level is sorted by
 * full name.
 */
export function buildOrgForest(employees: Employee[]): OrgNode[] {
  const active = employees.filter((e) => e.status !== "terminated");
  const byId = new Map(active.map((e) => [e.id, e]));
  const nodes = new Map<string, OrgNode>(active.map((e) => [e.id, { employee: e, reports: [] }]));

  const roots: OrgNode[] = [];
  for (const node of nodes.values()) {
    const managerId = node.employee.managerId;
    if (managerId && byId.has(managerId) && managerId !== node.employee.id) {
      nodes.get(managerId)!.reports.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByName = (a: OrgNode, b: OrgNode) =>
    `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(
      `${b.employee.firstName} ${b.employee.lastName}`
    );
  const sortTree = (list: OrgNode[]) => {
    list.sort(sortByName);
    list.forEach((n) => sortTree(n.reports));
  };
  sortTree(roots);
  return roots;
}
