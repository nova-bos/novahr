"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SA_BANKS, getBankByName } from "@/lib/services/netcash/helpers";
import { bankAccountNumber } from "@/lib/schemas/sa";
import { useApp } from "@/lib/store/app-provider";
import type { Employee } from "@/lib/types";

interface EditBankDetailsDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (details: {
    bank: string;
    accountNumber: string;
    branchCode: string;
    accountType: "Cheque" | "Savings";
  }) => void;
}

export function EditBankDetailsDialog({
  employee,
  open,
  onOpenChange,
  onSaved,
}: EditBankDetailsDialogProps) {
  const { updateEmployee } = useApp();
  const [bank, setBank] = React.useState(employee.bankDetails.bank);
  const [accountNumber, setAccountNumber] = React.useState(employee.bankDetails.accountNumber);
  const [accountType, setAccountType] = React.useState(employee.bankDetails.accountType);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, startSaving] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setBank(employee.bankDetails.bank);
      setAccountNumber(employee.bankDetails.accountNumber);
      setAccountType(employee.bankDetails.accountType);
      setError(null);
    }
  }, [open, employee]);

  function handleSave() {
    const selectedBank = getBankByName(bank);
    if (!selectedBank) {
      setError("Select the employee's bank.");
      return;
    }
    const parsed = bankAccountNumber.safeParse(accountNumber.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid account number.");
      return;
    }
    setError(null);

    startSaving(async () => {
      try {
        const details = {
          bank: selectedBank.name,
          accountNumber: accountNumber.trim(),
          branchCode: selectedBank.universalBranchCode,
          accountType,
          validated: false,
          validatedAt: null,
        };
        await updateEmployee(employee.id, { bankDetails: details });
        onSaved(details);
        onOpenChange(false);
        toast.success("Banking details updated", {
          description: "The account must be verified again before the next pay run.",
        });
      } catch (err) {
        toast.error("Could not update banking details", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit banking details</DialogTitle>
          <DialogDescription>
            Salary payments for {employee.firstName} {employee.lastName} will go to this account.
            Changing it clears the verified status until the account is verified again.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-bank">Bank</Label>
            <Select value={bank} onValueChange={setBank} disabled={saving}>
              <SelectTrigger id="edit-bank" className="w-full">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {SA_BANKS.map((b) => (
                  <SelectItem key={b.name} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The branch code is set automatically from the bank&apos;s universal branch code.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-account-number">Account number</Label>
              <Input
                id="edit-account-number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 62123456789"
                inputMode="numeric"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-account-type">Account type</Label>
              <Select
                value={accountType}
                onValueChange={(v) => setAccountType(v as "Cheque" | "Savings")}
                disabled={saving}
              >
                <SelectTrigger id="edit-account-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? "Saving..." : "Save banking details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
