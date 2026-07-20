"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-provider";
import { updateUserProfileAction, sendPasswordResetAction } from "@/lib/auth/profile-actions";
import { CloseAccountCard } from "@/components/settings/close-account-card";

const AVATAR_COLORS = [
  "#4C6FFF",
  "#0F9D8C",
  "#E08A3C",
  "#A855F7",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F43F5E",
  "#6366F1",
  "#14B8A6",
];

export default function AccountPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = React.useState(user?.name ?? "");
  const [title, setTitle] = React.useState(user?.title ?? "");
  const [avatarColor, setAvatarColor] = React.useState(user?.avatarColor ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = React.useState(false);
  const [sendingReset, setSendingReset] = React.useState(false);

  // Sync when user loads
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setTitle(user.title);
      setAvatarColor(user.avatarColor);
    }
  }, [user]);

  const initials = name
    .trim()
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateUserProfileAction({ name, title, avatarColor });
    setSaving(false);
    if (result.success) {
      await refresh();
      toast.success("Profile updated");
    } else {
      toast.error(result.error ?? "Failed to save");
    }
  }

  async function handlePasswordReset() {
    setSendingReset(true);
    const result = await sendPasswordResetAction();
    setSendingReset(false);
    if (result.success) {
      toast.success("Password reset email sent. Check your inbox.");
    } else {
      toast.error(result.error ?? "Failed to send reset email");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My account"
        description="Update your personal profile and security settings."
      />
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-4">
              <Avatar className="size-14" style={{ backgroundColor: avatarColor }}>
                <AvatarFallback
                  className="text-white font-semibold"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAvatarColor(c)}
                    className={`size-7 rounded-full border-2 transition-all ${
                      avatarColor === c
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Display name</Label>
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-title">Job title</Label>
              <Input
                id="acc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-xs text-muted-foreground">
              Send a password reset link to your email address.
            </p>
          </div>
          <Button variant="outline" onClick={handlePasswordReset} disabled={sendingReset}>
            {sendingReset ? "Sending..." : "Reset password"}
          </Button>
        </CardContent>
      </Card>

      <CloseAccountCard />
    </div>
  );
}
