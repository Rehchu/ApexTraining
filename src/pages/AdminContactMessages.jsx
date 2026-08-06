import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Mail, MessageCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminContactMessages() {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['contactMessages'],
    queryFn: () => base44.entities.ContactMessage.list('-created_date')
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ContactMessage.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactMessages'] });
      toast.success('Message status updated');
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-foreground tracking-wider flex items-center gap-3">
          <Mail className="w-8 h-8 text-[#d4a017]" />
          CONTACT MESSAGES
        </h1>
      </div>

      <div className="grid gap-4">
        {messages.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No contact messages found.</p>
            </CardContent>
          </Card>
        ) : (
          messages.map(msg => (
            <Card key={msg.id} className="glass-card transition-all hover:border-[#d4a017]/30">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-lg text-foreground">{msg.subject}</h3>
                      {msg.status === 'new' && (
                        <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-none">New</Badge>
                      )}
                      {msg.status === 'read' && (
                        <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-none">Read</Badge>
                      )}
                      {msg.status === 'resolved' && (
                        <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-none">Resolved</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span><strong className="text-muted-foreground">From:</strong> {msg.name} ({msg.email})</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(msg.created_date), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {msg.status !== 'read' && msg.status !== 'resolved' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                        onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'read' })}
                      >
                        <Circle className="w-4 h-4 mr-2" /> Mark Read
                      </Button>
                    )}
                    {msg.status !== 'resolved' && (
                      <Button 
                        size="sm" 
                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                        onClick={() => updateStatusMutation.mutate({ id: msg.id, status: 'resolved' })}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
                <div className="bg-secondary p-4 rounded-lg border border-border text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.message}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}