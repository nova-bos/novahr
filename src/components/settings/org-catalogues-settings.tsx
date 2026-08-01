"use client";

import * as React from "react";
import { toast } from "sonner";
import { Briefcase, Layers, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  listJobPositionsAction,
  createJobPositionAction,
  deleteJobPositionAction,
  listCostCentresAction,
  createCostCentreAction,
  deleteCostCentreAction,
  type JobPositionDto,
  type CostCentreDto,
} from "@/lib/org-catalogues/actions";

function JobPositionsCard() {
  const [rows, setRows] = React.useState<JobPositionDto[]>([]);
  const [title, setTitle] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [saving, startSave] = React.useTransition();

  React.useEffect(() => {
    listJobPositionsAction().then(setRows).catch(() => setRows([]));
  }, []);

  function add() {
    if (title.trim().length < 2) return;
    startSave(async () => {
      try {
        const row = await createJobPositionAction({ title, grade: grade || undefined });
        setRows((prev) => [...prev, row].sort((a, b) => a.title.localeCompare(b.title)));
        setTitle("");
        setGrade("");
      } catch (err) {
        toast.error("Could not add position", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  async function remove(id: string) {
    try {
      await deleteJobPositionAction(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("Could not remove position.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="size-4 text-muted-foreground" />
          Job positions
        </CardTitle>
        <CardDescription>
          A canonical list of positions (with optional grade/band) suggested when capturing an
          employee&rsquo;s job title.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Payroll Administrator"
            className="flex-1"
          />
          <Input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Grade (optional)"
            className="sm:w-40"
          />
          <Button type="button" variant="outline" onClick={add} disabled={saving || title.trim().length < 2}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No positions defined yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.title}</span>
                  {r.grade ? <Badge variant="secondary">{r.grade}</Badge> : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CostCentresCard() {
  const [rows, setRows] = React.useState<CostCentreDto[]>([]);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [saving, startSave] = React.useTransition();

  React.useEffect(() => {
    listCostCentresAction().then(setRows).catch(() => setRows([]));
  }, []);

  function add() {
    if (name.trim().length < 2) return;
    startSave(async () => {
      try {
        const row = await createCostCentreAction({ name, code: code || undefined });
        setRows((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
        setName("");
        setCode("");
      } catch (err) {
        toast.error("Could not add cost centre", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  async function remove(id: string) {
    try {
      const { reassigned } = await deleteCostCentreAction(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (reassigned > 0) {
        toast.info(`${reassigned} employee${reassigned === 1 ? "" : "s"} unlinked from this cost centre.`);
      }
    } catch {
      toast.error("Could not remove cost centre.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="size-4 text-muted-foreground" />
          Cost centres
        </CardTitle>
        <CardDescription>
          Allocate payroll cost across cost centres. Assign an employee&rsquo;s cost centre on their
          profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Operations"
            className="flex-1"
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code (optional)"
            className="sm:w-40"
          />
          <Button type="button" variant="outline" onClick={add} disabled={saving || name.trim().length < 2}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cost centres defined yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  {r.code ? <Badge variant="secondary">{r.code}</Badge> : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrgCataloguesSettings() {
  return (
    <div className="flex flex-col gap-6">
      <JobPositionsCard />
      <CostCentresCard />
    </div>
  );
}
