import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Folder, File, Trash2, ChevronRight, ChevronDown, PenTool, Type, Save, Download, Bold, Italic, List, ListOrdered, CheckSquare, Highlighter, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-card border-b border-border rounded-t-xl items-center">
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}>
        <Bold className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}>
        <Italic className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-secondary mx-1" />
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}>
        <span className="font-bold">H2</span>
      </Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}>
        <span className="font-bold">H3</span>
      </Button>
      <div className="w-px h-6 bg-secondary mx-1" />
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}>
        <List className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}>
        <ListOrdered className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleTaskList().run()} className={editor.isActive('taskList') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}>
        <CheckSquare className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-secondary mx-1" />
      <Button variant="ghost" size="icon" onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}>
        <Highlighter className="w-4 h-4" />
      </Button>
    </div>
  );
};

import { useLocation } from "react-router-dom";

export default function ClientNotebooks() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialClientId = searchParams.get("clientId") || searchParams.get("leadId") || "";
  
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialClientId);
  const [activePageId, setActivePageId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ "Assessments": true, "Session Notes": true, "Form Corrections": true, "Progress": true });
  const [mode, setMode] = useState("text"); // 'text' or 'draw'
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddPageDialog, setShowAddPageDialog] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: "", section_name: "Session Notes" });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: () => base44.entities.Client.filter({ trainer_id: user?.id }),
    enabled: !!user
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", user?.id],
    queryFn: () => base44.entities.Lead.filter({ trainer_id: user?.id }),
    enabled: !!user
  });

  const allSubjects = [
    ...clients.map(c => ({ id: c.id, name: c.full_name, type: 'client' })),
    ...leads.filter(l => l.status !== 'won').map(l => ({ id: l.id, name: l.full_name + ' (Lead)', type: 'lead' }))
  ];

  const selectedSubject = allSubjects.find(s => s.id === selectedSubjectId);

  const { data: pages = [] } = useQuery({
    queryKey: ["notebook_pages", selectedSubjectId, selectedSubject?.type],
    queryFn: async () => {
      if (!selectedSubject) return [];
      if (selectedSubject.type === 'lead') {
        return await base44.entities.ClientNotebookPage.filter({ lead_id: selectedSubjectId });
      }
      return await base44.entities.ClientNotebookPage.filter({ client_id: selectedSubjectId });
    },
    enabled: !!selectedSubjectId && !!selectedSubject
  });

  // Default sections if none exist
  const sections = [...new Set([...pages.map(p => p.section_name), "Assessments", "Session Notes", "Form Corrections", "Progress"])];

  const activePage = pages.find(p => p.id === activePageId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
    ],
    content: activePage?.text_content || "",
    onUpdate: ({ editor }) => {
      // Autosave could be debounced here
    },
  });

  useEffect(() => {
    if (editor && activePage) {
      if (editor.getHTML() !== activePage.text_content) {
        editor.commands.setContent(activePage.text_content || "");
      }
    }
  }, [activePageId, editor]);

  // Load excalidraw data
  useEffect(() => {
    if (excalidrawAPI && activePage) {
      if (activePage.draw_content) {
        try {
          const elements = JSON.parse(activePage.draw_content);
          excalidrawAPI.updateScene({ elements });
        } catch (e) {
          console.error(e);
        }
      } else {
        excalidrawAPI.updateScene({ elements: [] });
      }
    }
  }, [activePageId, excalidrawAPI]);

  useEffect(() => {
    if (activePage) {
      setMode(activePage.mode || "text");
    }
  }, [activePageId]);

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.ClientNotebookPage.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook_pages", selectedSubjectId] });
      toast.success("Saved successfully");
      setIsSaving(false);
    }
  });

  const createPageMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClientNotebookPage.create({
        ...data,
        client_id: selectedSubject?.type === 'client' ? selectedSubjectId : null,
        lead_id: selectedSubject?.type === 'lead' ? selectedSubjectId : null,
        trainer_id: user.id,
        text_content: "",
        draw_content: "",
        mode: "text"
      });
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["notebook_pages", selectedSubjectId] });
      setShowAddPageDialog(false);
      setNewPageData({ title: "", section_name: "Session Notes" });
      setActivePageId(newPage.id);
      toast.success("Page created");
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.ClientNotebookPage.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook_pages", selectedSubjectId] });
      setActivePageId(null);
      toast.success("Page deleted");
    }
  });

  const handleSave = () => {
    if (!activePageId) return;
    setIsSaving(true);
    let drawContent = activePage.draw_content;
    if (excalidrawAPI) {
      const elements = excalidrawAPI.getSceneElements();
      drawContent = JSON.stringify(elements);
    }
    const textContent = editor ? editor.getHTML() : activePage.text_content;

    saveMutation.mutate({
      id: activePageId,
      data: {
        text_content: textContent,
        draw_content: drawContent,
        mode
      }
    });
  };

  const handleExportDrawing = async () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    if (!elements || !elements.length) return;
    try {
      const blob = await exportToBlob({
        elements,
        mimeType: "image/png",
        appState: { exportBackground: true },
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activePage?.title || "drawing"}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to export drawing");
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-4 w-full">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <Select value={selectedSubjectId} onValueChange={(val) => {
            setSelectedSubjectId(val);
            setActivePageId(null);
          }}>
            <SelectTrigger className="w-full bg-secondary border-border text-foreground">
              <SelectValue placeholder="Select Client / Lead" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {allSubjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedSubjectId ? (
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
            {sections.map(section => {
              const sectionPages = pages.filter(p => p.section_name === section);
              const isExpanded = expandedSections[section];
              
              return (
                <div key={section} className="mb-2">
                  <div 
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer text-muted-foreground transition-colors"
                    onClick={() => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <Folder className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium">{section}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="ml-auto w-6 h-6 hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewPageData({ ...newPageData, section_name: section });
                        setShowAddPageDialog(true);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  {isExpanded && (
                    <div className="pl-6 pr-2 py-1 space-y-1">
                      {sectionPages.map(page => (
                        <div 
                          key={page.id}
                          className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm transition-colors ${activePageId === page.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                          onClick={() => setActivePageId(page.id)}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <File className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{page.title}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-5 h-5 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/20 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePageMutation.mutate(page.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      {sectionPages.length === 0 && (
                        <div className="text-xs text-gray-600 pl-6 py-1 italic">No pages</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-muted-foreground text-sm">
            Select a client or lead to view their notebook
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden relative">
        {activePageId ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-foreground">{activePage?.title}</h2>
                <div className="bg-secondary p-1 rounded-lg flex items-center gap-1 border border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-3 rounded-md transition-colors ${mode === 'text' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => {
                      setMode("text");
                      if (activePage?.mode !== "text") {
                        saveMutation.mutate({ id: activePageId, data: { mode: "text" } });
                      }
                    }}
                  >
                    <Type className="w-4 h-4 mr-2" /> Text
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-3 rounded-md transition-colors ${mode === 'draw' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => {
                      setMode("draw");
                      if (activePage?.mode !== "draw") {
                        saveMutation.mutate({ id: activePageId, data: { mode: "draw" } });
                      }
                    }}
                  >
                    <PenTool className="w-4 h-4 mr-2" /> Draw
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mode === "draw" && (
                  <Button variant="outline" size="sm" onClick={handleExportDrawing} className="bg-secondary border-border text-muted-foreground hover:text-foreground">
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                )}
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="bg-emerald-500 hover:bg-emerald-600 text-foreground"
                >
                  <Save className="w-4 h-4 mr-2" /> 
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
              {mode === "text" ? (
                <div className="h-full flex flex-col overflow-hidden bg-card">
                  <MenuBar editor={editor} />
                  <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
                    <div className="max-w-3xl mx-auto prose prose-invert prose-emerald min-h-[500px]">
                      <EditorContent editor={editor} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full bg-card excalidraw-wrapper">
                  <Excalidraw 
                    theme="dark"
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <p>Select a page or create a new one</p>
            {selectedSubjectId && (
              <Button 
                variant="outline" 
                className="mt-4 bg-secondary border-border text-muted-foreground hover:text-foreground"
                onClick={() => setShowAddPageDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> New Page
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={showAddPageDialog} onOpenChange={setShowAddPageDialog}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Section</label>
              <Select 
                value={newPageData.section_name} 
                onValueChange={(v) => setNewPageData({ ...newPageData, section_name: v })}
              >
                <SelectTrigger className="bg-card border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  {sections.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Page Title</label>
              <Input 
                value={newPageData.title} 
                onChange={e => setNewPageData({ ...newPageData, title: e.target.value })} 
                className="bg-card border-border text-foreground"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddPageDialog(false)} className="text-muted-foreground hover:text-foreground hover:bg-accent">Cancel</Button>
            <Button 
              onClick={() => createPageMutation.mutate(newPageData)}
              disabled={!newPageData.title.trim() || createPageMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-foreground"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #6b7280;
          pointer-events: none;
          height: 0;
        }
        ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }
        ul[data-type="taskList"] li > label {
          margin-right: 0.5rem;
          user-select: none;
        }
        ul[data-type="taskList"] li > div {
          flex: 1;
        }
        .excalidraw-wrapper {
          position: absolute;
          inset: 0;
        }
      `}} />
    </div>
  );
}