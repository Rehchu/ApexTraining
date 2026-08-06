import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create' || event.entity_name !== 'Client') {
      return Response.json({ success: true, message: 'Ignored' });
    }

    if (!data.trainer_id) {
      return Response.json({ success: true, message: 'No trainer assigned' });
    }

    // Call the aiPersonalizedPlans function to auto-generate a workout
    const res = await base44.asServiceRole.functions.invoke('aiPersonalizedPlans', {
      type: 'generateWorkout',
      clientProfile: data,
      goals: { duration_weeks: 4, goals: data.goals || 'General Fitness' }
    });

    if (res.data?.data) {
      const planData = res.data.data;
      
      // Save it to the database
      await base44.asServiceRole.entities.WorkoutPlan.create({
        name: planData.name || 'Automated Startup Program',
        description: planData.description || 'This is your automated onboarding workout plan.',
        client_id: data.id,
        duration_weeks: planData.duration_weeks || 4,
        days_per_week: planData.days_per_week || 3,
        exercises: planData.exercises || [],
        status: 'active',
        trainer_id: data.trainer_id
      });
    }

    return Response.json({ success: true, message: 'Auto-assigned plan successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});