import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { downscaleToDataUrl } from "@/lib/imageUtil";

export default function PhotoMealLogger({ onMealAnalyzed }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // Keep the original for the meal record, but analyze a downscaled copy.
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes?.file_url || null;
      const smallDataUrl = await downscaleToDataUrl(file);
      setIsUploading(false);

      setIsAnalyzing(true);
      const aiRes = await base44.integrations.Core.InvokeLLM({
        prompt: "Analyze this meal photo. Estimate the calories, protein in grams, carbohydrates in grams, and fat in grams. Also provide a brief description of the food.",
        file_urls: [smallDataUrl],
        response_json_schema: {
          type: "object",
          properties: {
            food_description: { type: "string" },
            calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" }
          },
          required: ["food_description", "calories", "protein_g", "carbs_g", "fat_g"]
        }
      });

      const hasData = aiRes && typeof aiRes.calories === "number" && !aiRes.__stub;
      if (hasData) {
        toast.success("Meal analyzed!");
        if (onMealAnalyzed) onMealAnalyzed({ ...aiRes, fileUrl });
      } else {
        toast.error("Couldn't read that photo — try a clearer shot, or add the meal manually.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't analyze the photo — add the meal manually for now.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="glass-card mb-6 border-orange-500/30 bg-orange-500/5">
      <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Camera className="text-orange-400" /> AI Meal Scanner
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Snap a photo of your food, and our AI will estimate the calories and macros instantly.
          </p>
        </div>
        <div className="relative">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={isUploading || isAnalyzing}
          />
          <Button 
            className="bg-gradient-to-r from-orange-500 to-red-600 pointer-events-none"
            disabled={isUploading || isAnalyzing}
          >
            {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> :
             isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> :
             <><UploadCloud className="w-4 h-4 mr-2" /> Select Photo</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}