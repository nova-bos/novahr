"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, ChevronRight, Copy, Loader2, Mail, MoreHorizontal, Plus, UserPlus, UserRound, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  createInviteAction,
  getInviteLinkAction,
  getUninvitableEmployeeIdsAction,
  listInvitesAction,
  listTenantUsersAction,
  removeUserAccessAction,
  revokeInviteAction,
  updateUserRoleAction,
  type InviteRow,
  type TenantUserRow,
} from "@/lib/invites/actions";
import { useAuth } from "@/lib/auth/auth-provider";
import { useApp } from "@/lib/store/app-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";
import type { UserRole } from "@/lib/auth/types";

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "employee", label: "Employee", description: "Self-service: own profile, payslips and leave" },
  { value: "manager", label: "Manager", description: "Team visibility and leave approvals" },
  { value: "hr", label: "HR Administrator", description: "Full access including payroll and settings" },
  { value: "exco", label: "Executive", description: "Read-only dashboards, reports and compliance" },
];

const ROLE_BADGE: Record<string, string> = {
  hr: "HR Admin",
  manager: "Manager",
  employee: "Employee",
  exco: "Executive",
};

type BulkRow = {
  employee: Employee;
  selected: boolean;
  role: UserRole;
  status: "idle" | "sending" | "sent" | "failed";
};

function BulkInviteDialog({
  employees,
  open,
  onOpenChange,
  onDone,
}: {
  employees: Employee[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => Promise<void>;
}) {
  const [rows, setRows] = React.useState<BulkRow[]>([]);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setRows(
        employees.map((e) => ({
          employee: e,
          selected: Boolean(e.email),
          role: "employee" as UserRole,
          status: "idle" as const,
        }))
      );
      setSending(false);
    }
  }, [open, employees]);

  const idleSelected = rows.filter((r) => r.selected && r.status === "idle");
  const allSelected = rows.length > 0 && rows.every((r) => r.selected || !r.employee.email);

  function toggleAll() {
    const next = !allSelected;
    setRows((prev) => prev.map((r) => ({ ...r, selected: r.employee.email ? next : false })));
  }

  function toggleRow(id: string) {
    setRows((prev) => prev.map((r) => (r.employee.id === id ? { ...r, selected: !r.selected } : r)));
  }

  function setAllRoles(role: UserRole) {
    setRows((prev) => prev.map((r) => (r.selected && r.status === "idle" ? { ...r, role } : r)));
  }

  function setRowRole(id: string, role: UserRole) {
    setRows((prev) => prev.map((r) => (r.employee.id === id ? { ...r, role } : r)));
  }

  function updateStatus(id: string, status: BulkRow["status"]) {
    setRows((prev) => prev.map((r) => (r.employee.id === id ? { ...r, status } : r)));
  }

  async function handleSend() {
    if (!idleSelected.length) return;
    setSending(true);
    let sentCount = 0;
    let failedCount = 0;
    for (const row of idleSelected) {
      updateStatus(row.employee.id, "sending");
      try {
        const result = await createInviteAction({
          email: row.employee.email!,
          name: `${row.employee.firstName} ${row.employee.lastName}`,
          role: row.role,
          employeeId: row.employee.id,
        });
        if (result.error) {
          failedCount++;
          updateStatus(row.employee.id, "failed");
        } else {
          sentCount++;
          updateStatus(row.employee.id, "sent");
        }
      } catch {
        failedCount++;
        updateStatus(row.employee.id, "failed");
      }
    }
    setSending(false);
    await onDone();
    if (failedCount > 0) {
      toast.warning(
        `${sentCount} sent, ${failedCount} failed`,
        { description: "Check the failed rows and retry individually from the invitations list." }
      );
    } else {
      toast.success(
        `${sentCount} invitation${sentCount === 1 ? "" : "s"} sent`,
        { description: "Each person will receive a link to set up their account." }
      );
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!sending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-xl" noInnerPad>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Invite everyone</DialogTitle>
            <DialogDescription>
              Send invitations to {rows.filter((r) => r.employee.email).length} employees at once. Adjust roles before sending.
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 flex flex-wrap items-center gap-3 border-b bg-muted/30 px-6 py-3">
              <Checkbox
                id="select-all-bulk"
                checked={allSelected}
                onCheckedChange={toggleAll}
                disabled={sending}
              />
              <label
                htmlFor="select-all-bulk"
                className="flex-1 cursor-pointer text-sm font-medium"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs text-muted-foreground">Set selected to:</span>
                <Select onValueChange={(v) => setAllRoles(v as UserRole)} disabled={sending}>
                  <SelectTrigger className="h-7 w-32 text-xs">
                    <SelectValue placeholder="Role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {rows.map((row) => {
              const noEmail = !row.employee.email;
              const isActive = row.status === "idle";
              return (
                <div
                  key={row.employee.id}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/60 px-6 py-3 last:border-b-0",
                    row.status === "sent" && "opacity-50",
                    row.status === "failed" && "bg-destructive/5",
                    noEmail && "opacity-40"
                  )}
                >
                  <div className="flex size-4 shrink-0 items-center justify-center">
                    {row.status === "sending" ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : row.status === "sent" ? (
                      <Check className="size-4 text-success" />
                    ) : row.status === "failed" ? (
                      <X className="size-4 text-destructive" />
                    ) : (
                      <Checkbox
                        checked={row.selected}
                        onCheckedChange={() => toggleRow(row.employee.id)}
                        disabled={sending || noEmail}
                      />
                    )}
                  </div>

                  <Avatar className="size-7 shrink-0">
                    <AvatarFallback
                      className="text-[10px] font-semibold text-white"
                      style={{ backgroundColor: row.employee.avatarColor }}
                    >
                      {row.employee.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.employee.firstName} {row.employee.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {noEmail ? "No email on record" : row.employee.email}
                    </p>
                  </div>

                  {isActive ? (
                    <Select
                      value={row.role}
                      onValueChange={(v) => setRowRole(row.employee.id, v as UserRole)}
                      disabled={!row.selected || sending || noEmail}
                    >
                      <SelectTrigger className="h-7 w-28 shrink-0 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {ROLE_OPTIONS.find((r) => r.value === row.role)?.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="shrink-0 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={sending || idleSelected.length === 0}
              onClick={() => void handleSend()}
            >
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                `Send ${idleSelected.length} invitation${idleSelected.length === 1 ? "" : "s"}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function groupByDepartment(employees: Employee[]): Record<string, Employee[]> {
  return employees.reduce<Record<string, Employee[]>>((acc, emp) => {
    const dept = emp.department || "Other";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});
}

function EmployeePicker({
  employees,
  value,
  onChange,
}: {
  employees: Employee[];
  value: string;
  onChange: (emp: Employee | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = employees.find((e) => e.id === value);

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        (e.jobTitle?.toLowerCase().includes(q) ?? false)
    );
  }, [employees, search]);

  const grouped = React.useMemo(() => groupByDepartment(filtered), [filtered]);
  const departments = Object.keys(grouped).sort();

  return (
    <div ref={ref} className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between font-normal text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar className="size-5 shrink-0">
              <AvatarFallback
                className="text-[10px] font-semibold text-white"
                style={{ backgroundColor: selected.avatarColor }}
              >
                {selected.initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {selected.firstName} {selected.lastName}
              {selected.jobTitle ? (
                <span className="text-muted-foreground"> · {selected.jobTitle}</span>
              ) : null}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Search employees...</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="overflow-hidden rounded-xl border border-border bg-popover shadow-md">
          <div className="border-b p-2">
            <Input
              placeholder="Search by name or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {departments.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-muted-foreground">No employee found.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    router.push("/employees/new");
                  }}
                >
                  <UserPlus className="size-3.5" />
                  Add new employee
                </Button>
              </div>
            ) : (
              <div className="p-1">
                {departments.map((dept, i) => (
                  <React.Fragment key={dept}>
                    {i > 0 && <div className="my-1 h-px bg-border" />}
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      {dept}
                    </div>
                    {grouped[dept].map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent",
                          emp.id === value && "bg-accent"
                        )}
                        onClick={() => {
                          onChange(emp.id === value ? null : emp);
                          setSearch("");
                          setOpen(false);
                        }}
                      >
                        <Avatar className="size-5 shrink-0">
                          <AvatarFallback
                            className="text-[10px] font-semibold text-white"
                            style={{ backgroundColor: emp.avatarColor }}
                          >
                            {emp.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-left">
                          <span className="font-medium">
                            {emp.firstName} {emp.lastName}
                          </span>
                          {emp.jobTitle ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {emp.jobTitle}
                            </span>
                          ) : null}
                        </div>
                        {emp.id === value && (
                          <Check className="ml-auto size-3.5 shrink-0 text-primary" />
                        )}
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => {
                setOpen(false);
                router.push("/employees/new");
              }}
            >
              <UserPlus className="size-3.5" />
              Employee not in the list? Add them first
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function UserSettings() {
  const { state } = useApp();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = React.useState<TenantUserRow[]>([]);
  const [invites, setInvites] = React.useState<InviteRow[]>([]);
  const [uninvitableIds, setUninvitableIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [removingUser, setRemovingUser] = React.useState<TenantUserRow | null>(null);
  const [removeConfirming, setRemoveConfirming] = React.useState(false);
  const [updatingRoleId, setUpdatingRoleId] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("employee");
  const [sending, setSending] = React.useState(false);
  const [manualLink, setManualLink] = React.useState<string | null>(null);

  const invitableEmployees = React.useMemo(
    () =>
      state.employees.filter(
        (e) => !uninvitableIds.has(e.id) && e.status !== "terminated"
      ),
    [state.employees, uninvitableIds]
  );

  const refresh = React.useCallback(async () => {
    try {
      const [userRows, inviteRows, uninvitableIdList] = await Promise.all([
        listTenantUsersAction(),
        listInvitesAction(),
        getUninvitableEmployeeIdsAction(),
      ]);
      setUsers(userRows);
      setInvites(inviteRows);
      setUninvitableIds(new Set(uninvitableIdList));
    } catch {
      toast.error("Couldn't load users", { description: "Please refresh the page." });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleEmployeeSelect(emp: Employee | null) {
    if (!emp) {
      setSelectedEmployeeId("");
      setName("");
      setEmail("");
      return;
    }
    setSelectedEmployeeId(emp.id);
    setName(`${emp.firstName} ${emp.lastName}`);
    setEmail(emp.email ?? "");
  }

  function resetDialog() {
    setSelectedEmployeeId("");
    setName("");
    setEmail("");
    setRole("employee");
    setManualLink(null);
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setManualLink(null);
    try {
      const result = await createInviteAction({
        email: email.trim(),
        name: name.trim(),
        role,
        employeeId: selectedEmployeeId || undefined,
      });
      if (result.error) {
        toast.error("Couldn't send invite", { description: result.error });
        return;
      }
      // Always show the invite URL so HR has a guaranteed fallback link.
      // When email is configured the link is a backup; when it isn't, it's the primary.
      if (result.inviteUrl) {
        setManualLink(result.inviteUrl);
        if (result.emailSent) {
          toast.success("Invitation sent", { description: `Email sent to ${email.trim()}. Link also shown below as a backup.` });
        }
      } else if (result.emailSent) {
        toast.success("Invitation sent", { description: `${email.trim()} will receive an email link.` });
        setDialogOpen(false);
        resetDialog();
      }
      await refresh();
    } finally {
      setSending(false);
    }
  }

  const [copyingId, setCopyingId] = React.useState<string | null>(null);
  const [selectedInviteIds, setSelectedInviteIds] = React.useState<Set<string>>(new Set());
  const [bulkRevoking, setBulkRevoking] = React.useState(false);

  async function handleCopyLink(invite: InviteRow) {
    setCopyingId(invite.id);
    try {
      const result = await getInviteLinkAction(invite.id);
      if (result.error || !result.inviteUrl) {
        toast.error("Couldn't get invite link", { description: result.error });
        return;
      }
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link copied", {
        description: `Share this link with ${invite.name} directly.`,
      });
    } catch {
      toast.error("Couldn't copy link");
    } finally {
      setCopyingId(null);
    }
  }

  async function handleRevoke(invite: InviteRow) {
    try {
      await revokeInviteAction(invite.id);
      setSelectedInviteIds((prev) => { const s = new Set(prev); s.delete(invite.id); return s; });
      toast.success("Invitation revoked");
      await refresh();
    } catch {
      toast.error("Couldn't revoke invitation");
    }
  }

  async function handleBulkRevoke() {
    if (!selectedInviteIds.size) return;
    setBulkRevoking(true);
    try {
      await Promise.all([...selectedInviteIds].map((id) => revokeInviteAction(id)));
      toast.success(
        selectedInviteIds.size === 1
          ? "Invitation revoked"
          : `${selectedInviteIds.size} invitations revoked`
      );
      setSelectedInviteIds(new Set());
      await refresh();
    } catch {
      toast.error("Couldn't revoke some invitations");
    } finally {
      setBulkRevoking(false);
    }
  }

  function copyLink(link: string) {
    void navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied"));
  }

  async function handleUpdateRole(userId: string, role: UserRole) {
    setUpdatingRoleId(userId);
    try {
      const result = await updateUserRoleAction(userId, role);
      if (result.error) {
        toast.error("Couldn't update role", { description: result.error });
      } else {
        toast.success("Role updated");
        await refresh();
      }
    } catch {
      toast.error("Couldn't update role");
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleRemoveAccess() {
    if (!removingUser) return;
    setRemoveConfirming(true);
    try {
      const result = await removeUserAccessAction(removingUser.id);
      if (result.error) {
        toast.error("Couldn't remove access", { description: result.error });
      } else {
        toast.success(`${removingUser.name}'s access has been removed`, {
          description: "They can be re-invited at any time.",
        });
        setRemovingUser(null);
        await refresh();
      }
    } catch {
      toast.error("Couldn't remove access");
    } finally {
      setRemoveConfirming(false);
    }
  }

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              Users and invitations
            </CardTitle>
            <CardDescription>
              People who can sign in to this workspace. Invite managers, executives and employees
              by email.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {invitableEmployees.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkDialogOpen(true)}
              >
                <UserPlus />
                Invite all
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs font-medium">
                  {invitableEmployees.length}
                </Badge>
              </Button>
            )}
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus />
              Invite user
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const isUpdating = updatingRoleId === user.id;
              return (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar size="sm">
                    <AvatarFallback className="text-white" style={{ backgroundColor: user.avatarColor }}>
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.name}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  {isUpdating ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <Badge variant="outline" className="shrink-0 font-normal">
                      {ROLE_BADGE[user.role] ?? user.role}
                    </Badge>
                  )}
                  {!isSelf && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={`Manage ${user.name}`}
                          disabled={isUpdating}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ChevronRight className="size-3.5" />
                            Change role
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {ROLE_OPTIONS.map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                disabled={user.role === opt.value}
                                onSelect={() => void handleUpdateRole(user.id, opt.value)}
                              >
                                {opt.label}
                                {user.role === opt.value && (
                                  <Check className="ml-auto size-3.5 text-primary" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setRemovingUser(user)}
                        >
                          Remove access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </div>

        {pendingInvites.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Checkbox
                id="select-all-invites"
                checked={
                  pendingInvites.length > 0 &&
                  pendingInvites.every((i) => selectedInviteIds.has(i.id))
                }
                onCheckedChange={(checked) => {
                  setSelectedInviteIds(
                    checked ? new Set(pendingInvites.map((i) => i.id)) : new Set()
                  );
                }}
              />
              <label htmlFor="select-all-invites" className="flex-1 cursor-pointer text-sm font-medium">
                Pending invitations
              </label>
              {selectedInviteIds.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={bulkRevoking}
                  onClick={() => void handleBulkRevoke()}
                >
                  {bulkRevoking ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                  Revoke {selectedInviteIds.size === pendingInvites.length ? "all" : selectedInviteIds.size}
                </Button>
              )}
            </div>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 px-4 py-3">
                  <Checkbox
                    checked={selectedInviteIds.has(invite.id)}
                    onCheckedChange={(checked) => {
                      setSelectedInviteIds((prev) => {
                        const s = new Set(prev);
                        checked ? s.add(invite.id) : s.delete(invite.id);
                        return s;
                      });
                    }}
                  />
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{invite.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{invite.email}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-normal">
                    {ROLE_BADGE[invite.role] ?? invite.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Copy invite link for ${invite.name}`}
                    disabled={copyingId === invite.id}
                    onClick={() => void handleCopyLink(invite)}
                  >
                    {copyingId === invite.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Revoke invitation for ${invite.email}`}
                    onClick={() => handleRevoke(invite)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>

      <BulkInviteDialog
        employees={invitableEmployees}
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        onDone={refresh}
      />

      <Dialog open={!!removingUser} onOpenChange={(open) => { if (!open && !removeConfirming) setRemovingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove access?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{removingUser?.name ?? "This user"}</span> will
              immediately lose access to this workspace. Their employee record and payroll data are
              preserved. You can re-invite them at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={removeConfirming}
              onClick={() => setRemovingUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removeConfirming}
              onClick={() => void handleRemoveAccess()}
            >
              {removeConfirming ? (
                <><Loader2 className="size-4 animate-spin" /> Removing...</>
              ) : (
                "Remove access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Invite a user</DialogTitle>
              <DialogDescription>
                Select an employee to pre-fill their details, then confirm the role and email.
                Links expire after 7 days.
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: employee picker */}
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <EmployeePicker
                employees={invitableEmployees}
                value={selectedEmployeeId}
                onChange={handleEmployeeSelect}
              />
              <p className="text-xs text-muted-foreground">
                Only active, unlinked employees are shown.
              </p>
            </div>

            {/* Step 2: name (pre-filled, editable) */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sipho Nkosi"
                minLength={2}
                required
              />
            </div>

            {/* Step 3: email (pre-filled from employee record, editable) */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sipho@company.co.za"
                required
              />
              {selectedEmployeeId && (
                <p className="text-xs text-muted-foreground">
                  Pre-filled from the employee record. Change it to use a different address.
                </p>
              )}
            </div>

            {/* Step 4: role */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col items-start">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {manualLink ? (
              <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium">Invite link</p>
                <p className="text-xs text-muted-foreground">
                  Share this link with {name || "the invitee"} directly. It expires in 7 days.
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={manualLink} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Copy invite link"
                    onClick={() => copyLink(manualLink)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {manualLink ? "Done" : "Cancel"}
              </Button>
              {manualLink ? null : (
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending..." : "Send invitation"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
