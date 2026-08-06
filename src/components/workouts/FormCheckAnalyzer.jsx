import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Video, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { downscaleToDataUrl } from "@/lib/imageUtil";
import { Badge } from "@/components/ui/badge";

export default function FormCheckAnalyzer({ clientId, trainerId }) {
  const [exerciseName, setExerciseName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: formChecks = [] } = useQuery({
    queryKey: ["formChecks", clientId],
    queryFn: () => base44.entities.FormCheck.filter({ client_id: clientId }, "-created_date"),
    enabled: !!clientId
  });

  const createFormCheckMutation = useMutation({
    mutationFn: (data) => base44.entities.FormCheck.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["formChecks"] })
  });

  const handleFileUpload = async (e) => {
    if (!exerciseName) {
      toast.error("Please enter the exercise name first.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;
      // Analyze a downscaled copy (vision models cap request size). Non-images
      // (e.g. video) can't be analyzed — fall back to a graceful message.
      let smallDataUrl = null;
      try { smallDataUrl = await downscaleToDataUrl(file); } catch { /* not an image */ }
      setIsUploading(false);

      if (!smallDataUrl) {
        toast.error("Please upload a photo (not a video) for AI form analysis.");
        setIsAnalyzing(false);
        return;
      }

      setIsAnalyzing(true);
      const aiRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the exercise form for: ${exerciseName}. The user provided a photo. Identify any posture faults, issues with depth/alignment, and give 2-3 constructive tips to improve form.`,
        file_urls: [smallDataUrl]
      });
      
      await createFormCheckMutation.mutateAsync({
        client_id: clientId,
        trainer_id: trainerId,
        exercise_name: exerciseName,
        media_url: fileUrl,
        ai_feedback: typeof aiRes === "string" ? aiRes : JSON.stringify(aiRes),
        status: "analyzed"
      });

      toast.success("Form check analyzed successfully!");
      setExerciseName("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze form.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <Video className="w-5 h-5" /> AI Form Coach
          </CardTitle>
          <p className="text-sm text-muted-foreground">Upload a photo of your lift to receive instant AI form correction and tips.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input 
              placeholder="e.g. Barbell Back Squat" 
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="bg-card border-border text-foreground"
            />
            <div className="relative shrink-0">
              <input 
                type="file" 
                accept="image/*,video/mp4,video/quicktime" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={isUploading || isAnalyzing || !exerciseName}
              />
              <Button 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 pointer-events-none"
                disabled={isUploading || isAnalyzing || !exerciseName}
              >
                {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> :
                 isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Form...</> :
                 <><Upload className="w-4 h-4 mr-2" /> Upload & Analyze</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {formChecks.map((check) => (
          <Card key={check.id} className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base text-foreground">{check.exercise_name}</CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400"><CheckCircle2 className="w-3 h-3 mr-1" /> Analyzed</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {check.media_url && (
                <div className="mb-4 rounded-lg overflow-hidden h-40 bg-secondary">
                  <img src={check.media_url} alt={check.exercise_name} className="w-full h-full object-contain" />
                </div>
              )}
              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <p className="text-xs font-semibold text-blue-400 mb-1">AI Feedback:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{check.ai_feedback}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}