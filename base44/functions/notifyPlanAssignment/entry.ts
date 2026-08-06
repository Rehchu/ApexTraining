import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only handle create events for WorkoutPlan and MealPlan
    if (event.type !== 'create' || !data.client_id) {
      return Response.json({ success: true });
    }

    const isWorkoutPlan = event.entity_name === 'WorkoutPlan';
    const isMealPlan = event.entity_name === 'MealPlan';

    if (!isWorkoutPlan && !isMealPlan) {
      return Response.json({ success: true });
    }

    // Get client info
    const client = await base44.asServiceRole.entities.Client.get(data.client_id);
    
    // Get trainer info
    const trainer = await base44.asServiceRole.entities.User.get(data.trainer_id);

    const planType = isWorkoutPlan ? 'workout plan' : 'meal plan';
    
    // Send email to client (if they have email)
    if (client.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.email,
        from_name: "Apex Coach",
        subject: `New ${planType} assigned`,
        body: `Hi ${client.full_name},\n\n${trainer.full_name} has assigned you a new ${planType}: "${data.name}"\n\n${data.description || ''}\n\nLog in to your Apex Coach account to view your plan.\n\nBest regards,\nApex Coach`
      });
    }

    // Create in-app notification for trainer
    await base44.asServiceRole.entities.Notification.create({
      user_id: data.trainer_id,
      type: isWorkoutPlan ? 'workout_assigned' : 'meal_assigned',
      title: `${planType} assigned`,
      message: `"${data.name}" assigned to ${client.full_name}`,
      link: `/ClientProfile?id=${client.id}`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});