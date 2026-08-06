import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ChevronRight } from "lucide-react";

export default function ClientPreviewPicker({ open, onOpenChange, trainerId, onSelect }) {
  const [search, setSearch] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["clientsForPreview", trainerId],
    queryFn: () => base44.entities.Client.filter({ trainer_id: trainerId }, "full_name"),
    enabled: open && !!trainerId,
  });

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePreviewSelect = async (client) => {
    // Verify client profile exists and has data
    if (!client.id || !client.email) {
      console.error("Invalid client data for preview");
      return;
    }
    // Verify trainer relationship
    if (client.trainer_id !== trainerId) {
      console.error("Client does not belong to this trainer");
      return;
    }
    onSelect(client);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Select Client to Preview</DialogTitle>
        </DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-6">No clients found</p>
          )}
          {filtered.map(client => (
            <button
              key={client.id}
              onClick={() => handlePreviewSelect(client)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={client.avatar_url} />
                <AvatarFallback className="text-sm font-bold text-foreground" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
                  {client.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{client.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{client.email}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}