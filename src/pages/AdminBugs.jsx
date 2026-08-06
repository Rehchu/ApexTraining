import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bug } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminBugs() {
  const queryClient = useQueryClient();

  const { data: bugs = [], isLoading } = useQuery({
    queryKey: ['admin-bugs'],
    queryFn: () => base44.entities.BugReport.list("-created_date")
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.BugReport.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bugs'] })
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Bug className="w-8 h-8 text-red-500" />
          Bug Reports
        </h1>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-foreground">All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Reporter</TableHead>
                <TableHead className="text-muted-foreground">Issue</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bugs.map((bug) => (
                <TableRow key={bug.id} className="border-border hover:bg-accent">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(bug.created_date), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{bug.reporter_name}</div>
                    <div className="text-xs text-muted-foreground">{bug.reporter_email}</div>
                    <Badge variant="outline" className="mt-1 text-[10px]">{bug.reporter_role}</Badge>
                  </TableCell>
                  <TableCell className="min-w-[300px]">
                    <div className="font-medium text-foreground">{bug.title}</div>
                    <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{bug.description}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={bug.status || 'open'}
                      onValueChange={(val) => updateStatusMutation.mutate({ id: bug.id, status: val })}
                    >
                      <SelectTrigger className="w-[140px] bg-secondary border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border text-foreground">
                        <SelectItem value="open" className="text-red-500 hover:bg-accent focus:bg-secondary">Open</SelectItem>
                        <SelectItem value="in_progress" className="text-amber-500 hover:bg-accent focus:bg-secondary">In Progress</SelectItem>
                        <SelectItem value="resolved" className="text-emerald-500 hover:bg-accent focus:bg-secondary">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {bugs.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground hover:bg-transparent">
                    No bug reports found. Good job!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}