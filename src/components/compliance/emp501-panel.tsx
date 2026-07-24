"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toCSV, downloadCSV } from "@/lib/export/csv";
import { getCurrentTaxYear } from "@/lib/compliance/utils";
import {
  getEmp501ReconciliationAction,
  getTaxYearCertificatesAction,
  getIrp5CertificateDataAction,
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function downloadIrp5Pdfs(employeeId?: string) {
    setDownloadingPdf(true);
    try {
      const [{ pdf }, { Irp5Document }, JSZip, full] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/compliance/irp5-pdf"),
        import("jszip").then((m) => m.default),
        getIrp5CertificateDataAction(tenantId, taxYear),
      ]);
      const list = employeeId ? full.filter((f) => f.employeeId === employeeId) : full;
      if (list.length === 0) {
        toast.error("No certificate data to download.");
        return;
      }
      if (list.length === 1) {
        const blob = await pdf(<Irp5Document cert={list[0]} />).toBlob();
        triggerDownload(blob, `${list[0].certificate.type}-${list[0].employee.surname}-${fileYear}.pdf`);
      } else {
        const zip = new JSZip();
        for (const cert of list) {
          const blob = await pdf(<Irp5Document cert={cert} />).toBlob();
          zip.file(`${cert.certificate.type}-${cert.employee.surname}-${cert.employee.employeeNumber}.pdf`, await blob.arrayBuffer());
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        triggerDownload(zipBlob, `irp5-certificates-${fileYear}.zip`);
      }
    } catch (err) {
      toast.error("Could not generate certificates", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDownloadingPdf(false);
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
  const fileYear = taxYear.replace("/", "-");

  function handleExportRecon() {
    if (!recon) return;
    const csv = toCSV(
      ["Line", "Declared (EMP201)", "Certified (IRP5/IT3a)", "Difference"],
      [
        ["PAYE", recon.declared.paye.toFixed(2), recon.certified.paye.toFixed(2), recon.difference.paye.toFixed(2)],
        ["UIF", recon.declared.uif.toFixed(2), recon.certified.uif.toFixed(2), recon.difference.uif.toFixed(2)],
        ["SDL", recon.declared.sdl.toFixed(2), "", ""],
        ["ETI utilised", recon.declared.eti.toFixed(2), "", ""],
      ]
    );
    downloadCSV(csv, `emp501-reconciliation-${fileYear}`);
  }

  function handleExportCertificates() {
    if (certs.length === 0) return;
    const csv = toCSV(
      ["Employee", "Type", "Gross remuneration", "PAYE", "UIF"],
      certs.map((c) => [
        c.name,
        c.certificate.type,
        c.certificate.grossRemuneration.toFixed(2),
        c.certificate.paye.toFixed(2),
        c.certificate.uif.toFixed(2),
      ])
    );
    downloadCSV(csv, `irp5-certificates-${fileYear}`);
  }

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
            <div className="flex items-center gap-2">
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
              {recon && (
                <Button variant="outline" size="sm" onClick={handleExportRecon}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
              )}
            </div>
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
          {certs.length > 0 && (
            <CardAction className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCertificates}>
                <Download className="size-4" />
                Export CSV
              </Button>
              <Button size="sm" onClick={() => downloadIrp5Pdfs()} disabled={downloadingPdf}>
                <FileText className="size-4" />
                {downloadingPdf ? "Generating..." : "Download IRP5 PDFs"}
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : certs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No certificates yet. Complete payroll runs in this tax year first.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
            <Table className="min-w-[560px] w-full">
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
            </div>
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

                <Button
                  variant="outline"
                  className="mt-1"
                  onClick={() => downloadIrp5Pdfs(selected.employeeId)}
                  disabled={downloadingPdf}
                >
                  <FileText className="size-4" />
                  {downloadingPdf ? "Generating..." : `Download ${selected.certificate.type} PDF`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
