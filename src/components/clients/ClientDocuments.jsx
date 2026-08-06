import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Send, CheckCircle, Clock, Edit, Upload, PenLine } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ESignDialog from "@/components/contracts/ESignDialog";

const statusConfig = {
  draft: { label: "Draft", color: "rgba(100,100,100,0.3)", text: "#9ca3af", icon: Edit },
  sent: { label: "Awaiting Signature", color: "rgba(59,130,246,0.2)", text: "#60a5fa", icon: Send },
  signed: { label: "Signed", color: "rgba(34,197,94,0.2)", text: "#4ade80", icon: CheckCircle },
  expired: { label: "Expired", color: "rgba(239,68,68,0.2)", text: "#f87171", icon: Clock },
};

export default function ClientDocuments({ clientId, trainerId }) {
  const [signingContract, setSigningContract] = useState(null);
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["clientContracts", clientId],
    queryFn: () => base44.entities.Contract.filter({ client_id: clientId }, "-created_date"),
    enabled: !!clientId,
  });

  const sendMutation = useMutation({
    mutationFn: (id) => base44.entities.Contract.update(id, { status: "sent" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["clientContracts", clientId]);
      toast.success("Document sent to client");
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#d4a017] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const typeLabel = (type) => type?.replace(/_/g, " ")?.replace(/\b\w/g, c => c.toUpperCase()) || "Document";

  // Separate uploaded docs (have document_url from upload) from text contracts
  const uploadedDocs = contracts.filter(c => c.document_url && c.content?.startsWith("[Uploaded Document"));
  const signedContracts = contracts.filter(c => c.status === "signed");
  const pendingContracts = contracts.filter(c => c.status !== "signed");

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Documents", value: contracts.length, color: "#d4a017" },
          { label: "Signed", value: signedContracts.length, color: "#4ade80" },
          { label: "Pending", value: pendingContracts.filter(c => c.status === "sent").length, color: "#60a5fa" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <FileText className="w-12 h-12 text-gray-600" />
          <p className="text-foreground font-medium">No documents yet</p>
          <p className="text-muted-foreground text-sm">Contracts and signed documents will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(contract => {
            const cfg = statusConfig[contract.status] || statusConfig.draft;
            const Icon = cfg.icon;
            const isUploaded = contract.document_url && contract.content?.startsWith("[Uploaded Document");

            return (
              <div key={contract.id} className="rounded-xl p-4 flex items-start gap-4 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: isUploaded ? 'rgba(139,92,246,0.15)' : 'rgba(212,175,55,0.1)', border: `1px solid ${isUploaded ? 'rgba(139,92,246,0.3)' : 'rgba(212,175,55,0.2)'}` }}>
                  {isUploaded
                    ? <Upload className="w-5 h-5" style={{ color: '#a78bfa' }} />
                    : <FileText className="w-5 h-5" style={{ color: '#d4a017' }} />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground text-sm truncate">{contract.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: cfg.color, color: cfg.text }}>
                      <Icon className="w-3 h-3 inline mr-1" />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{typeLabel(contract.type)}</span>
                    {contract.created_date && (
                      <span className="text-xs text-gray-600">
                        Created {format(new Date(contract.created_date), "MMM d, yyyy")}
                      </span>
                    )}
                    {contract.signed_date && (
                      <span className="text-xs" style={{ color: '#4ade80' }}>
                        ✓ Signed {format(new Date(contract.signed_date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {contract.document_url && (
                    <a href={contract.document_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 px-2">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                  {contract.status === "draft" && (
                    <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-2 text-xs"
                      onClick={() => sendMutation.mutate(contract.id)}>
                      <Send className="w-3.5 h-3.5 mr-1" /> Send
                    </Button>
                  )}
                  {contract.status === "sent" && !isUploaded && (
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs"
                      style={{ color: '#d4a017' }}
                      onClick={() => setSigningContract(contract)}>
                      <PenLine className="w-3.5 h-3.5 mr-1" /> Sign
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ESignDialog
        contract={signingContract}
        open={!!signingContract}
        onOpenChange={(v) => !v && setSigningContract(null)}
        onSigned={() => {
          queryClient.invalidateQueries(["clientContracts", clientId]);
          setSigningContract(null);
        }}
      />
    </div>
  );
}