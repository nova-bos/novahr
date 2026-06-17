"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingRow } from "./setting-row";

const DEFAULT_PREFERENCES = {
  leaveRequests: true,
  leaveDecisions: true,
  payrollReminders: true,
  payslipsPublished: true,
  onboardingUpdates: true,
  weeklyDigest: false,
};

const STORAGE_KEY = "novahr:notif-prefs";

export function NotificationSettings() {
  const [prefs, setPrefs] = React.useState(DEFAULT_PREFERENCES);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (stored && typeof stored === "object") {
        setPrefs((prev) => ({ ...prev, ...stored }));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  function update(key: keyof typeof DEFAULT_PREFERENCES, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
    toast.success("Notification preferences updated", {
      description: "We'll use these settings for future alerts.",
    });
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
          />
          <SettingRow
            title="Leave decisions"
            description="Get notified when a leave request is approved or rejected."
            checked={prefs.leaveDecisions}
            onCheckedChange={(v) => update("leaveDecisions", v)}
          />
          <SettingRow
            title="Payroll run reminders"
            description="Receive a reminder a few days before each pay run is due."
            checked={prefs.payrollReminders}
            onCheckedChange={(v) => update("payrollReminders", v)}
          />
          <SettingRow
            title="Payslips published"
            description="Get notified once payslips have been generated and shared."
            checked={prefs.payslipsPublished}
            onCheckedChange={(v) => update("payslipsPublished", v)}
          />
          <SettingRow
            title="Onboarding updates"
            description="Get notified when a new team member completes onboarding steps."
            checked={prefs.onboardingUpdates}
            onCheckedChange={(v) => update("onboardingUpdates", v)}
          />
          <SettingRow
            title="Weekly summary digest"
            description="A weekly email summarising headcount, leave and payroll activity."
            checked={prefs.weeklyDigest}
            onCheckedChange={(v) => update("weeklyDigest", v)}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit">Save changes</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
