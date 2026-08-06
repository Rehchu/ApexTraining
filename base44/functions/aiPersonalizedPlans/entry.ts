import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * AI-powered personalized workout and meal plan generation
 * Replaces static templates with dynamic, user-specific plans
 */

async function generateWorkoutPlan(base44, clientProfile, goals) {
  const prompt = `You are a certified personal trainer (NASM/ISSA). Generate a safe, evidence-based ${goals?.duration_weeks || 4}-week workout plan for a client with these characteristics. Follow progressive overload principles and stay within personal trainer scope of practice (do not prescribe exercise for medical conditions):

Profile:
- Age: ${clientProfile.age}
- Fitness Level: ${clientProfile.fitness_level || 'intermediate'}
- Equipment Access: ${clientProfile.equipment_access || 'full_gym'}
- Goals: ${goals?.goals || 'General fitness'}
- Activity Level: ${clientProfile.activity_level || 'moderately_active'}
- Injuries/Restrictions: ${clientProfile.injuries || 'None'}

Create a structured 4-day/week program that:
1. Progressively increases intensity
2. Includes proper warm-up and cool-down
3. Balances all muscle groups
4. Accounts for their fitness level and equipment
5. Includes rest days and recovery

Return as JSON with structure:
{
  "name": "Personalized ${clientProfile.fitness_level} Program",
  "description": "Brief description",
  "duration_weeks": 4,
  "days_per_week": 4,
  "exercises": [
    {
      "day": 1,
      "name": "Exercise Name",
      "sets": 3,
      "reps": "8-10",
      "rest_seconds": 90,
      "notes": "Form tips"
    }
  ],
  "progression_strategy": "How to progress each week"
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        duration_weeks: { type: 'number' },
        days_per_week: { type: 'number' },
        exercises: { type: 'array' },
        progression_strategy: { type: 'string' }
      }
    }
  });

  return response;
}

async function generateMealPlan(base44, clientProfile, nutritionGoals) {
  const prompt = `You are a certified personal trainer providing general healthy eating guidance within your scope of practice (not medical or clinical nutrition advice). Create a personalized 7-day meal plan for a client:

Profile:
- Goal: ${nutritionGoals?.goal || 'maintenance'} (weight_loss/muscle_gain/maintenance)
- Daily Calorie Target: ${nutritionGoals?.calories_target || 2000}
- Dietary Preference: ${clientProfile.dietary_preference || 'none'}
- Allergies/Restrictions: ${clientProfile.medical_notes || 'None'}
- Protein Target: ${nutritionGoals?.protein_target_g || 150}g
- Carbs Target: ${nutritionGoals?.carbs_target_g || 200}g
- Fat Target: ${nutritionGoals?.fat_target_g || 65}g

Create a practical 7-day plan with:
1. Realistic meals they can actually prepare
2. Balanced macros for their goals
3. Variety to prevent boredom
4. Shopping list friendly

Return as JSON:
{
  "name": "Custom ${nutritionGoals?.goal} Plan",
  "meals": [
    {
      "day": 1,
      "meal_type": "breakfast|lunch|dinner|snack",
      "name": "Meal Name",
      "foods": [
        {
          "name": "Food item",
          "amount": 100,
          "unit": "g",
          "calories": 150,
          "protein": 20,
          "carbs": 10,
          "fat": 5
        }
      ],
      "instructions": "Prep instructions"
    }
  ],
  "shopping_tips": "Smart shopping strategies"
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        meals: { type: 'array' },
        shopping_tips: { type: 'string' }
      }
    }
  });

  return response;
}

async function generateRecoveryPrescription(base44, clientProfile, workoutLogs) {
  const recentWorkouts = workoutLogs.slice(-3);
  const avgIntensity = recentWorkouts.reduce((sum, log) => sum + (log.difficulty_rating || 5), 0) / recentWorkouts.length;

  const prompt = `You are a sports recovery specialist. Generate a personalized recovery protocol for a client:

Fitness Profile:
- Fitness Level: ${clientProfile.fitness_level}
- Sleep Average: ${clientProfile.sleep_hours || 7} hours
- Stress Level: ${clientProfile.stress_level || 5}/10
- Resting Heart Rate: ${clientProfile.resting_heart_rate || 'unknown'} bpm

Recent Workout Data:
- Last 3 sessions average intensity: ${avgIntensity.toFixed(1)}/10
- Training frequency: ${workoutLogs.length} workouts tracked

Create a recovery prescription including:
1. Sleep optimization strategies
2. Nutrition timing and nutrients
3. Stretching/mobility routine (5-10 minutes)
4. Active recovery days
5. Stress management techniques
6. When to take deload weeks

Return as JSON:
{
  "sleep_optimization": "Specific recommendations",
  "nutrition_timing": "Meal timing and what to eat",
  "mobility_routine": [
    {
      "exercise": "Name",
      "duration_minutes": 5,
      "description": "How to do it",
      "frequency": "Daily|2-3x/week"
    }
  ],
  "active_recovery_days": "Which days and what to do",
  "stress_management": "Techniques to reduce stress",
  "deload_schedule": "When to take it easy",
  "expected_outcomes": "What they'll notice"
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        sleep_optimization: { type: 'string' },
        nutrition_timing: { type: 'string' },
        mobility_routine: { type: 'array' },
        active_recovery_days: { type: 'string' },
        stress_management: { type: 'string' },
        deload_schedule: { type: 'string' },
        expected_outcomes: { type: 'string' }
      }
    }
  });

  return response;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { type, clientId, clientProfile, goals, nutritionGoals, workoutLogs } = body;

    let result;

    switch (type) {
      case 'generateWorkout':
        result = await generateWorkoutPlan(base44, clientProfile, goals);
        break;
      case 'generateMealPlan':
        result = await generateMealPlan(base44, clientProfile, nutritionGoals);
        break;
      case 'generateRecovery':
        result = await generateRecoveryPrescription(base44, clientProfile, workoutLogs);
        break;
      default:
        return Response.json({ error: 'Invalid type' }, { status: 400 });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});