import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, FileText, Download, Eye, PenLine } from "lucide-react";
import ParQForm from "@/components/forms/ParQForm";
import ClientIntakeForm from "@/components/forms/ClientIntakeForm";
import MedicalReleaseFormPrintable from "@/components/forms/MedicalReleaseFormPrintable";
import MedicalReleaseUpload from "@/components/forms/MedicalReleaseUpload";
import ESignDialog from "@/components/contracts/ESignDialog";

export default function ClientOnboardingForms({ clientId, clientUserId, clientName, trainerName, businessName, isOptional = false }) {
  const [activeForm, setActiveForm] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signingContract, setSigningContract] = useState(null);

  useEffect(() => {
    loadContracts();
  }, [clientId, clientUserId]);

  const loadContracts = async () => {
    try {
      const clientContracts = await base44.entities.Contract.filter({
        client_id: clientId
      });
      setContracts(clientContracts);
    } catch (error) {
      console.error("Failed to load contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trainer-assigned contracts that are "sent" and need client e-signature or upload
  const pendingContracts = contracts.filter(c => c.status === "sent" && c.client_id === clientId);

  if (pendingContracts.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-5 rounded-2xl space-y-4 border border-green-500/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/10 border border-green-500/20">
          <FileText className="w-4 h-4 text-green-400" />
        </div>
        <h3 className="font-bold text-foreground">Forms & Documents from Trainer</h3>
      </div>

      <div className="space-y-3">
        {pendingContracts.map((c) => {
          const needsUpload = c.type === "medical_release" || c.type === "waiver" || c.title.toLowerCase().includes("medical release") || c.title.toLowerCase().includes("liability waiver");

          return (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <div>
                <p className="text-sm font-medium text-foreground">{c.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {c.type?.replace(/_/g, " ")} {needsUpload ? "(Requires Print & Upload)" : "(E-Sign)"}
                </p>
              </div>
              <div className="flex gap-2">
                {needsUpload ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveForm({ type: "view", contract: c })}
                      className="border-border text-foreground bg-secondary"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View/Print
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveForm({ type: "upload", contract: c })}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Upload Signed
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setSigningContract(c)}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    Sign Now
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Dialog for Print & Upload */}
      <Dialog open={!!activeForm} onOpenChange={() => setActiveForm(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {activeForm?.type === "view" ? activeForm?.contract?.title : "Upload Signed Document"}
            </DialogTitle>
          </DialogHeader>

          {activeForm?.type === "view" && (
            <div className="space-y-4">
              <div className="bg-white p-8 rounded text-black whitespace-pre-wrap font-mono text-sm">
                {activeForm?.contract?.content}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-foreground">Print Document</Button>
              </div>
            </div>
          )}

          {activeForm?.type === "upload" && (
            <div className="space-y-4">
              <MedicalReleaseUpload
                clientId={clientId}
                clientUserId={clientUserId}
                contractId={activeForm?.contract?.id}
                onUploadComplete={() => {
                  loadContracts();
                  setActiveForm(null);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* E-Sign dialog for trainer-assigned contracts */}
      <ESignDialog
        contract={signingContract}
        open={!!signingContract}
        onOpenChange={(v) => { if (!v) setSigningContract(null); }}
        onSigned={() => { setSigningContract(null); loadContracts(); }}
      />
    </div>
  );
}