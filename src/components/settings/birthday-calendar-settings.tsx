"use client";

import * as React from "react";
import { toast } from "sonner";
import { Cake } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCurrentTenant } from "@/lib/store/hooks";
import { updateTenantCalendarSettingsAction } from "@/lib/settings/actions";
import { useApp } from "@/lib/store/app-provider";

export function BirthdayCalendarSettings() {
  const tenant = useCurrentTenant();
  const { reloadWorkspace } = useApp();
  const [checked, setChecked] = React.useState(tenant.showBirthdaysOnCalendar ?? false);
  const [saving, setSaving] = React.useState(false);

  async function handleToggle(value: boolean) {
    setSaving(true);
    const prev = checked;
    setChecked(value);
    try {
      await updateTenantCalendarSettingsAction({ showBirthdaysOnCalendar: value });
      reloadWorkspace();
      toast.success(value ? "Birthdays enabled on calendar." : "Birthdays hidden from calendar.");
    } catch {
      setChecked(prev);
      toast.error("Could not update setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cake className="size-4 text-muted-foreground" />
          <CardTitle>Birthdays on calendar</CardTitle>
        </div>
        <CardDescription>
          When enabled, active employees with a date of birth on file appear on the leave calendar
          on their birthday (day and month only, never the birth year). Off by default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Switch
            id="birthday-calendar"
            checked={checked}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
          <Label htmlFor="birthday-calendar">
            {checked ? "Birthdays are shown on the calendar" : "Birthdays are hidden from the calendar"}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
