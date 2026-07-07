"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { getCurrentTaxYear } from "@/lib/compliance/utils";
import {
  getEmp501ReconciliationAction,
  getTaxYearCertificatesAction,
  type Emp501Reconciliation,
  type EmployeeCertificate,
} from "@/lib/compliance/irp5-actions";

function taxYearOptions(): string[] {
  const current = getCurrentTaxYear();
  const start = Number(current.split("/")[0]);
  return [0, 1, 2].map((back) => `${start - back}/${start - back + 1}`);
}

function ReconRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className="tabular-nums">{formatCurrency(value)}</span>
    </div>
  );
}

export function Emp501Panel({ tenantId }: { tenantId: string }) {
  const [taxYear, setTaxYear] = useState(getCurrentTaxYear());
  const [recon, setRecon] = useState<Emp501Reconciliation | null>(null);
  const [certs, setCerts] = useState<EmployeeCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmployeeCertificate | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getEmp501ReconciliationAction(tenantId, taxYear),
      getTaxYearCertificatesAction(tenantId, taxYear),
    ])
      .then(([r, c]) => {
        if (!active) return;
        setRecon(r);
        setCerts(c);
      })
      .catch((err) =>
        toast.error("Could not load year-end data", {
          description: err instanceof Error ? err.message : "Please try again.",
        })
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tenantId, taxYear]);

  const balanced = recon && recon.difference.paye === 0 && recon.difference.uif === 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>EMP501 reconciliation</CardTitle>
              <CardDescription>
                Monthly EMP201 declarations reconciled against the IRP5 and IT3(a) certificates for the tax year.
              </CardDescription>
            </div>
            <Select value={taxYear} onValueChange={setTaxYear}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taxYearOptions().map((ty) => (
                  <SelectItem key={ty} value={ty}>
                    {ty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : recon ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 px-4 py-2">
                  <p className="pb-1 text-xs font-medium text-muted-foreground">Declared (EMP201)</p>
                  <ReconRow label="PAYE" value={recon.declared.paye} />
                  <ReconRow label="UIF" value={recon.declared.uif} />
                  <ReconRow label="SDL" value={recon.declared.sdl} />
                  <ReconRow label="ETI utilised" value={recon.declared.eti} muted />
                </div>
                <div className="rounded-lg border border-border/60 px-4 py-2">
                  <p className="pb-1 text-xs font-medium text-muted-foreground">Certified (IRP5 / IT3a)</p>
                  <ReconRow label="PAYE" value={recon.certified.paye} />
                  <ReconRow label="UIF" value={recon.certified.uif} />
                  <div className="mt-1 border-t border-border/60 pt-1">
                    <ReconRow label="PAYE difference" value={recon.difference.paye} />
                    <ReconRow label="UIF difference" value={recon.difference.uif} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {balanced ? (
                  <Badge variant="secondary">Reconciled</Badge>
                ) : (
                  <Badge variant="destructive">Mismatch to investigate</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {recon.certificateCount} certificates ({recon.irp5Count} IRP5, {recon.it3aCount} IT3a).
                  Interim PAYE (Mar to Aug): {formatCurrency(recon.interim.declaredPaye)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data for {taxYear}.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax certificates</CardTitle>
          <CardDescription>IRP5 and IT3(a) certificates for {taxYear}. Select one to view its source codes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : certs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No certificates yet. Complete payroll runs in this tax year first.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Gross remuneration</TableHead>
                  <TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">UIF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certs.map((c) => (
                  <TableRow
                    key={c.employeeId}
                    className="cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.certificate.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(c.certificate.grossRemuneration)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(c.certificate.paye)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(c.certificate.uif)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.certificate.type} certificate: {selected.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Employee no: {selected.employeeNumber}</span>
                  <span>Tax year: {selected.taxYear}</span>
                  <span>ID: {selected.idNumber}</span>
                  <span>Tax no: {selected.taxNumber}</span>
                </div>

                <div>
                  <p className="pb-1 text-xs font-medium text-muted-foreground">Income</p>
                  {selected.certificate.incomeLines.map((l) => (
                    <div key={l.code} className="flex justify-between py-0.5">
                      <span>{l.code} {l.label}</span>
                      <span className="tabular-nums">{formatCurrency(l.amount)}</span>
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between border-t border-border/60 pt-1 font-semibold">
                    <span>3699 Gross remuneration</span>
                    <span className="tabular-nums">{formatCurrency(selected.certificate.grossRemuneration)}</span>
                  </div>
                </div>

                {selected.certificate.deductionLines.length > 0 && (
                  <div>
                    <p className="pb-1 text-xs font-medium text-muted-foreground">Deductions</p>
                    {selected.certificate.deductionLines.map((l) => (
                      <div key={l.code} className="flex justify-between py-0.5">
                        <span>{l.code} {l.label}</span>
                        <span className="tabular-nums">{formatCurrency(l.amount)}</span>
                      </div>
                    ))}
                    <div className="mt-1 flex justify-between border-t border-border/60 pt-1 font-semibold">
                      <span>4103 Total deductions</span>
                      <span className="tabular-nums">{formatCurrency(selected.certificate.totalDeductions)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="pb-1 text-xs font-medium text-muted-foreground">Tax</p>
                  <div className="flex justify-between py-0.5">
                    <span>4102 PAYE</span>
                    <span className="tabular-nums">{formatCurrency(selected.certificate.paye)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>4141 UIF</span>
                    <span className="tabular-nums">{formatCurrency(selected.certificate.uif)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
