import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function UploadContractDialog({ open, onOpenChange, clients, trainerId, onCreated }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("service_agreement");
  const [clientId, setClientId] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setTitle("");
    setType("service_agreement");
    setClientId("");
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a file"); return; }
    if (!title) { toast.error("Please enter a title"); return; }

    setUploading(true);
    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create the contract record
      const client = clients.find(c => c.id === clientId);
      await base44.entities.Contract.create({
        title,
        type,
        client_id: clientId || null,
        client_name: client?.full_name || null,
        trainer_id: trainerId,
        status: clientId ? "sent" : "draft",
        content: `[Uploaded Document: ${file.name}]`,
        document_url: file_url,
      });

      toast.success("Document uploaded successfully");
      onCreated?.();
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg text-foreground p-0 bg-card border-border">
        <DialogHeader className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)' }}>
              <Upload className="w-4 h-4 text-black" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide uppercase mb-0.5" style={{ color: '#d4a017' }}>Upload</p>
              <span className="text-base font-bold">Custom Document</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-muted-foreground text-sm mb-1.5 block">Document Title *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Training Agreement 2024"
              required
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground text-sm mb-1.5 block">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="service_agreement">Service Agreement</SelectItem>
                  <SelectItem value="waiver">Liability Waiver</SelectItem>
                  <SelectItem value="liability_release">Liability Release</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm mb-1.5 block">Assign to Client (optional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value={null}>No client (template)</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-sm mb-1.5 block">File (PDF, Word, Image) *</Label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer transition-all"
              style={{ border: '2px dashed hsl(var(--border))', background: file ? 'hsl(var(--secondary))' : 'transparent' }}>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.png,.jpg,.jpeg"
                onChange={e => setFile(e.target.files[0])} />
              {file ? (
                <>
                  <FileText className="w-8 h-8" style={{ color: '#d4a017' }} />
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to browse or drag & drop</p>
                  <p className="text-xs text-muted-foreground">PDF, Word, TXT, RTF, ODT, or image files</p>
                </>
              )}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-accent">
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}
              style={{ background: 'linear-gradient(135deg, #d4a017, #f5c842)', color: 'black', fontWeight: 700 }}>
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4 mr-2" /> Upload Document</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}