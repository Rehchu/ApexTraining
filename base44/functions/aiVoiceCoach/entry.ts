import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Enhanced AI voice coaching
 * Provides real-time workout guidance, motivational cues, and performance feedback
 */

async function generateVoiceGuidance(base44, exerciseName, currentSet, totalSets, clientProfile) {
  const prompt = `You are an enthusiastic personal trainer providing real-time voice coaching during a workout.

Exercise: ${exerciseName}
Current: Set ${currentSet} of ${totalSets}
Client Level: ${clientProfile.fitness_level}

Generate SHORT (1-2 sentences max), motivational voice guidance that:
1. Matches their fitness level (beginner = more encouragement, advanced = more technical cues)
2. Provides ONE specific form cue
3. Builds momentum and confidence
4. Is NOT patronizing

Return as JSON:
{
  "motivation": "Short motivational phrase",
  "form_cue": "One specific thing to focus on",
  "encouragement": "How many sets left / you're doing great"
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        motivation: { type: 'string' },
        form_cue: { type: 'string' },
        encouragement: { type: 'string' }
      }
    }
  });

  return response;
}

async function generateWorkoutModification(base44, exerciseName, feedback, clientProfile) {
  const prompt = `You are a personal trainer modifying a workout in real-time based on client feedback.

Exercise: ${exerciseName}
Client Feedback: ${feedback}
Fitness Level: ${clientProfile.fitness_level}
Equipment: ${clientProfile.equipment_access}

The client is saying they're ${feedback}. Provide ONE alternative exercise or modification that:
1. Targets the same muscle group
2. Matches their equipment access
3. Is appropriate for their fitness level
4. Solves their problem (tired/pain/bored/too easy/too hard)

Return as JSON:
{
  "reason": "Why we're changing",
  "modification": "New exercise or adjustment",
  "cues": ["Setup tip", "Movement tip"],
  "when_to_switch_back": "When they're ready to progress"
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        modification: { type: 'string' },
        cues: { type: 'array', items: { type: 'string' } },
        when_to_switch_back: { type: 'string' }
      }
    }
  });

  return response;
}

async function generatePostWorkoutAnalysis(base44, workoutData, clientProfile) {
  const prompt = `You are a performance coach analyzing a completed workout.

Workout Summary:
- Total Time: ${workoutData.duration_minutes} minutes
- Exercises: ${workoutData.exercises_completed}
- Sets: ${workoutData.sets_completed}
- Difficulty Rating: ${workoutData.difficulty_rating}/10
- Energy Level: ${workoutData.energy_level}/10

Client Profile:
- Fitness Level: ${clientProfile.fitness_level}
- Goal: ${clientProfile.goals}

Provide personalized post-workout analysis:
1. Performance assessment
2. Recovery recommendations
3. What to eat/drink now
4. Tomorrow's readiness prediction
5. One thing they did great

Return as JSON:
{
  "performance": "How they performed",
  "recovery": "Immediate recovery steps",
  "nutrition": "Post-workout meal suggestion",
  "readiness_tomorrow": "prediction of recovery status",
  "highlight": "One excellent thing they did"
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        performance: { type: 'string' },
        recovery: { type: 'string' },
        nutrition: { type: 'string' },
        readiness_tomorrow: { type: 'string' },
        highlight: { type: 'string' }
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
    const { type, exerciseName, currentSet, totalSets, clientProfile, feedback, workoutData } = body;

    let result;

    switch (type) {
      case 'voiceGuidance':
        result = await generateVoiceGuidance(base44, exerciseName, currentSet, totalSets, clientProfile);
        break;
      case 'workoutModification':
        result = await generateWorkoutModification(base44, exerciseName, feedback, clientProfile);
        break;
      case 'postWorkoutAnalysis':
        result = await generatePostWorkoutAnalysis(base44, workoutData, clientProfile);
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