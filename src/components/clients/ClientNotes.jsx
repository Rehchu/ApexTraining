import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryColors = {
  general: "bg-slate-100 text-slate-700",
  medical: "bg-red-100 text-red-700",
  progress: "bg-green-100 text-green-700",
  goal: "bg-blue-100 text-blue-700",
  session: "bg-purple-100 text-purple-700"
};

export default function ClientNotes({ clientId, trainerId }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [category, setCategory] = useState("general");
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ["clientNotes", clientId],
    queryFn: () => base44.entities.ClientNote.filter({ client_id: clientId }, "-created_date"),
    enabled: !!clientId,
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientNotes"] });
      setNewNote("");
      setCategory("general");
      setIsAdding(false);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clientNotes"] }),
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createNoteMutation.mutate({
      client_id: clientId,
      trainer_id: trainerId,
      content: newNote,
      category
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Client Notes
          </CardTitle>
          <Button
            size="sm"
            variant={isAdding ? "outline" : "default"}
            onClick={() => setIsAdding(!isAdding)}
            className={!isAdding && "bg-gradient-to-r from-emerald-500 to-teal-600"}
          >
            <Plus className="w-4 h-4 mr-1" />
            {isAdding ? "Cancel" : "Add Note"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="goal">Goal</SelectItem>
                <SelectItem value="session">Session</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Write your note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
              >
                Save Note
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {notes.length > 0 ? (
            notes.map((note) => (
              <div key={note.id} className="p-4 bg-white rounded-xl border space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge className={cn("text-xs", categoryColors[note.category])}>
                    {note.category}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-600"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(note.created_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              No notes yet. Add your first note to track important information.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}