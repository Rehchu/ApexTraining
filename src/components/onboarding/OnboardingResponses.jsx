import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Activity,
  Target,
  Calendar,
  Heart,
  Sparkles,
  CheckCircle2
} from "lucide-react";

export default function OnboardingResponses({ onboarding }) {
  if (!onboarding || !onboarding.questionnaire_responses) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          No onboarding data available
        </CardContent>
      </Card>
    );
  }

  const data = onboarding.questionnaire_responses;
  const assessment = onboarding.initial_assessment || {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Onboarding Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Status</span>
            <Badge className="bg-emerald-100 text-emerald-700">
              {onboarding.status}
            </Badge>
          </div>
          {onboarding.completed_date && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Completed</span>
              <span className="font-medium">
                {new Date(onboarding.completed_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-5 h-5 text-blue-600" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.date_of_birth && (
            <div>
              <span className="text-sm text-slate-500">Date of Birth:</span>
              <p className="font-medium">{new Date(data.date_of_birth).toLocaleDateString()}</p>
            </div>
          )}
          {data.gender && (
            <div>
              <span className="text-sm text-slate-500">Gender:</span>
              <p className="font-medium capitalize">{data.gender}</p>
            </div>
          )}
          {data.height_cm && (
            <div>
              <span className="text-sm text-slate-500">Height:</span>
              <p className="font-medium">{data.height_cm} cm</p>
            </div>
          )}
          {data.weight_kg && (
            <div>
              <span className="text-sm text-slate-500">Current Weight:</span>
              <p className="font-medium">{data.weight_kg} kg</p>
            </div>
          )}
          {data.emergency_contact && (
            <div>
              <span className="text-sm text-slate-500">Emergency Contact:</span>
              <p className="font-medium">{data.emergency_contact}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fitness Background */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-emerald-600" />
            Fitness Background
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.fitness_level && (
            <div>
              <span className="text-sm text-slate-500">Fitness Level:</span>
              <p className="font-medium capitalize">{data.fitness_level}</p>
            </div>
          )}
          {data.activity_level && (
            <div>
              <span className="text-sm text-slate-500">Activity Level:</span>
              <p className="font-medium capitalize">{data.activity_level.replace('_', ' ')}</p>
            </div>
          )}
          {data.medical_notes && (
            <div>
              <span className="text-sm text-slate-500">Medical Notes/Injuries:</span>
              <p className="font-medium text-slate-700">{data.medical_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals & Motivation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5 text-purple-600" />
            Goals & Motivation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.primary_goal && (
            <div>
              <span className="text-sm text-slate-500">Primary Goal:</span>
              <p className="font-medium capitalize">{data.primary_goal.replace('_', ' ')}</p>
            </div>
          )}
          {data.goals && (
            <div>
              <span className="text-sm text-slate-500">Detailed Goals:</span>
              <p className="font-medium text-slate-700">{data.goals}</p>
            </div>
          )}
          {data.target_weight_kg && (
            <div>
              <span className="text-sm text-slate-500">Target Weight:</span>
              <p className="font-medium">{data.target_weight_kg} kg</p>
            </div>
          )}
          {data.motivation && (
            <div>
              <span className="text-sm text-slate-500">Motivation:</span>
              <p className="font-medium text-slate-700">{data.motivation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lifestyle & Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 w-5 text-orange-600" />
            Lifestyle & Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.workout_days_per_week && (
            <div>
              <span className="text-sm text-slate-500">Workout Days Per Week:</span>
              <p className="font-medium">{data.workout_days_per_week} days</p>
            </div>
          )}
          {data.preferred_workout_time && (
            <div>
              <span className="text-sm text-slate-500">Preferred Workout Time:</span>
              <p className="font-medium capitalize">{data.preferred_workout_time}</p>
            </div>
          )}
          {data.sleep_hours && (
            <div>
              <span className="text-sm text-slate-500">Average Sleep:</span>
              <p className="font-medium">{data.sleep_hours} hours/night</p>
            </div>
          )}
          {data.stress_level && (
            <div>
              <span className="text-sm text-slate-500">Stress Level:</span>
              <p className="font-medium capitalize">{data.stress_level}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}