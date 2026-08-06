import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit2, Trash2, Mail, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function TrainerManagement({ trainers, onRefresh, title = "Manage Trainers", emptyMessage = "No trainers found", entityType = "trainer" }) {
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [editName, setEditName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenEdit = (trainer) => {
    setEditingTrainer(trainer);
    setEditName(trainer.data?.full_name || trainer.full_name || "");
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    
    try {
      setIsLoading(true);
      
      // Update the User entity data with new name
      const currentData = editingTrainer.data || {};
      await base44.entities.User.update(editingTrainer.id, {
        data: {
          ...currentData,
          full_name: editName.trim()
        }
      });

      // Also try to update the Client entity if it exists
      if (entityType === "client") {
        const clientRecords = await base44.entities.Client.filter({ email: editingTrainer.email });
        if (clientRecords && clientRecords.length > 0) {
          for (const client of clientRecords) {
            await base44.entities.Client.update(client.id, {
              full_name: editName.trim()
            });
          }
        }
      }
      
      setEditingTrainer(null);
      setEditName("");
      onRefresh?.();
    } catch (error) {
      console.error(`Error updating ${entityType}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <div className="grid gap-3">
        {trainers.map((trainer) => (
          <div 
            key={trainer.id}
            className="p-4 rounded-[20px] bg-secondary border border-border hover:border-primary/20 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10 ring-2 ring-[#00E676]/20">
                  <AvatarImage src={trainer.avatar_url} />
                  <AvatarFallback className="text-xs font-bold text-black" style={{ background: 'linear-gradient(135deg, #00E676, #00A859)' }}>
                    {(trainer.data?.full_name || trainer.full_name)?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {trainer.data?.full_name || trainer.full_name}
                    {trainer.data?.business_name ? ` (${trainer.data.business_name})` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3" />
                    {trainer.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <Dialog open={editingTrainer?.id === trainer.id} onOpenChange={(open) => { if(open) handleOpenEdit(trainer); else setEditingTrainer(null); }}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleOpenEdit(trainer)}
                      className="text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border border-primary/20">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Edit {entityType === 'client' ? 'Client' : 'Trainer'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm text-muted-foreground block mb-2">Full Name</label>
                        <Input 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter full name"
                          className="input-frosted"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        This will update their profile across the platform
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline"
                          onClick={() => setEditingTrainer(null)}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSave}
                          disabled={isLoading || !editName.trim()}
                          className="bg-[#00E676] hover:bg-primary/90 text-black"
                        >
                          {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        ))}
        
        {trainers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}