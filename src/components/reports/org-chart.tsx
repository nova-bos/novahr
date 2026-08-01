"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useScopedEmployees } from "@/lib/auth/scope";
import { getInitials } from "@/lib/format";
import type { Employee } from "@/lib/types";

interface Node {
  employee: Employee;
  reports: Node[];
}

/** Build a manager -> reports forest, excluding terminated employees. */
function buildForest(employees: Employee[]): Node[] {
  const active = employees.filter((e) => e.status !== "terminated");
  const byId = new Map(active.map((e) => [e.id, e]));
  const nodes = new Map<string, Node>(active.map((e) => [e.id, { employee: e, reports: [] }]));

  const roots: Node[] = [];
  for (const node of nodes.values()) {
    const managerId = node.employee.managerId;
    // Treat a missing or out-of-scope manager as a root so nobody is dropped.
    if (managerId && byId.has(managerId) && managerId !== node.employee.id) {
      nodes.get(managerId)!.reports.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByName = (a: Node, b: Node) =>
    `${a.employee.firstName} ${a.employee.lastName}`.localeCompare(
      `${b.employee.firstName} ${b.employee.lastName}`
    );
  const sortTree = (list: Node[]) => {
    list.sort(sortByName);
    list.forEach((n) => sortTree(n.reports));
  };
  sortTree(roots);
  return roots;
}

function OrgNode({ node, depth }: { node: Node; depth: number }) {
  const router = useRouter();
  const { employee } = node;
  return (
    <li>
      <button
        type="button"
        onClick={() => router.push(`/employees/${employee.id}`)}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:bg-accent"
        style={{ marginLeft: depth > 0 ? 0 : undefined }}
      >
        <Avatar className="size-8">
          <AvatarFallback style={{ backgroundColor: employee.avatarColor }} className="text-xs text-white">
            {getInitials(employee.firstName, employee.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {employee.firstName} {employee.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{employee.jobTitle}</p>
        </div>
        {node.reports.length > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {node.reports.length} report{node.reports.length === 1 ? "" : "s"}
          </span>
        )}
      </button>
      {node.reports.length > 0 && (
        <ul className="ml-4 mt-2 flex flex-col gap-2 border-l border-border pl-4">
          {node.reports.map((child) => (
            <OrgNode key={child.employee.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChart() {
  const employees = useScopedEmployees();
  const forest = React.useMemo(() => buildForest(employees), [employees]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organisation chart</CardTitle>
        <CardDescription>
          Reporting lines built from each employee&rsquo;s manager. Select a person to open their
          profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {forest.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No employees to display.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {forest.map((node) => (
              <OrgNode key={node.employee.id} node={node} depth={0} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
