"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { useAuth } from "@/lib/auth/auth-provider";
import { useCurrentTenant } from "@/lib/store/hooks";
import { closeTenantAccount } from "@/lib/tenant/close-account-actions";

export function CloseAccountCard() {
  const { user, logout } = useAuth();
  const tenant = useCurrentTenant();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Only the HR administrator can close the whole account.
  if (user?.role !== "hr") return null;

  const canDelete = confirmText.trim() === tenant.name.trim();

  async function handleDelete() {
    if (!canDelete) return;
    setSubmitting(true);
    setError("");
    const res = await closeTenantAccount(confirmText);
    if (!res.success) {
      setError(res.error ?? "Could not close the account. Please try again.");
      setSubmitting(false);
      return;
    }
    toast.success("Your account has been closed.");
    await logout();
    router.replace("/login");
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          Danger zone
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Close this account</p>
          <p className="text-xs text-muted-foreground">
            Permanently delete {tenant.name}, along with every employee, payroll run and record.
            This cannot be undone.
          </p>
        </div>
        <Button variant="destructive" className="shrink-0" onClick={() => setOpen(true)}>
          Close account
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setConfirmText("");
            setError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close {tenant.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes your company, every employee record, all payroll history and
              your settings. Your login and everyone else&apos;s will stop working immediately. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              Type <span className="font-semibold text-foreground">{tenant.name}</span> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError("");
              }}
              placeholder={tenant.name}
              autoComplete="off"
            />
            {error && <FormAlert tone="error">{error}</FormAlert>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || submitting}>
              {submitting ? "Closing..." : "Permanently close account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
