import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ClientIntakeForm({ clientId, clientUserId, clientName, onComplete }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    motivation: "",
    importance: "",
    success_feeling: "",
    failure_feeling: "",
    goal_specific: "",
    goal_measurable: "",
    goal_achievable: "",
    goal_realistic: "",
    goal_timely: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await base44.entities.Contract.create({
        client_id: clientId,
        client_user_id: clientUserId,
        client_name: clientName || "Client",
        title: "Client Intake Form",
        type: "other",
        content: JSON.stringify(formData, null, 2),
        status: "signed",
        signed_date: new Date().toLocaleDateString('sv-SE')
      });
      onComplete(formData);
      toast.success("Intake form saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit intake form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>HIPAA Privacy Notice:</strong> The information you provide is confidential. It will only be shared with your assigned trainer and used solely to design your fitness program. You have the right to request a copy of your records at any time.
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Getting to Know You</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>What motivated you to seek out fitness assistance?</Label>
            <Textarea
              value={formData.motivation}
              onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
              placeholder="Tell us what brought you here..."
            />
          </div>

          <div>
            <Label>Why is that important to you?</Label>
            <Textarea
              value={formData.importance}
              onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
              placeholder="Share what this means to you..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>How would you feel if you achieve this?</Label>
              <Textarea
                value={formData.success_feeling}
                onChange={(e) => setFormData({ ...formData, success_feeling: e.target.value })}
                placeholder="Describe the feeling..."
                rows={3}
              />
            </div>
            <div>
              <Label>How would you feel if you don't?</Label>
              <Textarea
                value={formData.failure_feeling}
                onChange={(e) => setFormData({ ...formData, failure_feeling: e.target.value })}
                placeholder="Describe the feeling..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>S.M.A.R.T. Goals</CardTitle>
          <p className="text-sm text-slate-600 mt-2">Goals must be Specific, Measurable, Achievable, Realistic and Timely</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Specific - What exactly do you want to achieve?</Label>
            <Input
              value={formData.goal_specific}
              onChange={(e) => setFormData({ ...formData, goal_specific: e.target.value })}
              placeholder="e.g., Run a 5K"
            />
          </div>

          <div>
            <Label>Measurable - How will you measure success?</Label>
            <Input
              value={formData.goal_measurable}
              onChange={(e) => setFormData({ ...formData, goal_measurable: e.target.value })}
              placeholder="e.g., Under 40 minutes"
            />
          </div>

          <div>
            <Label>Achievable - Is it realistic for your fitness level?</Label>
            <Input
              value={formData.goal_achievable}
              onChange={(e) => setFormData({ ...formData, goal_achievable: e.target.value })}
              placeholder="e.g., Yes, building from current fitness"
            />
          </div>

          <div>
            <Label>Realistic - Does it fit your lifestyle?</Label>
            <Input
              value={formData.goal_realistic}
              onChange={(e) => setFormData({ ...formData, goal_realistic: e.target.value })}
              placeholder="e.g., 4 training sessions per week"
            />
          </div>

          <div>
            <Label>Timely - When will you achieve this?</Label>
            <Input
              type="date"
              value={formData.goal_timely}
              onChange={(e) => setFormData({ ...formData, goal_timely: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="p-3 bg-slate-50 border rounded-lg text-xs text-slate-600">
        By submitting this form I consent to my trainer using this information to design and monitor my fitness program in accordance with NASM/ISSA professional standards.
      </div>
      <div className="flex justify-end gap-3">
        <Button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-emerald-500 to-teal-600">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Intake Form
        </Button>
      </div>
    </div>
  );
}