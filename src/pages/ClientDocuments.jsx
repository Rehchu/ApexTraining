import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, PenLine, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import ClientOnboardingForms from "@/components/onboarding/ClientOnboardingForms";
import ESignDialog from "@/components/contracts/ESignDialog";

const STATUS_BADGE = {
  sent: { label: "Awaiting your signature", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  signed: { label: "Signed", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  draft: { label: "Draft", className: "bg-secondary text-muted-foreground border-border" },
};

export default function ClientDocuments() {
  const [user, setUser] = useState(null);
  const [signingContract, setSigningContract] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // The client's Client record (created by their trainer) links them to contracts.
  const { data: clientRecord } = useQuery({
    queryKey: ["myClientRecord", user?.email],
    queryFn: async () => {
      const byEmail = await base44.entities.Client.filter({ email: user.email });
      if (byEmail.length > 0) return byEmail[0];
      const byUserId = await base44.entities.Client.filter({ user_id: user.id });
      return byUserId[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["myContracts", clientRecord?.id],
    queryFn: () => base44.entities.Contract.filter({ client_id: clientRecord.id }, "-created_date"),
    enabled: !!clientRecord?.id,
  });

  const pending = contracts.filter((c) => c.status === "sent");
  const completed = contracts.filter((c) => c.status === "signed");

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-emerald-500/15 rounded-xl">
          <FileText className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground">My Documents</h1>
          <p className="text-muted-foreground">Agreements, waivers, and forms from your trainer.</p>
        </div>
      </div>

      {/* Pending forms workflow (PAR-Q, intake, medical release, e-sign) */}
      {clientRecord && (
        <ClientOnboardingForms
          clientId={clientRecord.id}
          clientUserId={user.id}
          clientName={clientRecord.full_name || user.full_name}
          isOptional
        />
      )}

      {/* Full document history */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">All documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading documents...
            </div>
          ) : contracts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              {clientRecord
                ? "No documents yet. Anything your trainer sends will appear here."
                : "Documents from a trainer appear here once you're connected to one."}
            </p>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => {
                const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
                return (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-secondary/40">
                    <div className="flex items-start gap-3 min-w-0">
                      {c.status === "signed"
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        : <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {(c.type || "agreement").replace(/_/g, " ")}
                          {c.signed_date ? ` · signed ${format(new Date(c.signed_date), "MMM d, yyyy")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                      {c.document_url && (
                        <a href={c.document_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="border-border">
                            <Download className="w-4 h-4 mr-1" /> View
                          </Button>
                        </a>
                      )}
                      {c.status === "sent" && c.content && !c.content.startsWith("[Uploaded Document") && (
                        <Button size="sm" onClick={() => setSigningContract(c)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                          <PenLine className="w-4 h-4 mr-1" /> Review & sign
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ESignDialog
        contract={signingContract}
        open={!!signingContract}
        onOpenChange={(open) => !open && setSigningContract(null)}
        onSigned={() => queryClient.invalidateQueries({ queryKey: ["myContracts"] })}
      />
    </div>
  );
}
