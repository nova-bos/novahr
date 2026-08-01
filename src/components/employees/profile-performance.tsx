"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Star, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Employee, PerformanceReview } from "@/lib/types";
import {
  acknowledgePerformanceReviewAction,
  createPerformanceReviewAction,
  deletePerformanceReviewAction,
  getPerformanceReviewsAction,
} from "@/lib/performance/actions";

const RATING_LABELS: Record<number, string> = {
  1: "Well below expectations",
  2: "Below expectations",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Outstanding",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3.5",
            n <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}

export function ProfilePerformance({ employee }: { employee: Employee }) {
  const { user } = useAuth();
  // HR always manages; a manager manages only their own direct reports.
  const canManage =
    user?.role === "hr" ||
    (user?.role === "manager" && employee.managerId === user?.employeeId);
  const isReviewedEmployee = user?.employeeId === employee.id;

  const [reviews, setReviews] = React.useState<PerformanceReview[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [isSaving, startSaveTransition] = React.useTransition();

  const [cycle, setCycle] = React.useState(`${new Date().getFullYear()} Annual`);
  const [reviewDate, setReviewDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [rating, setRating] = React.useState("3");
  const [strengths, setStrengths] = React.useState("");
  const [improvements, setImprovements] = React.useState("");
  const [goals, setGoals] = React.useState("");

  React.useEffect(() => {
    getPerformanceReviewsAction(employee.id)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setIsLoading(false));
  }, [employee.id]);

  function handleCreate() {
    startSaveTransition(async () => {
      try {
        const review = await createPerformanceReviewAction({
          employeeId: employee.id,
          cycle,
          reviewDate,
          rating: Number(rating),
          strengths,
          improvements,
          goals,
        });
        setReviews((prev) => [review, ...prev]);
        setOpen(false);
        setStrengths("");
        setImprovements("");
        setGoals("");
        toast.success("Performance review saved.");
      } catch (err) {
        toast.error("Could not save review", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  async function handleAcknowledge(id: string) {
    try {
      const updated = await acknowledgePerformanceReviewAction(id);
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success("Review acknowledged.");
    } catch (err) {
      toast.error("Could not acknowledge review", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePerformanceReviewAction(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review removed.");
    } catch {
      toast.error("Could not remove review.");
    }
  }

  // Nobody with a reason to see this tab? Hide it.
  if (!canManage && !isReviewedEmployee) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Star className="size-4 text-muted-foreground" />
            <CardTitle>Performance reviews</CardTitle>
          </div>
          {canManage ? (
            <Dialog open={open} onOpenChange={(o) => !isSaving && setOpen(o)}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 size-4" />
                  Add review
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add performance review</DialogTitle>
                  <DialogDescription>
                    Record a review for {employee.firstName} {employee.lastName}.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="perf-cycle">Cycle</Label>
                      <Input
                        id="perf-cycle"
                        value={cycle}
                        onChange={(e) => setCycle(e.target.value)}
                        placeholder="e.g. 2026 Annual"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="perf-date">Review date</Label>
                      <DatePicker
                        id="perf-date"
                        value={reviewDate}
                        onValueChange={setReviewDate}
                        placeholder="Select review date"
                        captionLayout="dropdown"
                        fromYear={new Date().getFullYear() - 5}
                        toYear={new Date().getFullYear() + 1}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="perf-rating">Overall rating</Label>
                    <Select value={rating} onValueChange={setRating}>
                      <SelectTrigger id="perf-rating">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} — {RATING_LABELS[n]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="perf-strengths">
                      Strengths <span className="text-xs text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="perf-strengths"
                      rows={2}
                      value={strengths}
                      onChange={(e) => setStrengths(e.target.value)}
                      placeholder="What went well this cycle..."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="perf-improvements">
                      Areas to improve{" "}
                      <span className="text-xs text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="perf-improvements"
                      rows={2}
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      placeholder="Where to focus next..."
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="perf-goals">
                      Goals for next cycle{" "}
                      <span className="text-xs text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="perf-goals"
                      rows={2}
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      placeholder="Objectives agreed for the period ahead..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isSaving || !cycle.trim() || !reviewDate}>
                    {isSaving ? "Saving..." : "Add review"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No performance reviews on file.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.cycle}</span>
                      <Stars rating={r.rating} />
                      {r.status === "acknowledged" ? (
                        <Badge variant="secondary" className="bg-success/15 text-success">
                          Acknowledged
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Awaiting sign-off
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(r.reviewDate)} · {r.reviewer}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {isReviewedEmployee && r.status !== "acknowledged" ? (
                      <Button size="sm" variant="outline" onClick={() => handleAcknowledge(r.id)}>
                        Acknowledge
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {(r.strengths || r.improvements || r.goals) && (
                  <div className="mt-2 flex flex-col gap-1.5 text-sm">
                    {r.strengths ? (
                      <p>
                        <span className="text-muted-foreground">Strengths: </span>
                        {r.strengths}
                      </p>
                    ) : null}
                    {r.improvements ? (
                      <p>
                        <span className="text-muted-foreground">To improve: </span>
                        {r.improvements}
                      </p>
                    ) : null}
                    {r.goals ? (
                      <p>
                        <span className="text-muted-foreground">Goals: </span>
                        {r.goals}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
