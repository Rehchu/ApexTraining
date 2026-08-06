import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Enhanced form analysis with detailed AI feedback
 * Analyzes exercise form from video/image and provides specific corrections
 */

async function analyzeExerciseForm(base44, exerciseName, fileUrl) {
  const prompt = `You are a certified personal trainer and biomechanics expert. Analyze the exercise form shown in this image/video.

Exercise: ${exerciseName}

Provide detailed feedback on:
1. **Posture & Alignment**: Check spine, shoulders, knees, ankles positioning
2. **Depth & Range of Motion**: Is the exercise being done with full ROM?
3. **Movement Quality**: Smooth motion or jerky? Controlled throughout?
4. **Safety Concerns**: Any red flags that could cause injury?
5. **Specific Corrections**: 2-3 actionable tips to improve form
6. **Progress Level**: Is their current form ready to increase weight?

Return detailed analysis as JSON:
{
  "overall_rating": "number 1-10",
  "posture_alignment": "Assessment",
  "range_of_motion": "Assessment",
  "movement_quality": "Assessment",
  "safety_concerns": ["concern 1", "concern 2"],
  "corrections": [
    {
      "issue": "What to fix",
      "solution": "How to fix it",
      "why": "Why this matters"
    }
  ],
  "ready_for_progression": true/false,
  "progression_recommendation": "Next step if ready"
}`;

  const response = await base44.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [fileUrl],
    response_json_schema: {
      type: 'object',
      properties: {
        overall_rating: { type: 'number' },
        posture_alignment: { type: 'string' },
        range_of_motion: { type: 'string' },
        movement_quality: { type: 'string' },
        safety_concerns: { type: 'array', items: { type: 'string' } },
        corrections: { type: 'array' },
        ready_for_progression: { type: 'boolean' },
        progression_recommendation: { type: 'string' }
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
    const { exerciseName, fileUrl } = body;

    if (!exerciseName || !fileUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const analysis = await analyzeExerciseForm(base44, exerciseName, fileUrl);

    // Store the analysis
    await base44.entities.FormCheck.update(body.formCheckId, {
      ai_analysis: JSON.stringify(analysis),
      analysis_date: new Date().toISOString()
    });

    return Response.json({ success: true, analysis });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});