import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoon({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-20 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
