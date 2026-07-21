"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText, Download, Trash2, Upload, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label, OptionalTag } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Employee } from "@/lib/types";
import {
  deleteEmployeeDocument,
  getEmployeeDocumentUrl,
  listEmployeeDocuments,
  uploadEmployeeDocument,
  type EmployeeDocumentRow,
} from "@/lib/employees/documents";

const CATEGORY_LABELS: Record<string, string> = {
  contract: "Contract",
  id_document: "ID document",
  qualification: "Qualification",
  certificate: "Certificate",
  disciplinary: "Disciplinary",
  medical: "Medical",
  other: "Other",
};

const EXPIRY_SOON_DAYS = 30;

function expiryState(expiresAt: string | null): "none" | "soon" | "expired" {
  if (!expiresAt) return "none";
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  if (exp < now) return "expired";
  if (exp - now <= EXPIRY_SOON_DAYS * 24 * 60 * 60 * 1000) return "soon";
  return "none";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProfileDocuments({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  const canManage = user?.role === "hr";

  const [docs, setDocs] = React.useState<EmployeeDocumentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("contract");
  const [expiresAt, setExpiresAt] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    listEmployeeDocuments(employee.id)
      .then((d) => active && setDocs(d))
      .catch(() => active && toast.error("Could not load documents"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [employee.id]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file to upload");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("employeeId", employee.id);
      fd.set("name", name || file.name);
      fd.set("category", category);
      if (expiresAt) fd.set("expiresAt", expiresAt);
      fd.set("file", file);
      const res = await uploadEmployeeDocument(fd);
      if (res.error || !res.document) {
        toast.error(res.error ?? "Upload failed");
        return;
      }
      setDocs((prev) => [res.document!, ...prev]);
      setName("");
      setExpiresAt("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Document uploaded");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: EmployeeDocumentRow) {
    setDownloadingId(doc.id);
    try {
      const res = await getEmployeeDocumentUrl(doc.id);
      if (res.error || !res.url) {
        toast.error(res.error ?? "Could not open the document");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(doc: EmployeeDocumentRow) {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    try {
      const res = await deleteEmployeeDocument(doc.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Document deleted");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload document</CardTitle>
            <CardDescription>Contracts, ID copies, qualifications and certificates. Stored privately.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-name">Document name</Label>
                <Input
                  id="doc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Employment contract"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="doc-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-expiry">Expiry date <OptionalTag /></Label>
                <Input
                  id="doc-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-file">File</Label>
                <Input id="doc-file" type="file" ref={fileRef} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={uploading}>
                  <Upload />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
          <CardDescription>
            {employee.firstName}&apos;s stored documents. Links are private and expire after a minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents on file yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/60">
              {docs.map((doc) => {
                const exp = expiryState(doc.expiresAt);
                return (
                  <li key={doc.id} className="flex items-center gap-3 py-3">
                    <FileText className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{doc.name}</span>
                        <Badge variant="outline">{CATEGORY_LABELS[doc.category] ?? doc.category}</Badge>
                        {exp === "expired" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="size-3" /> Expired
                          </Badge>
                        )}
                        {exp === "soon" && (
                          <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="size-3" /> Expiring soon
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatSize(doc.sizeBytes)} · Added {formatDate(doc.createdAt)}
                        {doc.expiresAt ? ` · Expires ${formatDate(doc.expiresAt)}` : ""}
                        {doc.uploadedBy ? ` · by ${doc.uploadedBy}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                    >
                      <Download />
                      <span className="sr-only">{downloadingId === doc.id ? "Downloading..." : "Download"}</span>
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                      >
                        <Trash2 />
                        <span className="sr-only">{deletingId === doc.id ? "Deleting..." : "Delete"}</span>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
