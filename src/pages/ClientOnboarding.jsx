import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { UNIT_SYSTEMS, getHeightUnit, getWeightUnit, convertHeight, convertWeight } from "../utils/unitConversion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Target,
  Activity,
  Heart,
  Calendar,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import confetti from "canvas-confetti";
import { AlertCircle } from "lucide-react";

// Beta keys are validated server-side at registration (see /api/auth/register).
// They must never be listed in client code — the bundle is public.

const STEPS = [
  { id: 1, title: "Welcome", icon: Sparkles },
  { id: 2, title: "About You", icon: Heart },
  { id: 3, title: "Fitness Background", icon: Activity },
  { id: 4, title: "Goals & Motivation", icon: Target },
  { id: 5, title: "Lifestyle & Availability", icon: Calendar },
];

export default function ClientOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [unitSystem, setUnitSystem] = useState(UNIT_SYSTEMS.METRIC);
  const [formData, setFormData] = useState({
    // Step 2: About You
    full_name: "",
    date_of_birth: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    emergency_contact: "",
    
    // Step 3: Fitness Background
    fitness_level: "beginner",
    activity_level: "sedentary",
    medical_notes: "",
    injuries: [],
    
    // Step 4: Goals & Motivation
    goals: "",
    primary_goal: "",
    target_weight_kg: "",
    motivation: "",
    
    // Step 5: Lifestyle
    workout_days_per_week: "3",
    preferred_workout_time: "morning",
    sleep_hours: "",
    stress_level: "moderate",
    dietary_preferences: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      setUnitSystem(userData?.unit_system || UNIT_SYSTEMS.METRIC);
      setFormData(prev => ({
        ...prev,
        full_name: userData.full_name || "",
      }));
    };
    loadUser();
  }, []);

  const createProfileMutation = useMutation({
    mutationFn: async (data) => {
      const existing = await base44.entities.Client.filter({ email: user.email });
      if (existing.length > 0) {
        return await base44.entities.Client.update(existing[0].id, data);
      }
      return await base44.entities.Client.create(data);
    },
    onSuccess: () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      setTimeout(() => {
        navigate(createPageUrl("ClientDashboard"));
      }, 2000);
    },
  });

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Get trainer info from user
    const client = await base44.entities.Client.filter({ email: user.email });
    const trainerId = client.length > 0 ? client[0].trainer_id : null;

    // Convert imperial to metric for storage
    let heightCm = formData.height_cm ? parseFloat(formData.height_cm) : null;
    let weightKg = formData.weight_kg ? parseFloat(formData.weight_kg) : null;

    if (unitSystem === UNIT_SYSTEMS.IMPERIAL) {
      heightCm = heightCm ? parseFloat(convertHeight(heightCm, 'inches', 'cm')) : null;
      weightKg = weightKg ? parseFloat(convertWeight(weightKg, 'lbs', 'kg')) : null;
    }

    const clientData = {
      full_name: formData.full_name,
      email: user.email,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      height_cm: heightCm,
      weight_kg: weightKg,
      emergency_contact: formData.emergency_contact || null,
      fitness_level: formData.fitness_level,
      activity_level: formData.activity_level,
      medical_notes: formData.medical_notes || null,
      goals: formData.goals || null,
      status: "active",
      trainer_id: trainerId,
      membership_start: new Date().toLocaleDateString('sv-SE'),
    };

    // Save user unit preference
    await base44.auth.updateMe({ unit_system: unitSystem });
    
    createProfileMutation.mutate(clientData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const progress = (currentStep / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 text-center py-8">
            {/* Unit System Toggle */}
            <div className="flex justify-center gap-2 mb-6">
              <Button
                variant={unitSystem === UNIT_SYSTEMS.METRIC ? "default" : "outline"}
                onClick={() => setUnitSystem(UNIT_SYSTEMS.METRIC)}
                className={unitSystem === UNIT_SYSTEMS.METRIC ? "bg-emerald-500" : ""}
              >
                Metric
              </Button>
              <Button
                variant={unitSystem === UNIT_SYSTEMS.IMPERIAL ? "default" : "outline"}
                onClick={() => setUnitSystem(UNIT_SYSTEMS.IMPERIAL)}
                className={unitSystem === UNIT_SYSTEMS.IMPERIAL ? "bg-emerald-500" : ""}
              >
                Imperial
              </Button>
            </div>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-foreground" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome to Your Fitness Journey!</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                We're excited to help you achieve your fitness goals! Let's start by getting to know you better.
                This should take about 5 minutes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="pt-6 text-center">
                  <Target className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-slate-900">Set Goals</h3>
                  <p className="text-sm text-slate-600 mt-1">Define what success looks like</p>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6 text-center">
                  <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-slate-900">Get Personal</h3>
                  <p className="text-sm text-slate-600 mt-1">Custom plans for your needs</p>
                </CardContent>
              </Card>
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="pt-6 text-center">
                  <Heart className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-slate-900">Stay Motivated</h3>
                  <p className="text-sm text-slate-600 mt-1">Track progress and celebrate wins</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Tell Us About Yourself</h2>
              <p className="text-slate-600">Basic information to personalize your experience</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup value={formData.gender} onValueChange={(value) => updateField('gender', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other">Other</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="height_cm">Height ({getHeightUnit(unitSystem)})</Label>
                <Input
                  id="height_cm"
                  type="number"
                  step="0.1"
                  value={formData.height_cm}
                  onChange={(e) => updateField('height_cm', e.target.value)}
                  placeholder={unitSystem === UNIT_SYSTEMS.METRIC ? "175" : "5'9"}
                />
                <p className="text-xs text-slate-500">{unitSystem === UNIT_SYSTEMS.METRIC ? "centimeters" : "inches"}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight_kg">Current Weight ({getWeightUnit(unitSystem)})</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={(e) => updateField('weight_kg', e.target.value)}
                  placeholder={unitSystem === UNIT_SYSTEMS.METRIC ? "70" : "154"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => updateField('emergency_contact', e.target.value)}
                  placeholder="Name and phone number"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Fitness Background</h2>
              <p className="text-slate-600">Help us understand your current fitness level</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Fitness Level *</Label>
                <RadioGroup value={formData.fitness_level} onValueChange={(value) => updateField('fitness_level', value)}>
                  <Card className={formData.fitness_level === 'beginner' ? 'border-emerald-500' : ''}>
                    <CardContent className="flex items-center space-x-3 pt-4">
                      <RadioGroupItem value="beginner" id="beginner" />
                      <div>
                        <Label htmlFor="beginner" className="font-medium cursor-pointer">Beginner</Label>
                        <p className="text-sm text-slate-500">New to fitness or returning after a break</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={formData.fitness_level === 'intermediate' ? 'border-emerald-500' : ''}>
                    <CardContent className="flex items-center space-x-3 pt-4">
                      <RadioGroupItem value="intermediate" id="intermediate" />
                      <div>
                        <Label htmlFor="intermediate" className="font-medium cursor-pointer">Intermediate</Label>
                        <p className="text-sm text-slate-500">Regular exercise routine, comfortable with basics</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={formData.fitness_level === 'advanced' ? 'border-emerald-500' : ''}>
                    <CardContent className="flex items-center space-x-3 pt-4">
                      <RadioGroupItem value="advanced" id="advanced" />
                      <div>
                        <Label htmlFor="advanced" className="font-medium cursor-pointer">Advanced</Label>
                        <p className="text-sm text-slate-500">Experienced athlete, ready for intense training</p>
                      </div>
                    </CardContent>
                  </Card>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Daily Activity Level *</Label>
                <RadioGroup value={formData.activity_level} onValueChange={(value) => updateField('activity_level', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sedentary" id="sedentary" />
                    <Label htmlFor="sedentary">Sedentary (desk job, little exercise)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lightly_active" id="lightly_active" />
                    <Label htmlFor="lightly_active">Lightly Active (exercise 1-3 days/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderately_active" id="moderately_active" />
                    <Label htmlFor="moderately_active">Moderately Active (exercise 3-5 days/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="very_active" id="very_active" />
                    <Label htmlFor="very_active">Very Active (exercise 6-7 days/week)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medical_notes">Medical Conditions or Injuries</Label>
                <Textarea
                  id="medical_notes"
                  value={formData.medical_notes}
                  onChange={(e) => updateField('medical_notes', e.target.value)}
                  placeholder="Any medical conditions, injuries, or limitations we should know about?"
                  rows={4}
                />
                <p className="text-xs text-slate-500">This helps us create safe, effective programs for you</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Goals & Motivation</h2>
              <p className="text-slate-600">What do you want to achieve?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Goal *</Label>
                <RadioGroup value={formData.primary_goal} onValueChange={(value) => updateField('primary_goal', value)}>
                  <Card className={formData.primary_goal === 'lose_weight' ? 'border-emerald-500' : ''}>
                    <CardContent className="flex items-center space-x-3 pt-4">
                      <RadioGroupItem value="lose_weight" id="lose_weight" />
                      <Label htmlFor="lose_weight" className="font-medium cursor-pointer">Lose Weight</Label>
                    </CardContent>
                  </Card>
                  <Card className={formData.primary_goal === 'build_muscle' ? 'border-emerald-500' : ''}>
                    <CardContent className="flex items-center space-x-3 pt-4">
                      <RadioGroupItem value="build_muscle" id="build_muscle" />
                      <Label htmlFor="build_muscle" className="font-medium cursor-pointer">Build Muscle</Label>
                    </CardContent>
                  </Card>
                  <Card className={formData.primary_goal === 'improve_fitness' ? 'border-emerald-500' : ''}>
                    <CardContent className="flex items-center space-x-3 pt-4">
                      <RadioGroupItem value="improve_fitness" id="improve_fitness" />
                      <Label htmlFor="improve_fitness" className="font-medium cursor-pointer">Improve Overall Fitness</Label>
                    </CardContent>
                  </Card>
                  <Card className={formData.primary_goal === 'athletic_performance' ? 'border-emerald-500' : ''}>
                    <CardContent className="flex items-center space-x-3 pt-4">
                      <RadioGroupItem value="athletic_performance" id="athletic_performance" />
                      <Label htmlFor="athletic_performance" className="font-medium cursor-pointer">Athletic Performance</Label>
                    </CardContent>
                  </Card>
                  <Card className={formData.primary_goal === 'health_wellness' ? 'border-emerald-500' : ''}>
                    <CardContent className="flex items-center space-x-3 pt-4">
                      <RadioGroupItem value="health_wellness" id="health_wellness" />
                      <Label htmlFor="health_wellness" className="font-medium cursor-pointer">Health & Wellness</Label>
                    </CardContent>
                  </Card>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Detailed Goals</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => updateField('goals', e.target.value)}
                  placeholder="Describe your specific goals in more detail..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_weight_kg">Target Weight (kg) - Optional</Label>
                <Input
                  id="target_weight_kg"
                  type="number"
                  step="0.1"
                  value={formData.target_weight_kg}
                  onChange={(e) => updateField('target_weight_kg', e.target.value)}
                  placeholder="65"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">What Motivates You?</Label>
                <Textarea
                  id="motivation"
                  value={formData.motivation}
                  onChange={(e) => updateField('motivation', e.target.value)}
                  placeholder="What drives you to reach your fitness goals? Why is this important to you?"
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Lifestyle & Availability</h2>
              <p className="text-slate-600">Help us fit fitness into your life</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>How many days per week can you work out?</Label>
                <RadioGroup value={formData.workout_days_per_week} onValueChange={(value) => updateField('workout_days_per_week', value)}>
                  <div className="grid grid-cols-4 gap-2">
                    {['2', '3', '4', '5', '6', '7'].map(days => (
                      <Card key={days} className={formData.workout_days_per_week === days ? 'border-emerald-500 bg-emerald-50' : ''}>
                        <CardContent className="pt-4 text-center">
                          <RadioGroupItem value={days} id={`days-${days}`} className="mx-auto mb-2" />
                          <Label htmlFor={`days-${days}`} className="font-medium cursor-pointer">{days} days</Label>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Preferred Workout Time</Label>
                <RadioGroup value={formData.preferred_workout_time} onValueChange={(value) => updateField('preferred_workout_time', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="morning" id="morning" />
                    <Label htmlFor="morning">Morning (before 12pm)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="afternoon" id="afternoon" />
                    <Label htmlFor="afternoon">Afternoon (12pm - 5pm)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="evening" id="evening" />
                    <Label htmlFor="evening">Evening (after 5pm)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flexible" id="flexible" />
                    <Label htmlFor="flexible">Flexible</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sleep_hours">Average Hours of Sleep per Night</Label>
                <Input
                  id="sleep_hours"
                  type="number"
                  step="0.5"
                  value={formData.sleep_hours}
                  onChange={(e) => updateField('sleep_hours', e.target.value)}
                  placeholder="7"
                />
              </div>

              <div className="space-y-2">
                <Label>Current Stress Level</Label>
                <RadioGroup value={formData.stress_level} onValueChange={(value) => updateField('stress_level', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low">Low - I feel calm and relaxed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderate" id="moderate" />
                    <Label htmlFor="moderate">Moderate - Some stress but manageable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high">High - Often feeling overwhelmed</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900">Getting Started</h1>
            <span className="text-sm text-slate-600">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isComplete = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all
                    ${isComplete ? 'bg-emerald-500 text-foreground' : 
                      isCurrent ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' : 
                      'bg-slate-200 text-muted-foreground'}
                  `}>
                    {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs ${isCurrent ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={createProfileMutation.isPending}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 gap-2"
          >
            {currentStep === STEPS.length ? (
              createProfileMutation.isPending ? 'Creating Profile...' : 'Complete Onboarding'
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}