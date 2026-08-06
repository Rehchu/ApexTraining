import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, Check, Sparkles, Map, Target, Dumbbell, Utensils } from "lucide-react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

const walkthroughSteps = {
  client: [
    {
      title: "Welcome to Apex Coach!",
      description: "Your personalized fitness journey starts here. Let's take a quick tour of your new AI-powered training hub.",
      icon: <Sparkles className="w-12 h-12 text-yellow-500" />
    },
    {
      title: "Your Fitness Journey",
      description: "Track your progress on an interactive map. Earn XP, unlock new zones, and evolve your AI companion as you complete workouts and hit your goals.",
      icon: <Map className="w-12 h-12 text-green-500" />
    },
    {
      title: "Quests & Challenges",
      description: "Complete daily and weekly quests set by your trainer to earn rewards and stay motivated.",
      icon: <Target className="w-12 h-12 text-blue-500" />
    },
    {
      title: "Smart Workouts",
      description: "Access your custom training plans. Log your sets, reps, and let the AI adjust your progression automatically.",
      icon: <Dumbbell className="w-12 h-12 text-red-500" />
    },
    {
      title: "Adaptive Nutrition",
      description: "Get personalized meal suggestions, log your calories, and even generate recipes based on what's in your pantry.",
      icon: <Utensils className="w-12 h-12 text-orange-500" />
    }
  ],
  trainer: [
    {
      title: "Welcome to Apex Coach HQ",
      description: "Your command center for managing clients, crafting programs, and scaling your business with AI assistance.",
      icon: <Sparkles className="w-12 h-12 text-yellow-500" />
    },
    {
      title: "Client CRM",
      description: "Manage all your clients in one place. See their progress, engagement levels, and AI-generated risk assessments at a glance.",
      icon: <Target className="w-12 h-12 text-green-500" />
    },
    {
      title: "AI Co-Pilot",
      description: "Let AI help you draft messages, create personalized meal plans, and generate custom workout templates.",
      icon: <Map className="w-12 h-12 text-purple-500" />
    }
  ],
  admin: [
    {
      title: "Welcome Admin",
      description: "Manage the entire platform, oversee trainers and users, and monitor system health.",
      icon: <Target className="w-12 h-12 text-blue-500" />
    },
    {
      title: "System Overview",
      description: "View high-level analytics, handle bug reports, and manage contact messages across the app.",
      icon: <Sparkles className="w-12 h-12 text-yellow-500" />
    },
    {
      title: "Content Control",
      description: "Create narrative quests, manage broad resources, and customize the experience for all users.",
      icon: <Map className="w-12 h-12 text-green-500" />
    }
  ],
  independent: [
    {
      title: "Your Solo Journey",
      description: "Take control of your fitness. Build your own workout and meal plans, and track your progress independently.",
      icon: <Dumbbell className="w-12 h-12 text-red-500" />
    },
    {
      title: "AI Coaching",
      description: "Use our intelligent assistant to get workout ideas, analyze form, and plan meals without needing a human trainer.",
      icon: <Sparkles className="w-12 h-12 text-yellow-500" />
    },
    {
      title: "Gamified Progress",
      description: "Earn experience points, unlock achievements, and grow your virtual pet as you hit your personal milestones.",
      icon: <Target className="w-12 h-12 text-green-500" />
    }
  ]
};

export default function OnboardingWalkthrough() {
  const [currentStep, setCurrentStep] = useState(0);
  const [role, setRole] = useState("client");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        if (user.role === "admin") {
          setRole("admin");
        } else if (user.role === "trainer" || user.user_type === "trainer") {
          setRole("trainer");
        } else if (user.user_type === "independent") {
          setRole("independent");
        } else {
          setRole("client");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) return null;

  const steps = walkthroughSteps[role];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finish walkthrough
      let targetPage = "ClientDashboard";
      if (role === "admin" || role === "trainer") targetPage = "Dashboard";
      if (role === "independent") targetPage = "IndependentDashboard";
      window.location.href = createPageUrl(targetPage);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <Card className="w-full max-w-lg bg-card border-border shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-secondary">
          <motion.div 
            className="h-full bg-gradient-to-r from-yellow-500 to-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        <CardContent className="p-8 flex flex-col items-center text-center min-h-[400px] justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center w-full"
            >
              <div className="mb-8 p-6 rounded-full bg-secondary border border-border">
                {steps[currentStep].icon}
              </div>
              <h2 className="text-3xl font-black text-foreground mb-4 tracking-tight">
                {steps[currentStep].title}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex w-full justify-between items-center mt-12 gap-4">
            <Button 
              variant="outline" 
              onClick={handlePrev} 
              disabled={currentStep === 0}
              className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-all ${i === currentStep ? "bg-yellow-500 w-6" : "bg-border"}`} 
                />
              ))}
            </div>

            <Button 
              onClick={handleNext}
              className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold"
            >
              {currentStep === steps.length - 1 ? (
                <>Get Started <Check className="w-4 h-4 ml-2" /></>
              ) : (
                <>Next <ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}