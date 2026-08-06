import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { showSuccess } from "@/components/ui/success-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Loader2, Zap, Target, Activity, HeartPulse } from "lucide-react";
import { useUnitSystem } from "@/components/hooks/useUnitSystem";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (little or no exercise)" },
  { value: "lightly_active", label: "Lightly Active (1-3 days/week)" },
  { value: "moderately_active", label: "Moderately Active (3-5 days/week)" },
  { value: "very_active", label: "Very Active (6-7 days/week)" },
  { value: "extremely_active", label: "Extremely Active (physical job/training)" },
];

const DIETARY_PREFERENCES = [
  { value: "none", label: "No Preference / Omnivore" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "low_carb", label: "Low Carb" },
  { value: "gluten_free", label: "Gluten Free" },
];

const EQUIPMENT_ACCESS = [
  { value: "full_gym", label: "Full Commercial Gym" },
  { value: "home_gym", label: "Home Gym (Barbell, Rack, Plates)" },
  { value: "dumbbells_only", label: "Dumbbells/Kettlebells Only" },
  { value: "bodyweight", label: "Bodyweight Only" },
];

export default function TrainerClientOnboarding({ open, onOpenChange, client, onSubmit }) {
  const { system, convertWeightValue, parseWeight, convertHeightValue, parseHeight, weightUnit, heightUnit } = useUnitSystem();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic info
    full_name: "",
    email: "",
    phone: "",
    age: "",
    gender: "male",
    status: "active",
    // Physical metrics
    height_cm: "",
    weight_kg: "",
    body_fat_percentage: "",
    resting_heart_rate: "",
    blood_pressure: "",
    // Fitness
    fitness_level: "intermediate",
    activity_level: "moderately_active",
    equipment_access: "full_gym",
    // Goals and medical
    goals: "",
    medical_notes: "",
    injuries: "",
    emergency_contact: "",
    // Lifestyle
    dietary_preference: "none",
    sleep_hours: "",
    stress_level: "",
    // Measurements
    measurements: {
      chest: "",
      waist: "",
      hips: "",
      biceps_left: "",
      biceps_right: "",
      thigh_left: "",
      thigh_right: ""
    }
  });

  useEffect(() => {
    if (open && client) {
      setFormData({
        full_name: client.full_name || "",
        email: client.email || "",
        phone: client.phone || "",
        age: client.age || "",
        gender: client.gender || "male",
        status: client.status || "active",
        height_cm: convertHeightValue(client.height_cm) || "",
        weight_kg: convertWeightValue(client.weight_kg) || "",
        body_fat_percentage: client.body_fat_percentage || "",
        resting_heart_rate: client.resting_heart_rate || "",
        blood_pressure: client.blood_pressure || "",
        fitness_level: client.fitness_level || "intermediate",
        activity_level: client.activity_level || "moderately_active",
        equipment_access: client.equipment_access || "full_gym",
        goals: client.goals || "",
        medical_notes: client.medical_notes || "",
        injuries: client.injuries || "",
        emergency_contact: client.emergency_contact || "",
        dietary_preference: client.dietary_preference || "none",
        sleep_hours: client.sleep_hours || "",
        stress_level: client.stress_level || "",
        user_id: client.user_id || "",
        trainer_id: client.trainer_id || "",
        measurements: {
          chest: convertHeightValue(client.measurements?.chest) || "",
          waist: convertHeightValue(client.measurements?.waist) || "",
          hips: convertHeightValue(client.measurements?.hips) || "",
          biceps_left: convertHeightValue(client.measurements?.biceps_left) || "",
          biceps_right: convertHeightValue(client.measurements?.biceps_right) || "",
          thigh_left: convertHeightValue(client.measurements?.thigh_left) || "",
          thigh_right: convertHeightValue(client.measurements?.thigh_right) || ""
        }
      });
      setCurrentStep(0);
    } else if (open) {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        age: "",
        gender: "male",
        status: "active",
        height_cm: "",
        weight_kg: "",
        body_fat_percentage: "",
        resting_heart_rate: "",
        blood_pressure: "",
        fitness_level: "intermediate",
        activity_level: "moderately_active",
        equipment_access: "full_gym",
        goals: "",
        medical_notes: "",
        injuries: "",
        emergency_contact: "",
        dietary_preference: "none",
        sleep_hours: "",
        stress_level: "",
        measurements: {
          chest: "",
          waist: "",
          hips: "",
          biceps_left: "",
          biceps_right: "",
          thigh_left: "",
          thigh_right: ""
        }
      });
      setCurrentStep(0);
    }
  }, [open, client]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      
      let clientUserId = formData.user_id;
      
      // If creating new client, fetch their user ID after invitation
      if (!client && formData.email) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email: formData.email });
          if (users.length > 0) {
            clientUserId = users[0].id;
          }
        } catch (e) {
          console.log("Could not fetch user ID:", e);
        }
      }
      
      const dataToSubmit = {
        ...formData,
        trainer_id: user?.id,
        user_id: clientUserId,
        age: formData.age ? parseInt(formData.age) : undefined,
        height_cm: formData.height_cm ? parseHeight(formData.height_cm) : undefined,
        weight_kg: formData.weight_kg ? parseWeight(formData.weight_kg) : undefined,
        body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : undefined,
        resting_heart_rate: formData.resting_heart_rate ? parseInt(formData.resting_heart_rate) : undefined,
        sleep_hours: formData.sleep_hours ? parseFloat(formData.sleep_hours) : undefined,
        stress_level: formData.stress_level ? parseInt(formData.stress_level) : undefined,
        measurements: {
          ...formData.measurements,
          chest: formData.measurements.chest ? parseHeight(formData.measurements.chest) : undefined,
          waist: formData.measurements.waist ? parseHeight(formData.measurements.waist) : undefined,
          hips: formData.measurements.hips ? parseHeight(formData.measurements.hips) : undefined,
          biceps_left: formData.measurements.biceps_left ? parseHeight(formData.measurements.biceps_left) : undefined,
          biceps_right: formData.measurements.biceps_right ? parseHeight(formData.measurements.biceps_right) : undefined,
          thigh_left: formData.measurements.thigh_left ? parseHeight(formData.measurements.thigh_left) : undefined,
          thigh_right: formData.measurements.thigh_right ? parseHeight(formData.measurements.thigh_right) : undefined,
        }
      };
      
      Object.keys(dataToSubmit).forEach(key => {
        if (dataToSubmit[key] === "") dataToSubmit[key] = undefined;
      });
      
      await onSubmit(dataToSubmit);
      
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
        
        showSuccess("Client Onboarded!", `Invitation sent to ${formData.email}`);
      } else {
        showSuccess("Profile Saved", "Client profile updated successfully");
      }
      
      onOpenChange(false);
    } catch (error) {
      toast.error(error.message || "Failed to save client");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { label: "Basic Info", icon: User },
    { label: "Physical Metrics", icon: Zap },
    { label: "Fitness & Equipment", icon: Activity },
    { label: "Lifestyle & Nutrition", icon: HeartPulse },
    { label: "Goals & Medical", icon: Target },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-background border-border text-foreground" aria-describedby="onboarding-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-foreground font-bold tracking-wide">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4a017] to-[#f5c842] flex items-center justify-center">
              <User className="w-5 h-5 text-black" />
            </div>
            {client ? "EDIT CLIENT PROFILE" : "ONBOARD NEW CLIENT"}
          </DialogTitle>
          <DialogDescription id="onboarding-description" className="text-muted-foreground">
            {client ? "Update client information and metrics" : "Collect comprehensive client information during intake call"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-8 flex flex-wrap gap-2">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    currentStep === idx
                      ? "bg-gradient-to-r from-[#00ff9d] to-[#059669] text-black"
                      : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentStep === 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-semibold text-foreground tracking-wide border-b border-border pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-muted-foreground">Full Name *</Label>
                    <Input id="full_name" className="bg-card border-border text-foreground focus:border-[#00ff9d]" placeholder="John Doe" value={formData.full_name} onChange={(e) => handleChange("full_name", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-muted-foreground">Email *</Label>
                    <Input id="email" type="email" className="bg-card border-border text-foreground focus:border-[#00ff9d]" placeholder="john@example.com" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-muted-foreground">Phone</Label>
                    <Input id="phone" className="bg-card border-border text-foreground focus:border-[#00ff9d]" placeholder="+1 234 567 890" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-muted-foreground">Age</Label>
                    <Input id="age" type="number" min="1" max="120" className="bg-card border-border text-foreground focus:border-[#00ff9d]" placeholder="30" value={formData.age || ""} onChange={(e) => handleChange("age", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Gender</Label>
                    <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
                      <SelectTrigger className="bg-card border-border text-foreground focus:ring-[#00ff9d]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem className="focus:bg-secondary" value="male">Male</SelectItem>
                        <SelectItem className="focus:bg-secondary" value="female">Female</SelectItem>
                        <SelectItem className="focus:bg-secondary" value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                      <SelectTrigger className="bg-card border-border text-foreground focus:ring-[#00ff9d]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem className="focus:bg-secondary" value="active">Active</SelectItem>
                        <SelectItem className="focus:bg-secondary" value="inactive">Inactive</SelectItem>
                        <SelectItem className="focus:bg-secondary" value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-semibold text-foreground tracking-wide border-b border-border pb-2">Physical Metrics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="height_cm" className="text-muted-foreground">Height {system === 'imperial' ? '(ft & in)' : `(${heightUnit})`}</Label>
                    {system === 'imperial' ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input 
                            type="number" 
                            min="0" 
                            className="bg-card border-border text-foreground focus:border-[#d4a017] pr-8" 
                            placeholder="5" 
                            value={formData.height_cm !== "" && formData.height_cm !== undefined ? Math.floor(parseFloat(formData.height_cm || "0") / 12).toString() : ""} 
                            onChange={(e) => {
                              const ft = e.target.value ? parseFloat(e.target.value) : 0;
                              const currentIn = formData.height_cm ? parseFloat(formData.height_cm) % 12 : 0;
                              if (!e.target.value && !currentIn) {
                                handleChange("height_cm", "");
                              } else {
                                handleChange("height_cm", ((ft * 12) + currentIn).toString());
                              }
                            }} 
                          />
                          <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">ft</span>
                        </div>
                        <div className="relative flex-1">
                          <Input 
                            type="number" 
                            min="0" 
                            max="11" 
                            className="bg-card border-border text-foreground focus:border-[#d4a017] pr-8" 
                            placeholder="9" 
                            value={formData.height_cm !== "" && formData.height_cm !== undefined ? (parseFloat(formData.height_cm || "0") % 12).toString() : ""} 
                            onChange={(e) => {
                              const inches = e.target.value ? parseFloat(e.target.value) : 0;
                              const currentFt = formData.height_cm ? Math.floor(parseFloat(formData.height_cm) / 12) : 0;
                              if (!e.target.value && !currentFt) {
                                handleChange("height_cm", "");
                              } else {
                                handleChange("height_cm", ((currentFt * 12) + inches).toString());
                              }
                            }} 
                          />
                          <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">in</span>
                        </div>
                      </div>
                    ) : (
                      <Input id="height_cm" type="number" step="0.1" className="bg-card border-border text-foreground focus:border-[#d4a017]" placeholder="180" value={formData.height_cm} onChange={(e) => handleChange("height_cm", e.target.value)} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight_kg" className="text-muted-foreground">Weight ({weightUnit})</Label>
                    <Input id="weight_kg" type="number" step="0.1" className="bg-card border-border text-foreground focus:border-[#d4a017]" placeholder={system === 'imperial' ? "165" : "75"} value={formData.weight_kg} onChange={(e) => handleChange("weight_kg", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body_fat_percentage" className="text-muted-foreground">Body Fat %</Label>
                    <Input id="body_fat_percentage" type="number" step="0.1" className="bg-card border-border text-foreground focus:border-[#d4a017]" placeholder="15" value={formData.body_fat_percentage} onChange={(e) => handleChange("body_fat_percentage", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resting_heart_rate" className="text-muted-foreground">Resting Heart Rate (bpm)</Label>
                    <Input id="resting_heart_rate" type="number" className="bg-card border-border text-foreground focus:border-[#d4a017]" placeholder="60" value={formData.resting_heart_rate} onChange={(e) => handleChange("resting_heart_rate", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blood_pressure" className="text-muted-foreground">Blood Pressure</Label>
                    <Input id="blood_pressure" className="bg-card border-border text-foreground focus:border-[#d4a017]" placeholder="120/80" value={formData.blood_pressure} onChange={(e) => handleChange("blood_pressure", e.target.value)} />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-semibold text-foreground tracking-wide mb-4">Body Measurements ({heightUnit})</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { key: "chest", label: "Chest" },
                      { key: "waist", label: "Waist" },
                      { key: "hips", label: "Hips" },
                      { key: "biceps_left", label: "Biceps (L)" },
                      { key: "biceps_right", label: "Biceps (R)" },
                      { key: "thigh_left", label: "Thigh (L)" },
                      { key: "thigh_right", label: "Thigh (R)" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key} className="text-muted-foreground text-xs uppercase">{label}</Label>
                        <Input
                          id={key} type="number" step="0.1"
                          className="bg-card border-border text-foreground focus:border-[#d4a017] text-sm"
                          value={formData.measurements[key]}
                          onChange={(e) => handleMeasurementChange(key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-semibold text-foreground tracking-wide border-b border-border pb-2">Fitness & Equipment</h3>
                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Fitness Level</Label>
                    <Select value={formData.fitness_level} onValueChange={(v) => handleChange("fitness_level", v)}>
                      <SelectTrigger className="bg-card border-border text-foreground focus:ring-[#8b5cf6]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem className="focus:bg-secondary" value="beginner">Beginner</SelectItem>
                        <SelectItem className="focus:bg-secondary" value="intermediate">Intermediate</SelectItem>
                        <SelectItem className="focus:bg-secondary" value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Activity Level</Label>
                    <Select value={formData.activity_level} onValueChange={(v) => handleChange("activity_level", v)}>
                      <SelectTrigger className="bg-card border-border text-foreground focus:ring-[#8b5cf6]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {ACTIVITY_LEVELS.map(level => (
                          <SelectItem className="focus:bg-secondary" key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Equipment Access</Label>
                    <Select value={formData.equipment_access} onValueChange={(v) => handleChange("equipment_access", v)}>
                      <SelectTrigger className="bg-card border-border text-foreground focus:ring-[#8b5cf6]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {EQUIPMENT_ACCESS.map(level => (
                          <SelectItem className="focus:bg-secondary" key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-semibold text-foreground tracking-wide border-b border-border pb-2">Lifestyle & Nutrition</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-muted-foreground">Dietary Preferences</Label>
                    <Select value={formData.dietary_preference} onValueChange={(v) => handleChange("dietary_preference", v)}>
                      <SelectTrigger className="bg-card border-border text-foreground focus:ring-[#22c55e]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        {DIETARY_PREFERENCES.map(pref => (
                          <SelectItem className="focus:bg-secondary" key={pref.value} value={pref.value}>{pref.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sleep_hours" className="text-muted-foreground">Avg. Sleep (Hours/Night)</Label>
                    <Input id="sleep_hours" type="number" step="0.5" className="bg-card border-border text-foreground focus:border-border" placeholder="7.5" value={formData.sleep_hours} onChange={(e) => handleChange("sleep_hours", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Stress Level</Label>
                    <Select value={formData.stress_level?.toString() || ""} onValueChange={(v) => handleChange("stress_level", v)}>
                      <SelectTrigger className="bg-card border-border text-foreground focus:ring-[#22c55e]"><SelectValue placeholder="Select stress level" /></SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem className="focus:bg-secondary" value="2">Low</SelectItem>
                        <SelectItem className="focus:bg-secondary" value="5">Moderate</SelectItem>
                        <SelectItem className="focus:bg-secondary" value="8">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-semibold text-foreground tracking-wide border-b border-border pb-2">Goals & Medical History</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="goals" className="text-muted-foreground">Primary Fitness Goals</Label>
                    <Textarea id="goals" placeholder="E.g., Lose 10kg, Build muscle, Improve endurance..." className="min-h-24 bg-card border-border text-foreground focus:border-[#ef4444]" value={formData.goals} onChange={(e) => handleChange("goals", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="injuries" className="text-muted-foreground">Past or Current Injuries</Label>
                    <Textarea id="injuries" placeholder="Any joint pain, surgeries, or movement limitations..." className="min-h-16 bg-card border-border text-foreground focus:border-[#ef4444]" value={formData.injuries} onChange={(e) => handleChange("injuries", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medical_notes" className="text-muted-foreground">Other Medical Notes / Conditions</Label>
                    <Textarea id="medical_notes" placeholder="Medications, conditions, or anything else to note..." className="min-h-16 bg-card border-border text-foreground focus:border-[#ef4444]" value={formData.medical_notes} onChange={(e) => handleChange("medical_notes", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact" className="text-muted-foreground">Emergency Contact</Label>
                    <Input id="emergency_contact" placeholder="Name and phone number" className="bg-card border-border text-foreground focus:border-[#ef4444]" value={formData.emergency_contact} onChange={(e) => handleChange("emergency_contact", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6 border-t border-border gap-3">
              <Button type="button" variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:bg-accent" onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onOpenChange(false)}>
                {currentStep === 0 ? "Cancel" : "Back"}
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button type="button" className="bg-white text-black hover:bg-gray-200 font-medium border-none" onClick={() => setCurrentStep(currentStep + 1)}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" className="bg-gradient-to-r from-[#d4a017] to-[#f5c842] text-black hover:opacity-90 font-bold border-none" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {client ? "Save Profile" : "Complete Onboarding"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}