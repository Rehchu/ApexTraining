import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, transcript, exerciseName, currentExercise } = await req.json();

    // Extract workout data from voice transcript
    if (type === 'extractWorkoutData') {
      const prompt = `You are a fitness tracking assistant. Parse the user's voice command and extract structured workout data.
      
Exercise: ${exerciseName || 'General'}
Current Exercise Details: ${JSON.stringify(currentExercise || {})}

User said: "${transcript}"

Extract the following (if mentioned):
- reps: number of repetitions
- sets: number of sets
- weight: weight used (in kg)
- notes: any technique notes or comments
- completed: boolean if exercise is done

Return as JSON only, no other text.`;

      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            reps: { type: "number" },
            sets: { type: "number" },
            weight: { type: "number" },
            notes: { type: "string" },
            completed: { type: "boolean" }
          }
        }
      });

      return Response.json({ success: true, data: response });
    }

    // Get AI coaching feedback
    if (type === 'getCoachingFeedback') {
      const prompt = `You are an experienced personal trainer providing real-time voice coaching feedback. 
      
Exercise: ${exerciseName}
User's Input: "${transcript}"

Provide a brief, encouraging voice coaching response (1-2 sentences max). Include form tips if relevant.
Be conversational and motivating.`;

      const feedback = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
      return Response.json({ success: true, feedback });
    }

    // Analyze workout performance and suggest adjustments
    if (type === 'analyzePerformance') {
      const { workoutData, exerciseName: exName, clientProfile } = await req.json();
      
      const prompt = `You are an AI fitness coach analyzing workout performance and suggesting program adaptations.
      
Exercise: ${exName}
Client Profile: ${JSON.stringify({
        fitness_level: clientProfile?.fitness_level,
        activity_level: clientProfile?.activity_level,
        goals: clientProfile?.goals
      })}
Recent Performance Data: ${JSON.stringify(workoutData)}

Analyze the performance trend and suggest 2-3 SPECIFIC, ACTIONABLE adjustments to the workout program:
- If weight is increasing consistently, suggest increasing weight further or adding reps
- If performance plateaus, suggest varying rep ranges or adding different exercise variations
- If client is pushing hard, ensure adequate recovery suggestions
- Consider their fitness level and goals

Format as concrete modifications (e.g., "increase working weight from 50kg to 55kg", "add 2 extra reps per set", "reduce rest time to 45 seconds").`;

      const suggestion = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
      return Response.json({ success: true, suggestion });
    }

    // Get technique reminder for exercise
    if (type === 'getTechniqueReminder') {
      const { exerciseName, setNumber } = await req.json();
      
      const prompt = `You are an expert fitness trainer providing quick form cues for proper exercise technique.

Exercise: ${exerciseName}
Set: ${setNumber}

Provide ONE specific form/technique tip (1-2 sentences max) to help the user perform this exercise correctly.
Focus on the most critical aspect of proper form for this exercise.
Be encouraging and specific.`;

      const reminder = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
      return Response.json({ success: true, reminder });
    }

    return Response.json({ error: 'Invalid request type' }, { status: 400 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});