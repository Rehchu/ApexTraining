import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, MoreVertical, Edit, Trash2, Mail, Phone, Calendar as CalendarIcon, AlignLeft } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function LeadsKanbanBoard({ leads, onUpdateStatus, onConvertToClient, onEdit, onDelete, onUpdateNotes }) {
  const navigate = useNavigate();
  const [notesLead, setNotesLead] = useState(null);
  const [notesContent, setNotesContent] = useState("");

  const columns = [
    { id: "new", title: "New Leads" },
    { id: "in_progress", title: "In Progress" },
    { id: "won", title: "Converted (Won)" }
  ];

  const getLeadsByStatus = (statusId) => {
    return leads.filter(l => {
      if (statusId === "new") return l.status === "new" || l.status === "contacted";
      if (statusId === "in_progress") return l.status === "in_progress";
      if (statusId === "won") return l.status === "won";
      return false;
    });
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    if (newStatus === "won") {
      const lead = leads.find(l => l.id === draggableId);
      if (lead) onConvertToClient(lead);
    } else {
      onUpdateStatus(draggableId, newStatus);
    }
  };

  const openNotes = (lead) => {
    setNotesLead(lead);
    setNotesContent(lead.notes || "");
  };

  const saveNotes = () => {
    if (notesLead) {
      onUpdateNotes(notesLead.id, notesContent);
      setNotesLead(null);
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 min-w-max">
          {columns.map(col => {
            const columnLeads = getLeadsByStatus(col.id);
            return (
              <div key={col.id} className="w-[350px] flex flex-col bg-secondary rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="font-bold text-foreground tracking-wide">{col.title}</h3>
                  <Badge variant="outline" className="bg-card text-muted-foreground border-border">
                    {columnLeads.length}
                  </Badge>
                </div>
                
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className={`flex-1 min-h-[200px] transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-secondary' : ''}`}
                    >
                      {columnLeads.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-3"
                              style={{ ...provided.draggableProps.style }}
                            >
                              <Card className={`bg-card border border-border rounded-xl transition-all ${snapshot.isDragging ? 'shadow-2xl shadow-[#00D084]/20 border-primary/50 rotate-2 scale-105' : 'hover:border-border hover:shadow-lg'}`}>
                                <CardHeader className="p-4 pb-2">
                                  <div className="flex justify-between items-start">
                                    <div 
                                      className="cursor-pointer group" 
                                      onClick={() => openNotes(lead)}
                                    >
                                      <CardTitle className="text-base text-foreground font-bold group-hover:text-primary transition-colors">
                                        {lead.full_name}
                                      </CardTitle>
                                      {lead.source && <p className="text-xs text-muted-foreground mt-0.5">{lead.source}</p>}
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent -mr-2 -mt-2">
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                                        <DropdownMenuItem className="hover:bg-accent focus:bg-secondary cursor-pointer" onClick={() => onEdit(lead)}>
                                          <Edit className="w-4 h-4 mr-2" /> Edit Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="hover:bg-accent focus:bg-secondary cursor-pointer" onClick={() => openNotes(lead)}>
                                          <AlignLeft className="w-4 h-4 mr-2" /> View Notes
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="hover:bg-accent focus:bg-secondary cursor-pointer" onClick={() => navigate(createPageUrl("ClientNotebooks") + "?leadId=" + lead.id)}>
                                          <BookOpen className="w-4 h-4 mr-2" /> Open Notebook
                                        </DropdownMenuItem>
                                        {lead.status !== "won" && (
                                          <DropdownMenuItem className="text-emerald-400 hover:bg-accent focus:bg-secondary cursor-pointer" onClick={() => onConvertToClient(lead)}>
                                            <UserPlus className="w-4 h-4 mr-2" /> Convert to Client
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem className="text-red-400 hover:bg-accent focus:bg-secondary cursor-pointer" onClick={() => onDelete(lead.id)}>
                                          <Trash2 className="w-4 h-4 mr-2" /> Delete Lead
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                  <div className="space-y-2 mt-2 text-xs text-muted-foreground">
                                    {lead.email && (
                                      <div className="flex items-center gap-2 truncate">
                                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                    )}
                                    {lead.phone && (
                                      <div className="flex items-center gap-2 truncate">
                                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{lead.phone}</span>
                                      </div>
                                    )}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-border">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 justify-start"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(createPageUrl("ClientNotebooks") + "?leadId=" + lead.id);
                                      }}
                                    >
                                      <BookOpen className="w-4 h-4 mr-2" />
                                      Open Notebook
                                    </Button>
                                    </div>
                                    </CardContent>
                                    </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <Dialog open={!!notesLead} onOpenChange={(open) => !open && setNotesLead(null)}>
        <DialogContent className="bg-card text-foreground border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlignLeft className="w-5 h-5 text-primary" />
              Notes: {notesLead?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea 
              value={notesContent} 
              onChange={(e) => setNotesContent(e.target.value)} 
              placeholder="Add notes about this lead..."
              className="bg-card border-border text-foreground min-h-[150px]" 
            />
          </div>

          <DialogFooter className="flex sm:justify-between items-center w-full">
            {notesLead?.status !== "won" ? (
              <Button 
                variant="outline" 
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                onClick={() => {
                  onConvertToClient(notesLead);
                  setNotesLead(null);
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" /> Convert to Client
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setNotesLead(null)} className="text-muted-foreground hover:text-foreground">Cancel</Button>
              <Button onClick={saveNotes} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Save Notes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}