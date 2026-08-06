import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ProgressChartForm({ clientId, initialData, onComplete }) {
  const [formData, setFormData] = useState(initialData || {
    date: format(new Date(), 'yyyy-MM-dd'),
    chest: "",
    biceps: "",
    waist: "",
    hips: "",
    thighs: "",
    knee: "",
    ankle: "",
    weight: "",
    timed_walk_test: "",
    step_test: "",
    sit_reach_test: "",
    curl_ups: "",
    push_ups: "",
    wall_push_aways: "",
    resting_heart_rate: ""
  });

  const measurements = [
    { label: "Chest (at nipple line)", field: "chest", unit: "cm" },
    { label: "Biceps (middle of upper arm)", field: "biceps", unit: "cm" },
    { label: "Waist (at narrowest point)", field: "waist", unit: "cm" },
    { label: "Hips (4 inches below navel)", field: "hips", unit: "cm" },
    { label: "Thighs (halfway between knee and hip)", field: "thighs", unit: "cm" },
    { label: "Knee (in sitting position)", field: "knee", unit: "cm" },
    { label: "Ankle (at narrowest point)", field: "ankle", unit: "cm" },
    { label: "Weight", field: "weight", unit: "kg" }
  ];

  const assessments = [
    { label: "Timed Walk Test", field: "timed_walk_test", unit: "minutes" },
    { label: "Step Test", field: "step_test", unit: "beats/min" },
    { label: "Sit and Reach Test", field: "sit_reach_test", unit: "cm" },
    { label: "Curl-Ups (number/60 sec.)", field: "curl_ups", unit: "reps" },
    { label: "Modified Push-Ups (number/60 sec.)", field: "push_ups", unit: "reps" },
    { label: "Wall Push-Aways (number/60 sec.)", field: "wall_push_aways", unit: "reps" },
    { label: "Resting Heart Rate", field: "resting_heart_rate", unit: "bpm" }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(formData);
    toast.success("Progress chart saved");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fitness Progress Chart</CardTitle>
          <p className="text-sm text-slate-600 mt-2">Track measurements and fitness assessments over time</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Assessment Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Body Measurements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {measurements.map((m) => (
                <div key={m.field}>
                  <Label>{m.label} ({m.unit})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData[m.field]}
                    onChange={(e) => setFormData({ ...formData, [m.field]: e.target.value })}
                    placeholder="0.0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Fitness Assessment Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessments.map((a) => (
                <div key={a.field}>
                  <Label>{a.label} ({a.unit})</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData[a.field]}
                    onChange={(e) => setFormData({ ...formData, [a.field]: e.target.value })}
                    placeholder="0.0"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600">
          Save Progress Chart
        </Button>
      </div>
    </form>
  );
}