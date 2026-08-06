import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, Loader2, Ruler, Weight, Zap, Image, X } from "lucide-react";
import { useUnitSystem } from "@/components/hooks/useUnitSystem";

export default function ProgressForm({ open, onOpenChange, client, log, onSubmit }) {
  const { system, convertWeightValue, parseWeight, convertHeightValue, parseHeight, weightUnit, heightUnit } = useUnitSystem();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('sv-SE'),
    weight_kg: convertWeightValue(client?.weight_kg) || "",
    body_fat_percentage: client?.body_fat_percentage || "",
    measurements: {
      chest: convertHeightValue(client?.measurements?.chest) || "",
      waist: convertHeightValue(client?.measurements?.waist) || "",
      hips: convertHeightValue(client?.measurements?.hips) || "",
      biceps_left: convertHeightValue(client?.measurements?.biceps_left) || "",
      biceps_right: convertHeightValue(client?.measurements?.biceps_right) || "",
      thigh_left: convertHeightValue(client?.measurements?.thigh_left) || "",
      thigh_right: convertHeightValue(client?.measurements?.thigh_right) || "",
    },
    performance_metrics: {
      bench_press_kg: "",
      squat_kg: "",
      deadlift_kg: "",
      max_pullups: "",
      max_pushups: "",
      plank_seconds: "",
    },
    notes: "",
    client_feedback: "",
    photo_url: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  React.useEffect(() => {
    if (log) {
      setFormData({
        ...log,
        weight_kg: convertWeightValue(log.weight_kg) || "",
        measurements: {
          chest: convertHeightValue(log.measurements?.chest) || "",
          waist: convertHeightValue(log.measurements?.waist) || "",
          hips: convertHeightValue(log.measurements?.hips) || "",
          biceps_left: convertHeightValue(log.measurements?.biceps_left) || "",
          biceps_right: convertHeightValue(log.measurements?.biceps_right) || "",
          thigh_left: convertHeightValue(log.measurements?.thigh_left) || "",
          thigh_right: convertHeightValue(log.measurements?.thigh_right) || "",
        },
        performance_metrics: {
          bench_press_kg: convertWeightValue(log.performance_metrics?.bench_press_kg) || "",
          squat_kg: convertWeightValue(log.performance_metrics?.squat_kg) || "",
          deadlift_kg: convertWeightValue(log.performance_metrics?.deadlift_kg) || "",
          max_pullups: log.performance_metrics?.max_pullups || "",
          max_pushups: log.performance_metrics?.max_pushups || "",
          plank_seconds: log.performance_metrics?.plank_seconds || "",
        }
      });
    } else {
      setFormData({
        date: new Date().toLocaleDateString('sv-SE'),
        weight_kg: convertWeightValue(client?.weight_kg) || "",
        body_fat_percentage: client?.body_fat_percentage || "",
        measurements: {
          chest: convertHeightValue(client?.measurements?.chest) || "",
          waist: convertHeightValue(client?.measurements?.waist) || "",
          hips: convertHeightValue(client?.measurements?.hips) || "",
          biceps_left: convertHeightValue(client?.measurements?.biceps_left) || "",
          biceps_right: convertHeightValue(client?.measurements?.biceps_right) || "",
          thigh_left: convertHeightValue(client?.measurements?.thigh_left) || "",
          thigh_right: convertHeightValue(client?.measurements?.thigh_right) || "",
        },
        performance_metrics: {
          bench_press_kg: "",
          squat_kg: "",
          deadlift_kg: "",
          max_pullups: "",
          max_pushups: "",
          plank_seconds: "",
        },
        notes: "",
        client_feedback: ""
      });
    }
  }, [log, open, client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Auto-adapt dragon based on progress
    if (client && !log) {
      let bodyType = client.pet_state?.body_type || "default";
      let changed = false;
      
      const newWeight = parseFloat(formData.weight_kg);
      const oldWeight = parseFloat(client.weight_kg);
      if (newWeight && oldWeight && newWeight < oldWeight) {
        bodyType = "slim";
        changed = true;
      }
      
      // Check if strength increased
      const currentBench = parseFloat(formData.performance_metrics?.bench_press_kg);
      const currentSquat = parseFloat(formData.performance_metrics?.squat_kg);
      // Here currentBench is the DISPLAY unit. The oldBench on client is in KG. We compare after converting back.
      const parsedBench = parseWeight(currentBench);
      const parsedSquat = parseWeight(currentSquat);
      const oldBench = parseFloat(client.performance_metrics?.bench_press_kg);
      const oldSquat = parseFloat(client.performance_metrics?.squat_kg);
      
      if ((parsedBench && oldBench && parsedBench > oldBench) || 
          (parsedSquat && oldSquat && parsedSquat > oldSquat)) {
        bodyType = "muscular";
        changed = true;
      }
      
      if (changed) {
        const updatedPet = { ...(client.pet_state || {}), body_type: bodyType };
        try {
           const { base44 } = await import('@/api/base44Client');
           const dbPerf = {
             ...formData.performance_metrics,
             bench_press_kg: parseWeight(formData.performance_metrics?.bench_press_kg),
             squat_kg: parseWeight(formData.performance_metrics?.squat_kg),
             deadlift_kg: parseWeight(formData.performance_metrics?.deadlift_kg)
           };
           await base44.entities.Client.update(client.id, { pet_state: updatedPet, weight_kg: parseWeight(formData.weight_kg) || oldWeight, performance_metrics: dbPerf });
           window.dispatchEvent(new Event('profileUpdated'));
        } catch(e) {}
      }
    }
    
    const dbFormData = {
      ...formData,
      weight_kg: parseWeight(formData.weight_kg),
      measurements: {
        chest: parseHeight(formData.measurements.chest),
        waist: parseHeight(formData.measurements.waist),
        hips: parseHeight(formData.measurements.hips),
        biceps_left: parseHeight(formData.measurements.biceps_left),
        biceps_right: parseHeight(formData.measurements.biceps_right),
        thigh_left: parseHeight(formData.measurements.thigh_left),
        thigh_right: parseHeight(formData.measurements.thigh_right)
      },
      performance_metrics: {
        ...formData.performance_metrics,
        bench_press_kg: parseWeight(formData.performance_metrics.bench_press_kg),
        squat_kg: parseWeight(formData.performance_metrics.squat_kg),
        deadlift_kg: parseWeight(formData.performance_metrics.deadlift_kg)
      }
    };

    await onSubmit(dbFormData);
    setIsLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value }
    }));
  };

  const handlePerformanceChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      performance_metrics: { ...prev.performance_metrics, [field]: value }
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photo_url: data.file_url }));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-foreground" />
            </div>
            {log ? "Edit Progress Log" : "Log Progress"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              required
            />
          </div>

          {/* Body Metrics */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Weight className="w-4 h-4" />
              Body Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight_kg">Weight ({weightUnit})</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  placeholder={system === 'imperial' ? "150" : "70"}
                  value={formData.weight_kg}
                  onChange={(e) => handleChange("weight_kg", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_fat_percentage">Body Fat %</Label>
                <Input
                  id="body_fat_percentage"
                  type="number"
                  step="0.1"
                  placeholder="20"
                  value={formData.body_fat_percentage}
                  onChange={(e) => handleChange("body_fat_percentage", parseFloat(e.target.value) || "")}
                />
              </div>
            </div>
          </div>

          {/* Body Measurements */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Body Measurements ({heightUnit})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="chest">Chest</Label>
                <Input
                  id="chest"
                  type="number"
                  step="0.1"
                  placeholder="90"
                  value={formData.measurements.chest}
                  onChange={(e) => handleMeasurementChange("chest", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="waist">Waist</Label>
                <Input
                  id="waist"
                  type="number"
                  step="0.1"
                  placeholder="80"
                  value={formData.measurements.waist}
                  onChange={(e) => handleMeasurementChange("waist", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hips">Hips</Label>
                <Input
                  id="hips"
                  type="number"
                  step="0.1"
                  placeholder="95"
                  value={formData.measurements.hips}
                  onChange={(e) => handleMeasurementChange("hips", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="biceps_left">Biceps (L)</Label>
                <Input
                  id="biceps_left"
                  type="number"
                  step="0.1"
                  placeholder="30"
                  value={formData.measurements.biceps_left}
                  onChange={(e) => handleMeasurementChange("biceps_left", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="biceps_right">Biceps (R)</Label>
                <Input
                  id="biceps_right"
                  type="number"
                  step="0.1"
                  placeholder="30"
                  value={formData.measurements.biceps_right}
                  onChange={(e) => handleMeasurementChange("biceps_right", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thigh_left">Thigh (L)</Label>
                <Input
                  id="thigh_left"
                  type="number"
                  step="0.1"
                  placeholder="55"
                  value={formData.measurements.thigh_left}
                  onChange={(e) => handleMeasurementChange("thigh_left", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thigh_right">Thigh (R)</Label>
                <Input
                  id="thigh_right"
                  type="number"
                  step="0.1"
                  placeholder="55"
                  value={formData.measurements.thigh_right}
                  onChange={(e) => handleMeasurementChange("thigh_right", parseFloat(e.target.value) || "")}
                />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bench_press_kg">Bench Press ({weightUnit})</Label>
                <Input
                  id="bench_press_kg"
                  type="number"
                  step="0.5"
                  placeholder={system === 'imperial' ? "135" : "60"}
                  value={formData.performance_metrics.bench_press_kg}
                  onChange={(e) => handlePerformanceChange("bench_press_kg", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="squat_kg">Squat ({weightUnit})</Label>
                <Input
                  id="squat_kg"
                  type="number"
                  step="0.5"
                  placeholder={system === 'imperial' ? "185" : "80"}
                  value={formData.performance_metrics.squat_kg}
                  onChange={(e) => handlePerformanceChange("squat_kg", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadlift_kg">Deadlift ({weightUnit})</Label>
                <Input
                  id="deadlift_kg"
                  type="number"
                  step="0.5"
                  placeholder={system === 'imperial' ? "225" : "100"}
                  value={formData.performance_metrics.deadlift_kg}
                  onChange={(e) => handlePerformanceChange("deadlift_kg", parseFloat(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_pullups">Max Pull-ups</Label>
                <Input
                  id="max_pullups"
                  type="number"
                  placeholder="10"
                  value={formData.performance_metrics.max_pullups}
                  onChange={(e) => handlePerformanceChange("max_pullups", parseInt(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_pushups">Max Push-ups</Label>
                <Input
                  id="max_pushups"
                  type="number"
                  placeholder="30"
                  value={formData.performance_metrics.max_pushups}
                  onChange={(e) => handlePerformanceChange("max_pushups", parseInt(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plank_seconds">Plank (seconds)</Label>
                <Input
                  id="plank_seconds"
                  type="number"
                  placeholder="60"
                  value={formData.performance_metrics.plank_seconds}
                  onChange={(e) => handlePerformanceChange("plank_seconds", parseInt(e.target.value) || "")}
                />
              </div>
            </div>
          </div>

          {/* Progress Photo */}
          <div className="space-y-2">
            <Label>Progress Photo</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
              >
                <Image className="w-4 h-4 mr-2" />
                {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
              </Button>
              {formData.photo_url && (
                <div className="relative inline-block">
                  <img src={formData.photo_url} alt="Progress" className="h-12 w-12 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, photo_url: "" }))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes & Feedback */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="notes">Trainer Notes</Label>
              <Textarea
                id="notes"
                placeholder="Observations, comments, adjustments..."
                className="min-h-[80px]"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_feedback">Client Feedback</Label>
              <Textarea
                id="client_feedback"
                placeholder="How the client is feeling, any concerns..."
                className="min-h-[80px]"
                value={formData.client_feedback}
                onChange={(e) => handleChange("client_feedback", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {log ? "Update Log" : "Save Progress"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}