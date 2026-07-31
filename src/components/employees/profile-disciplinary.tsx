"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-provider";
import type { DisciplinaryRecord, DisciplinaryType, Employee } from "@/lib/types";
import {
  createDisciplinaryRecordAction,
  deleteDisciplinaryRecordAction,
  getDisciplinaryRecordsAction,
} from "@/lib/disciplinary/actions";

const TYPE_LABELS: Record<DisciplinaryType, string> = {
  counselling: "Counselling",
  warning_verbal: "Verbal warning",
  warning_written: "Written warning",
  final_warning: "Final warning",
  suspension: "Suspension",
  dismissal: "Dismissal",
};

const TYPE_VARIANT: Record<DisciplinaryType, "outline" | "destructive" | "secondary"> = {
  counselling: "outline",
  warning_verbal: "secondary",
  warning_written: "secondary",
  final_warning: "destructive",
  suspension: "destructive",
  dismissal: "destructive",
};

function isExpired(record: DisciplinaryRecord): boolean {
  if (!record.expiresAt) return false;
  return new Date(record.expiresAt) < new Date();
}

export function ProfileDisciplinary({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const canManage = user?.role === "hr";
  const [records, setRecords] = React.useState<DisciplinaryRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [isSaving, startSaveTransition] = React.useTransition();

  const [type, setType] = React.useState<DisciplinaryType>("warning_verbal");
  const [description, setDescription] = React.useState("");
  const [issuedAt, setIssuedAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [expiresAt, setExpiresAt] = React.useState("");

  React.useEffect(() => {
    getDisciplinaryRecordsAction(employee.id)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setIsLoading(false));
  }, [employee.id]);

  function handleCreate() {
    startSaveTransition(async () => {
      try {
        const record = await createDisciplinaryRecordAction({
          employeeId: employee.id,
          type,
          description,
          issuedAt,
          expiresAt: expiresAt || null,
        });
        setRecords((prev) => [record, ...prev]);
        setOpen(false);
        setDescription("");
        setExpiresAt("");
        toast.success("Record added.");
      } catch (err) {
        toast.error("Could not add record", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  async function handleDelete(id: string) {
    try {
      await deleteDisciplinaryRecordAction(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Record removed.");
    } catch {
      toast.error("Could not remove record.");
    }
  }

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-muted-foreground" />
            <CardTitle>Disciplinary records</CardTitle>
          </div>
          <Dialog open={open} onOpenChange={(o) => !isSaving && setOpen(o)}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 size-4" />
                Add record
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add disciplinary record</DialogTitle>
                <DialogDescription>
                  Log a formal disciplinary or counselling action for{" "}
                  {employee.firstName} {employee.lastName}.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="disc-type">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as DisciplinaryType)}>
                    <SelectTrigger id="disc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_LABELS) as DisciplinaryType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="disc-issued">Date issued</Label>
                  <Input
                    id="disc-issued"
                    type="date"
                    value={issuedAt}
                    onChange={(e) => setIssuedAt(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="disc-expires">
                    Expiry date{" "}
                    <span className="text-xs text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="disc-expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    placeholder="Leave blank if this does not expire"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="disc-desc">Description</Label>
                  <Textarea
                    id="disc-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the incident or hearing outcome..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isSaving || !description.trim() || !issuedAt}
                >
                  {isSaving ? "Saving..." : "Add record"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No disciplinary records on file.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {records.map((r) => {
              const expired = isExpired(r);
              return (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={TYPE_VARIANT[r.type as DisciplinaryType]}>
                        {TYPE_LABELS[r.type as DisciplinaryType] ?? r.type}
                      </Badge>
                      {expired ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Expired
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued {formatDate(r.issuedAt)}{" "}
                      {r.expiresAt ? `· Expires ${formatDate(r.expiresAt)}` : ""}
                      {" "}· {r.createdBy}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(r.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
