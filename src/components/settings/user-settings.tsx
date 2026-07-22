"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Copy, Mail, Plus, UserPlus, UserRound, X } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createInviteAction,
  listInvitesAction,
  listTenantUsersAction,
  revokeInviteAction,
  type InviteRow,
  type TenantUserRow,
} from "@/lib/invites/actions";
import { useApp } from "@/lib/store/app-provider";
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
  const selected = employees.find((e) => e.id === value);
  const grouped = groupByDepartment(employees);
  const departments = Object.keys(grouped).sort();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left"
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
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
                {selected.jobTitle ? <span className="text-muted-foreground"> · {selected.jobTitle}</span> : null}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Search employees...</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or job title..." />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-muted-foreground">No employee found.</p>
                <Button
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
            </CommandEmpty>
            {departments.map((dept, i) => (
              <React.Fragment key={dept}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={dept}>
                  {grouped[dept].map((emp) => (
                    <CommandItem
                      key={emp.id}
                      value={`${emp.firstName} ${emp.lastName} ${emp.jobTitle} ${dept}`}
                      onSelect={() => {
                        onChange(emp.id === value ? null : emp);
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
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        {emp.jobTitle ? (
                          <span className="ml-1 text-xs text-muted-foreground">{emp.jobTitle}</span>
                        ) : null}
                      </div>
                      <Check
                        className={cn("ml-auto size-3.5 shrink-0", emp.id === value ? "opacity-100" : "opacity-0")}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
          <div className="border-t p-2">
            <Button
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function UserSettings() {
  const { state } = useApp();
  const [users, setUsers] = React.useState<TenantUserRow[]>([]);
  const [invites, setInvites] = React.useState<InviteRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("employee");
  const [sending, setSending] = React.useState(false);
  const [manualLink, setManualLink] = React.useState<string | null>(null);

  const linkedEmployeeIds = React.useMemo(
    () => new Set(users.map((u) => u.employeeId).filter(Boolean)),
    [users]
  );
  const invitableEmployees = React.useMemo(
    () => state.employees.filter((e) => !linkedEmployeeIds.has(e.id) && e.status !== "terminated"),
    [state.employees, linkedEmployeeIds]
  );

  const refresh = React.useCallback(async () => {
    try {
      const [userRows, inviteRows] = await Promise.all([
        listTenantUsersAction(),
        listInvitesAction(),
      ]);
      setUsers(userRows);
      setInvites(inviteRows);
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

  async function handleRevoke(invite: InviteRow) {
    try {
      await revokeInviteAction(invite.id);
      toast.success("Invitation revoked");
      await refresh();
    } catch {
      toast.error("Couldn't revoke invitation");
    }
  }

  function copyLink(link: string) {
    void navigator.clipboard.writeText(link).then(() => toast.success("Invite link copied"));
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
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus />
            Invite user
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar size="sm">
                  <AvatarFallback className="text-white" style={{ backgroundColor: user.avatarColor }}>
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {ROLE_BADGE[user.role] ?? user.role}
                </Badge>
              </div>
            ))
          )}
        </div>

        {pendingInvites.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Pending invitations</p>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 px-4 py-3">
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
