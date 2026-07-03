"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Mail, Plus, UserRound, X } from "lucide-react";
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
  listInvitesAction,
  listTenantUsersAction,
  revokeInviteAction,
  type InviteRow,
  type TenantUserRow,
} from "@/lib/invites/actions";
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

export function UserSettings() {
  const [users, setUsers] = React.useState<TenantUserRow[]>([]);
  const [invites, setInvites] = React.useState<InviteRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("employee");
  const [sending, setSending] = React.useState(false);
  const [manualLink, setManualLink] = React.useState<string | null>(null);

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

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setManualLink(null);
    try {
      const result = await createInviteAction({ email: email.trim(), name: name.trim(), role });
      if (result.error) {
        toast.error("Couldn't send invite", { description: result.error });
        return;
      }
      if (result.emailSent) {
        toast.success("Invitation sent", { description: `${email.trim()} will receive an email link.` });
        setDialogOpen(false);
        setEmail("");
        setName("");
        setRole("employee");
      } else if (result.inviteUrl) {
        // Email isn't configured: keep the dialog open and let HR copy the link.
        setManualLink(result.inviteUrl);
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
          if (!open) setManualLink(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Invite a user</DialogTitle>
              <DialogDescription>
                They&apos;ll receive an email link to set their password. Links expire after 7
                days.
              </DialogDescription>
            </DialogHeader>
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
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john.smith@company.co.za"
                required
              />
            </div>
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
                <p className="text-xs text-muted-foreground">
                  Email sending isn&apos;t configured, so share this link with them directly. It
                  expires in 7 days.
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={manualLink} className="text-xs" />
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
                  {sending ? "Sending…" : "Send invitation"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
