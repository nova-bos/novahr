"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface Enrolling {
  factorId: string;
  qr: string;
  secret: string;
}

export function MfaSettings() {
  const supabase = React.useMemo(() => createClient(), []);
  const [factors, setFactors] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [enrolling, setEnrolling] = React.useState<Enrolling | null>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setFactors(
        (data.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name ?? "Authenticator app" }))
      );
    }
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) throw error ?? new Error("Enrolment unavailable.");
      setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      toast.error("Could not start MFA enrolment", {
        description:
          err instanceof Error ? err.message : "Two-factor may not be enabled for this workspace.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnroll() {
    if (!enrolling) return;
    setBusy(true);
    try {
      const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({
        factorId: enrolling.factorId,
      });
      if (cErr || !ch) throw cErr ?? new Error("Challenge failed.");
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (vErr) throw vErr;
      toast.success("Two-factor authentication enabled.");
      setEnrolling(null);
      setCode("");
      await refresh();
    } catch (err) {
      toast.error("Could not verify the code", {
        description: err instanceof Error ? err.message : "Check the 6-digit code and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function unenroll(factorId: string) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("Two-factor authentication removed.");
      await refresh();
    } catch (err) {
      toast.error("Could not remove two-factor", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  const enabled = factors.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Two-factor authentication
        </CardTitle>
        <CardDescription>
          Add a time-based one-time code from an authenticator app (Google Authenticator, Authy, 1Password) as a second step at sign-in. Recommended for HR and executive accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : enrolling ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            {/* Supabase returns an SVG data URL for the QR code. */}
            <Image
              src={enrolling.qr}
              alt="Two-factor QR code"
              width={180}
              height={180}
              unoptimized
              className="rounded-lg border border-border bg-white p-2"
            />
            <p className="text-xs text-muted-foreground">
              Can&apos;t scan? Enter this key manually: <span className="font-mono">{enrolling.secret}</span>
            </p>
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="mfa-code">6-digit code</Label>
                <Input
                  id="mfa-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  placeholder="123456"
                  className="w-32"
                />
              </div>
              <Button onClick={verifyEnroll} disabled={busy || code.trim().length < 6}>
                {busy ? "Verifying..." : "Verify & enable"}
              </Button>
              <Button variant="ghost" onClick={() => setEnrolling(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        ) : enabled ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-success">Two-factor is on</p>
              <p className="text-xs text-muted-foreground">
                {factors.length} authenticator{factors.length === 1 ? "" : "s"} enrolled.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => unenroll(factors[0].id)}
              disabled={busy}
              className="text-destructive"
            >
              Turn off
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Two-factor authentication is not set up.</p>
            <Button variant="outline" onClick={startEnroll} disabled={busy}>
              {busy ? "Starting..." : "Set up"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
