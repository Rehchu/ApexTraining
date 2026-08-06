import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Sparkles, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientJournal() {
  const [content, setContent] = useState("");
  const [prompt, setPrompt] = useState("What was your biggest win today, and what's one thing you want to improve tomorrow?");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [user, setUser] = useState(null);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["journalEntries", user?.id],
    queryFn: () => base44.entities.JournalEntry.filter({ client_id: user?.id }, "-date", 30),
    enabled: !!user?.id
  });

  const saveEntryMutation = useMutation({
    mutationFn: async (newEntry) => {
      return await base44.entities.JournalEntry.create(newEntry);
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries(["journalEntries"]);
      toast.success("Journal entry saved!");
      setContent("");

      // Fire off background summarization (AI summary + sentiment for the trainer)
      if (created?.id) {
        base44.functions
          .invoke("summarizeJournalEntry", { entry_id: created.id, content: created.content })
          .catch(console.error);
      }
    }
  });

  const handleSave = () => {
    if (!content.trim()) return;
    saveEntryMutation.mutate({
      client_id: user.id,
      date: new Date().toLocaleDateString('sv-SE'),
      content,
      ai_prompt_used: prompt
    });
  };

  const generateNewPrompt = async () => {
    setIsGeneratingPrompt(true);
    try {
      const res = await base44.functions.invoke("generateJournalPrompt", { client_id: user?.id });
      if (res.data?.prompt) {
        setPrompt(res.data.prompt);
      }
    } catch (err) {
      toast.error("Failed to generate new prompt");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/20 rounded-xl">
          <BookOpen className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground">Daily Reflection</h1>
          <p className="text-muted-foreground">Connect your mind and body.</p>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Today's Prompt
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={generateNewPrompt} disabled={isGeneratingPrompt} className="text-muted-foreground hover:text-foreground">
              {isGeneratingPrompt ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              New Prompt
            </Button>
          </div>
          <p className="text-xl font-medium text-foreground mt-2 italic border-l-2 border-indigo-500 pl-4 py-2 bg-indigo-500/5 rounded-r-lg">
            "{prompt}"
          </p>
        </CardHeader>
        <CardContent>
          <Textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts here..."
            className="min-h-[200px] bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-indigo-500 text-lg p-4"
          />
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={!content.trim() || saveEntryMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {saveEntryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Save Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 space-y-4">
        <h3 className="text-xl font-bold text-foreground mb-6">Past Entries</h3>
        {isLoading ? (
          <div className="text-muted-foreground">Loading entries...</div>
        ) : entries?.length === 0 ? (
          <div className="text-muted-foreground italic p-8 text-center bg-secondary/50 rounded-xl border border-border">No past entries yet. Start writing!</div>
        ) : (
          <AnimatePresence>
            {entries?.map(entry => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 glass-card hover:border-indigo-300 transition-colors">
                <div className="text-sm text-indigo-400 font-semibold mb-2">{format(new Date(entry.date), 'MMMM d, yyyy')}</div>
                {entry.ai_prompt_used && (
                  <div className="text-sm text-muted-foreground mb-3 italic">Q: {entry.ai_prompt_used}</div>
                )}
                <p className="text-foreground whitespace-pre-wrap">{entry.content}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}