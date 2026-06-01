"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Markdown from "@/components/chat/Markdown";
import { formatRelativeTime, truncate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

type Plan = {
  id: string;
  title: string;
  durationWeeks: number | null;
  planMarkdown: string;
  createdAt: string;
};

export default function PlanCard({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this plan?")) return;
    setDeleting(true);
    const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    setDeleting(false);
  };

  return (
    <Card>
      <Dialog>
        <DialogTrigger asChild>
          <button className="w-full text-left">
            <CardHeader>
              <CardTitle className="text-base">{plan.title}</CardTitle>
              <CardDescription>
                {plan.durationWeeks ? `${plan.durationWeeks} weeks · ` : ""}
                Saved {formatRelativeTime(plan.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{truncate(plan.planMarkdown.replace(/[#*_>`]/g, ""), 180)}</p>
            </CardContent>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{plan.title}</DialogTitle>
            <DialogDescription>
              {plan.durationWeeks ? `${plan.durationWeeks} weeks · ` : ""}Saved {formatRelativeTime(plan.createdAt)}
            </DialogDescription>
          </DialogHeader>
          <Markdown>{plan.planMarkdown}</Markdown>
        </DialogContent>
      </Dialog>
      <div className="px-6 pb-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </Card>
  );
}
