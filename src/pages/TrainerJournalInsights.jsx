import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Frown, Smile, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function TrainerJournalInsights() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Fetch all clients for this trainer
  const { data: clients } = useQuery({
    queryKey: ["trainerClients", user?.id],
    queryFn: () => base44.entities.Client.filter({ trainer_id: user?.id }),
    enabled: !!user?.id
  });

  // Fetch all journal entries for the trainer's clients
  const { data: entries, isLoading } = useQuery({
    queryKey: ["allClientJournals", user?.id],
    queryFn: async () => {
      if (!clients || clients.length === 0) return [];
      const clientIds = clients.map(c => c.user_id).filter(id => id);
      
      // In a real app we'd use $in, for now let's just fetch all and filter client side if needed 
      // or fetch them one by one if list is small. Assuming we can just fetch all JournalEntry and filter.
      const allEntries = await base44.entities.JournalEntry.list("-date", 50);
      return allEntries.filter(e => clientIds.includes(e.client_id));
    },
    enabled: !!clients && clients.length > 0
  });

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case "positive": return <Smile className="w-5 h-5 text-green-500" />;
      case "negative": return <Frown className="w-5 h-5 text-red-500" />;
      default: return <TrendingUp className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/20 rounded-xl">
          <BookOpen className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground">Client Journal Insights</h1>
          <p className="text-muted-foreground">AI-summarized reflections to help you understand your clients' mental state.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : entries?.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center text-muted-foreground">
              No journal entries found from your clients.
            </CardContent>
          </Card>
        ) : (
          entries?.map(entry => {
            const client = clients?.find(c => c.user_id === entry.client_id);
            return (
              <Card key={entry.id} className="glass-card transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-foreground flex items-center gap-2">
                        {client?.full_name || "Unknown Client"}
                        {entry.sentiment && getSentimentIcon(entry.sentiment)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{format(new Date(entry.date), 'MMMM d, yyyy')}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {entry.trainer_summary ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">AI Summary</h4>
                      <p className="text-foreground">{entry.trainer_summary}</p>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">AI summary pending...</div>
                  )}
                  
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Raw Entry</h4>
                    <p className="text-muted-foreground text-sm line-clamp-2 hover:line-clamp-none transition-all cursor-pointer">
                      {entry.content}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}