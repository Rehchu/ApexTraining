import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function MedicalReleaseForm({ clientId, onComplete }) {
  const [section, setSection] = useState("trainer");
  const [formData, setFormData] = useState({
    // Trainer section
    physician_name: "",
    activity_types: [],
    duration: "",
    intensity: "",
    additional_notes: "",
    // Physician section
    medication_effect: "",
    recommendations: "",
    physician_approval: false,
    physician_name_approval: "",
    physician_signature: ""
  });

  const activityTypes = [
    { label: "Cardiovascular", value: "cardiovascular" },
    { label: "Resistance Training", value: "resistance" },
    { label: "Flexibility", value: "flexibility" },
    { label: "Other", value: "other" }
  ];

  const handleActivityToggle = (value) => {
    setFormData({
      ...formData,
      activity_types: formData.activity_types.includes(value)
        ? formData.activity_types.filter(a => a !== value)
        : [...formData.activity_types, value]
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (section === "trainer") {
      if (!formData.physician_name || formData.activity_types.length === 0) {
        toast.error("Please fill in all required fields");
        return;
      }
      setSection("physician");
      toast.success("Trainer section completed. Now for physician approval.");
    } else {
      if (!formData.physician_approval) {
        toast.error("Physician approval is required");
        return;
      }
      onComplete(formData);
      toast.success("Medical release form submitted");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {section === "trainer" && (
        <Card>
          <CardHeader>
            <CardTitle>Medical Release Form - Section I</CardTitle>
            <p className="text-sm text-slate-600 mt-2">To be completed by fitness professional</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Client's Physician Name *</Label>
              <Input
                value={formData.physician_name}
                onChange={(e) => setFormData({ ...formData, physician_name: e.target.value })}
                placeholder="Dr. Name"
                required
              />
            </div>

            <div>
              <Label>Type of Activity *</Label>
              <div className="space-y-2">
                {activityTypes.map((activity) => (
                  <div key={activity.value} className="flex items-center gap-2">
                    <Checkbox
                      id={activity.value}
                      checked={formData.activity_types.includes(activity.value)}
                      onCheckedChange={() => handleActivityToggle(activity.value)}
                    />
                    <Label htmlFor={activity.value} className="font-normal cursor-pointer">
                      {activity.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Time/Duration</Label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 3 times per week, 60 minutes"
              />
            </div>

            <div>
              <Label>Intensity</Label>
              <Select value={formData.intensity} onValueChange={(value) => setFormData({ ...formData, intensity: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select intensity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Additional Notes from Fitness Professional</Label>
              <Textarea
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                placeholder="Any relevant fitness notes..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {section === "physician" && (
        <Card>
          <CardHeader>
            <CardTitle>Medical Release Form - Section II</CardTitle>
            <p className="text-sm text-slate-600 mt-2">To be completed by participant's physician</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Physician Review:</strong> Review the program details on the previous section before completing this section.
              </p>
            </div>

            <div>
              <Label>Medication Effect on Heart Rate</Label>
              <Select value={formData.medication_effect} onValueChange={(value) => setFormData({ ...formData, medication_effect: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select effect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No effect on heart rate response</SelectItem>
                  <SelectItem value="raises">Raises heart rate response</SelectItem>
                  <SelectItem value="lowers">Lowers heart rate response</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Patient Recommendations or Restrictions</Label>
              <Textarea
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                placeholder="Any restrictions or special recommendations..."
                rows={4}
              />
            </div>

            <div>
              <Label>Physician Name</Label>
              <Input
                value={formData.physician_name_approval}
                onChange={(e) => setFormData({ ...formData, physician_name_approval: e.target.value })}
                placeholder="Physician name"
              />
            </div>

            <div>
              <Label>Physician Signature (for digital signature, type name)</Label>
              <Input
                value={formData.physician_signature}
                onChange={(e) => setFormData({ ...formData, physician_signature: e.target.value })}
                placeholder="Physician signature"
              />
            </div>

            <div className="flex items-start gap-3 p-3 border rounded-lg bg-slate-50">
              <Checkbox
                id="approval"
                checked={formData.physician_approval}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, physician_approval: checked })
                }
              />
              <Label htmlFor="approval" className="text-sm font-normal cursor-pointer">
                The patient has my approval to begin an exercise program with the recommendations or restrictions stated above.
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between gap-3">
        {section === "physician" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setSection("trainer")}
          >
            Back
          </Button>
        )}
        <div className="flex-1" />
        <Button type="submit" className="bg-gradient-to-r from-emerald-500 to-teal-600">
          {section === "trainer" ? "Next: Physician Section" : "Submit Medical Release"}
        </Button>
      </div>
    </form>
  );
}