import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, File, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MedicalReleaseUpload({ clientId, clientUserId, contractId, onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      
      // Update existing Contract entity if we have contractId, else create
      if (contractId) {
        await base44.entities.Contract.update(contractId, {
          status: "signed",
          document_url: data.file_url,
          signed_date: new Date().toLocaleDateString('sv-SE')
        });
      } else {
        await base44.entities.Contract.create({
          client_id: clientId,
          client_user_id: clientUserId,
          client_name: "Client",
          title: "Medical Release Form",
          type: "waiver",
          content: "Medical Release Form - Uploaded by Client",
          status: "signed",
          document_url: data.file_url,
          signed_date: new Date().toLocaleDateString('sv-SE')
        });
      }

      setUploadedFile({
        name: file.name,
        url: data.file_url,
        date: new Date().toLocaleDateString()
      });

      toast.success("Document uploaded successfully");
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <File className="w-5 h-5" />
          Upload Signed Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Please upload the completed and signed document here.
        </p>

        {!uploadedFile ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <Label htmlFor="medical-file" className="cursor-pointer text-center">
                  <span className="font-medium text-slate-900">Click to upload</span>
                  <span className="text-slate-600"> or drag and drop</span>
                </Label>
                <p className="text-xs text-slate-500">PDF, JPG, or PNG (max 10MB)</p>
                <Input
                  id="medical-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </div>
            </div>
            {isUploading && (
              <div className="flex items-center justify-center gap-2 p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-slate-600">Uploading...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <File className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-green-900">{uploadedFile.name}</p>
                  <p className="text-sm text-green-700">Uploaded on {uploadedFile.date}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                  className="text-green-600 hover:text-red-600 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(uploadedFile.url)}
            >
              View Uploaded Form
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}