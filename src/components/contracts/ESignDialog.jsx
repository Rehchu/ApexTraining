import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, PenLine, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * In-app e-signature. The signer reads the agreement, types their full legal
 * name, checks the consent box, and signs — recording their name, email, date,
 * and a timestamp on the contract. Self-contained (no external provider).
 */
export default function ESignDialog({ contract, open, onOpenChange, onSigned }) {
  const [typedName, setTypedName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  if (!contract) return null;

  const handleSign = async () => {
    if (!typedName.trim()) {
      toast.error("Please type your full name to sign.");
      return;
    }
    if (!agreed) {
      toast.error("Please check the box to agree.");
      return;
    }
    setSigning(true);
    try {
      const user = await base44.auth.me();
      const now = new Date();
      await base44.entities.Contract.update(contract.id, {
        status: "signed",
        signed_date: now.toISOString().split("T")[0],
        signature_data: JSON.stringify({
          name: typedName.trim(),
          email: user?.email || contract.client_email || "",
          signed_at: now.toISOString(),
          user_id: user?.id || null,
        }),
      });
      toast.success("Contract signed!");
      onSigned?.();
      onOpenChange(false);
      setTypedName("");
      setAgreed(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to sign the contract.");
    } finally {
      setSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" /> Sign: {contract.title}
          </DialogTitle>
        </DialogHeader>

        {/* Agreement content */}
        <div className="rounded-xl border border-border bg-secondary/50 p-4 max-h-64 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap">
          {contract.content || "No agreement text provided."}
        </div>

        {/* Sign */}
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Type your full legal name to sign</label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="e.g. Jane A. Smith"
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-foreground outline-none focus:border-primary"
              style={{ fontFamily: "'Segoe Script', cursive" }}
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>
              I have read and agree to this document. I understand that typing my name and clicking Sign constitutes a
              legally binding electronic signature.
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-accent transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSign}
              disabled={signing}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-60 inline-flex items-center gap-2"
            >
              {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Sign document
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
