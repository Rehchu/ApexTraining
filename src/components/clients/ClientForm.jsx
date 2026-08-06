import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Mail, Phone, Calendar, Target, AlertCircle, Loader2, Ruler, Weight, Activity } from "lucide-react";

export default function ClientForm({ open, onOpenChange, client, onSubmit }) {
  const defaultFormData = {
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "male",
    status: "active",
    goals: "",
    medical_notes: "",
    emergency_contact: "",
    height_cm: "",
    weight_kg: "",
    body_fat_percentage: "",
    fitness_level: "intermediate",
    activity_level: "moderately_active",
    measurements: {
      chest: "",
      waist: "",
      hips: "",
      biceps_left: "",
      biceps_right: "",
      thigh_left: "",
      thigh_right: ""
    }
  };

  const [formData, setFormData] = useState(client || defaultFormData);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (open) {
      setFormData(client || defaultFormData);
    }
  }, [open, client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      
      // Convert numeric strings to numbers
      const dataToSubmit = {
        ...formData,
        trainer_id: user?.id,
        custom_id: client?.custom_id || `CLIEN-${String(Math.floor(1000 + Math.random() * 9000))}`,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
        body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : undefined,
        measurements: {
          ...formData.measurements,
          chest: formData.measurements.chest ? parseFloat(formData.measurements.chest) : undefined,
          waist: formData.measurements.waist ? parseFloat(formData.measurements.waist) : undefined,
          hips: formData.measurements.hips ? parseFloat(formData.measurements.hips) : undefined,
          biceps_left: formData.measurements.biceps_left ? parseFloat(formData.measurements.biceps_left) : undefined,
          biceps_right: formData.measurements.biceps_right ? parseFloat(formData.measurements.biceps_right) : undefined,
          thigh_left: formData.measurements.thigh_left ? parseFloat(formData.measurements.thigh_left) : undefined,
          thigh_right: formData.measurements.thigh_right ? parseFloat(formData.measurements.thigh_right) : undefined,
        }
      };
      
      // Remove empty string values
      Object.keys(dataToSubmit).forEach(key => {
        if (dataToSubmit[key] === "") dataToSubmit[key] = undefined;
      });
      
      await onSubmit(dataToSubmit);
      
      // Send invitation email if new client
      if (!client && formData.email) {
        await base44.users.inviteUser(formData.email, "user");
        
        try {
          const signupLink = `${window.location.origin}/app/ClientOnboarding`;
          await base44.functions.invoke('sendInviteEmail', {
            clientEmail: formData.email,
            clientName: formData.full_name,
            trainerName: user?.full_name || 'Your Trainer',
            signupLink
          });
        } catch (e) {
          console.error('Failed to send invite email:', e);
        }
        
        toast.success(`Client added and invitation sent to ${formData.email}`);
      }
      
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Failed to save client");
    } finally {
      setIsLoading(false);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="client-form-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <User className="w-5 h-5 text-foreground" />
            </div>
            {client ? "Edit Client" : "Add New Client"}
          </DialogTitle>
          <p id="client-form-description" className="text-sm text-slate-500">
            {client ? "Update client information" : "Add a new client to your roster"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  placeholder="John Doe"
                  className="pl-10"
                  value={formData.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+1 234 567 890"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="date_of_birth"
                  type="date"
                  className="pl-10"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange("date_of_birth", e.target.value)}
                />
              </div>
            </div>

            {/* Optional fields - filled during onboarding */}

            <div className="space-y-2">
              <Label>Gender</Label>
              <ResponsiveSelect 
                value={formData.gender} 
                onValueChange={(v) => handleChange("gender", v)}
                placeholder="Select gender"
                title="Select gender"
                options={[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                  { label: "Other", value: "other" }
                ]}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <ResponsiveSelect 
                value={formData.status} 
                onValueChange={(v) => handleChange("status", v)}
                placeholder="Select status"
                title="Select status"
                options={[
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                  { label: "Paused", value: "paused" }
                ]}
              />
            </div>
          </div>

          <p className="text-sm text-slate-500 italic">Additional information will be collected during client onboarding.</p>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {client ? "Update Client" : "Add Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}