"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Announcement } from "@/lib/types";
import {
  getAnnouncementsAction,
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
} from "@/lib/announcements/actions";

const AUDIENCE_LABELS: Record<string, string> = {
  all: "Everyone",
  managers: "Managers and above",
};

function AnnouncementCard({
  item,
  canManage,
  onTogglePublish,
  onDelete,
}: {
  item: Announcement;
  canManage: boolean;
  onTogglePublish: (id: string, published: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className={item.isPublished ? undefined : "border-dashed opacity-70"}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{item.title}</CardTitle>
            {!item.isPublished ? (
              <Badge variant="secondary">Draft</Badge>
            ) : null}
            <Badge variant="outline" className="text-xs">
              {AUDIENCE_LABELS[item.audience] ?? item.audience}
            </Badge>
          </div>
          {canManage ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                title={item.isPublished ? "Unpublish" : "Publish"}
                onClick={() => onTogglePublish(item.id, !item.isPublished)}
              >
                {item.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                title="Delete"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.createdBy} · {formatDate(item.createdAt)}
        </p>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-foreground/80">{item.body}</p>
      </CardContent>
    </Card>
  );
}

export function AnnouncementsPanel() {
  const { user } = useAuth();
  const canManage = user?.role === "hr";
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [audience, setAudience] = React.useState<"all" | "managers">("all");
  const [publishNow, setPublishNow] = React.useState(true);
  const [isSaving, startSaveTransition] = React.useTransition();

  React.useEffect(() => {
    getAnnouncementsAction()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, [user?.tenantId]);

  function handleCreate() {
    startSaveTransition(async () => {
      try {
        const item = await createAnnouncementAction({
          title,
          body,
          audience,
          isPublished: publishNow,
        });
        setItems((prev) => [item, ...prev]);
        setCreateOpen(false);
        setTitle("");
        setBody("");
        toast.success(publishNow ? "Announcement published." : "Draft saved.");
      } catch (err) {
        toast.error("Could not create announcement", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    });
  }

  async function handleTogglePublish(id: string, isPublished: boolean) {
    try {
      const updated = await updateAnnouncementAction(id, { isPublished });
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)));
      toast.success(isPublished ? "Announcement published." : "Moved to drafts.");
    } catch {
      toast.error("Could not update announcement.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAnnouncementAction(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted.");
    } catch {
      toast.error("Could not delete announcement.");
    }
  }

  const published = items.filter((a) => a.isPublished);
  const drafts = items.filter((a) => !a.isPublished);

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <div className="flex justify-end">
          <Dialog open={createOpen} onOpenChange={(o) => !isSaving && setCreateOpen(o)}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                New announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create announcement</DialogTitle>
                <DialogDescription>
                  Post a company-wide announcement or policy document for your team.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ann-title">Title</Label>
                  <Input
                    id="ann-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Office closure: 16 December 2026"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ann-body">Message</Label>
                  <Textarea
                    id="ann-body"
                    rows={5}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your announcement..."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ann-audience">Visible to</Label>
                  <Select value={audience} onValueChange={(v) => setAudience(v as "all" | "managers")}>
                    <SelectTrigger id="ann-audience">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="managers">Managers and above</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="ann-publish"
                    type="checkbox"
                    checked={publishNow}
                    onChange={(e) => setPublishNow(e.target.checked)}
                    className="size-4"
                  />
                  <Label htmlFor="ann-publish">Publish immediately</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={isSaving || !title.trim() || !body.trim()}
                >
                  {isSaving ? "Saving..." : publishNow ? "Publish" : "Save as draft"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : published.length === 0 && drafts.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <Megaphone className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {published.map((item) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              canManage={canManage}
              onTogglePublish={handleTogglePublish}
              onDelete={handleDelete}
            />
          ))}
          {canManage && drafts.length > 0 ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Drafts
              </p>
              {drafts.map((item) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  onTogglePublish={handleTogglePublish}
                  onDelete={handleDelete}
                />
              ))}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
