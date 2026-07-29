"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingRow } from "./setting-row";
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
  type NotificationPreferences,
} from "@/lib/auth/profile-actions";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  leaveRequests: true,
  leaveDecisions: true,
  payrollReminders: true,
  payslipsPublished: true,
  onboardingUpdates: true,
  weeklyDigest: false,
};

export function NotificationSettings() {
  const [prefs, setPrefs] = React.useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    getNotificationPreferencesAction()
      .then((p) => setPrefs(p))
      .catch(() => { /* fall back to defaults already in state */ })
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof NotificationPreferences, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateNotificationPreferencesAction(prefs);
      toast.success("Notification preferences updated", {
        description: "We will use these settings for future alerts.",
      });
    } catch {
      toast.error("Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Email notifications</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border/70">
          <SettingRow
            title="New leave requests"
            description="Get notified when an employee submits a leave request."
            checked={prefs.leaveRequests}
            onCheckedChange={(v) => update("leaveRequests", v)}
            disabled={loading}
          />
          <SettingRow
            title="Leave decisions"
            description="Get notified when a leave request is approved or rejected."
            checked={prefs.leaveDecisions}
            onCheckedChange={(v) => update("leaveDecisions", v)}
            disabled={loading}
          />
          <SettingRow
            title="Payroll run reminders"
            description="Receive a reminder a few days before each pay run is due."
            checked={prefs.payrollReminders}
            onCheckedChange={(v) => update("payrollReminders", v)}
            disabled={loading}
          />
          <SettingRow
            title="Payslips published"
            description="Get notified once payslips have been generated and shared."
            checked={prefs.payslipsPublished}
            onCheckedChange={(v) => update("payslipsPublished", v)}
            disabled={loading}
          />
          <SettingRow
            title="Onboarding updates"
            description="Get notified when a new team member completes onboarding steps."
            checked={prefs.onboardingUpdates}
            onCheckedChange={(v) => update("onboardingUpdates", v)}
            disabled={loading}
          />
          <SettingRow
            title="Weekly summary digest"
            description="A weekly email summarising headcount, leave and payroll activity."
            checked={prefs.weeklyDigest}
            onCheckedChange={(v) => update("weeklyDigest", v)}
            disabled={loading}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={loading || saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
