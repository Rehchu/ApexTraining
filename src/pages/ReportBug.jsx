import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Bug, Loader2 } from "lucide-react";

export default function ReportBug() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.BugReport.create({
        title,
        description,
        reporter_name: user?.full_name || "Unknown",
        reporter_email: user?.email || "Unknown",
        reporter_role: user?.role || "user"
      });
      toast.success("Bug reported successfully! Thank you for helping us improve.");
      setTitle("");
      setDescription("");
    } catch (error) {
      toast.error("Failed to report bug. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-foreground">
            <div className="p-2 bg-red-500/20 text-red-500 rounded-lg">
              <Bug className="w-6 h-6" />
            </div>
            Report a Bug
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Found something not working quite right? Let us know so we can fix it!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Issue Title</Label>
              <Input
                placeholder="e.g., Cannot save workout plan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input-frosted text-foreground border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Description & Steps to Reproduce</Label>
              <Textarea
                placeholder="Please describe what happened and how we can reproduce the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[150px] input-frosted text-foreground border-border"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 text-foreground border-none"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Report
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}