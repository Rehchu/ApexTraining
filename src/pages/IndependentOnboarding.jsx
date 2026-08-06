import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2, Flame, Sparkles, Star, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";



export default function IndependentOnboarding() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0); // 0: loading auth, 1: form, 2: creating AI plan
  const [user, setUser] = useState(null);
  
  const [formData, setFormData] = useState({
    age: '',
    gender: 'male',
    weight_kg: '',
    height_cm: '',
    goals: '',
    equipment: 'full_gym',
    activity_level: 'moderately_active'
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const u = await base44.auth.me();
        if (!u) {
          base44.auth.redirectToLogin(window.location.origin + createPageUrl("IndependentOnboarding"));
          return;
        }

        const existingClients = await base44.entities.Client.filter({ email: u.email });
        if (existingClients.length > 0) {
          navigate(createPageUrl("IndependentDashboard"));
          return;
        }
        
        setUser(u);
        setStep(1);
      } catch (err) {
        console.error("Auth check failed", err);
        setError("Authentication failed.");
      }
    };
    initAuth();
  }, [navigate]);

  const handleComplete = async () => {
    setStep(2); // creating AI plan
    try {
      if (!user.user_type) {
        await base44.auth.updateMe({ user_type: 'independent' });
      }

      const client = await base44.entities.Client.create({
        full_name: user.full_name || user.email.split('@')[0],
        email: user.email,
        user_id: user.id,
        trainer_id: null,
        status: 'active',
        age: Number(formData.age),
        gender: formData.gender,
        weight_kg: Number(formData.weight_kg),
        height_cm: Number(formData.height_cm),
        goals: formData.goals,
        equipment_access: formData.equipment,
        activity_level: formData.activity_level,
        
      });

      const prompt = `Create a 4-week workout plan and a 1-day meal plan for a ${formData.age} year old ${formData.gender}, weighing ${formData.weight_kg}kg, height ${formData.height_cm}cm.
Activity level: ${formData.activity_level}. Equipment: ${formData.equipment}. Goal: ${formData.goals}.
Output JSON exactly matching these properties:
{
  "workout_plan": {
    "name": "string",
    "description": "string",
    "duration_weeks": 4,
    "days_per_week": 4,
    "difficulty": "intermediate",
    "exercises": [ { "day": 1, "name": "string", "sets": 3, "reps": "10", "rest_seconds": 60, "notes": "string" } ]
  },
  "meal_plan": {
    "name": "string",
    "description": "string",
    "calories_target": 2000,
    "protein_target_g": 150,
    "carbs_target_g": 200,
    "fat_target_g": 60,
    "meals": [ { "day": 1, "meal_type": "breakfast", "name": "string", "instructions": "string" } ]
  }
}`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            workout_plan: { type: "object", additionalProperties: true },
            meal_plan: { type: "object", additionalProperties: true }
          }
        }
      });

      if (res && res.workout_plan) {
        await base44.entities.WorkoutPlan.create({
          ...res.workout_plan,
          client_id: client.id,
          status: 'active'
        });
      }

      if (res && res.meal_plan) {
        await base44.entities.MealPlan.create({
          ...res.meal_plan,
          client_id: client.id,
          duration_days: 7,
          status: 'active'
        });
      }

      navigate(createPageUrl("IndependentDashboard"));
    } catch (err) {
      console.error("Failed to create profile", err);
      setError("Failed to setup your account. Please try again.");
      setStep(1);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={() => navigate(createPageUrl("Home"))}
          className="px-6 py-2 bg-secondary text-foreground rounded-lg hover:bg-accent"
        >
          Return Home
        </button>
      </div>
    );
  }

  if (step === 0 || step === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #00E676, #008f49)' }}>
          <Flame className="w-10 h-10 text-[#0A0A0A] animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-foreground mb-2 tracking-wide drop-">
          {step === 0 ? "AUTHENTICATING" : "AI IS CRAFTING YOUR PLAN..."}
        </h2>
        {step === 2 && <p className="text-primary mt-4 animate-pulse">Analyzing your goals and setting up your journey</p>}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 md:p-12 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-4 mb-8">
            <p className="text-primary font-bold tracking-wide text-sm drop-">STEP 1 OF 1</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Tell us about yourself</h1>
            <p className="text-muted-foreground">Our AI will use this data to generate your personalized program.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Age</label>
              <input type="number" className="w-full bg-card border border-border rounded-xl p-3 text-foreground" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Gender</label>
              <select className="w-full bg-card border border-border rounded-xl p-3 text-foreground" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Weight (kg)</label>
              <input type="number" className="w-full bg-card border border-border rounded-xl p-3 text-foreground" value={formData.weight_kg} onChange={e => setFormData({...formData, weight_kg: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Height (cm)</label>
              <input type="number" className="w-full bg-card border border-border rounded-xl p-3 text-foreground" value={formData.height_cm} onChange={e => setFormData({...formData, height_cm: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Activity Level</label>
              <select className="w-full bg-card border border-border rounded-xl p-3 text-foreground" value={formData.activity_level} onChange={e => setFormData({...formData, activity_level: e.target.value})}>
                <option value="sedentary">Sedentary</option>
                <option value="lightly_active">Lightly Active</option>
                <option value="moderately_active">Moderately Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Equipment Access</label>
              <select className="w-full bg-card border border-border rounded-xl p-3 text-foreground" value={formData.equipment} onChange={e => setFormData({...formData, equipment: e.target.value})}>
                <option value="full_gym">Full Gym</option>
                <option value="home_gym">Home Gym</option>
                <option value="dumbbells_only">Dumbbells Only</option>
                <option value="bodyweight">Bodyweight Only</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-muted-foreground">Primary Goal</label>
              <textarea className="w-full bg-card border border-border rounded-xl p-3 text-foreground h-24" placeholder="e.g. Lose 10 lbs, build muscle, prepare for a marathon..." value={formData.goals} onChange={e => setFormData({...formData, goals: e.target.value})}></textarea>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button 
              onClick={() => {
                if (!formData.age || !formData.weight_kg || !formData.height_cm || !formData.goals) {
                  alert('Please fill in all required fields');
                  return;
                }
                handleComplete();
              }}
              className="group flex items-center gap-2 px-8 py-3 bg-[#00E676] text-black font-bold rounded-xl hover:bg-primary/90 transition-all hover:"
            >
              GENERATE PLAN <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}