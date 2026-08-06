import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all clients
    const clients = await base44.asServiceRole.entities.Client.list();
    
    // Create mapping of client entity ID to user_id
    const clientMap = {};
    clients.forEach(client => {
      if (client.user_id) {
        clientMap[client.id] = client.user_id;
      }
    });

    // Update workout plans
    const workoutPlans = await base44.asServiceRole.entities.WorkoutPlan.list();
    let updatedWorkouts = 0;
    
    for (const plan of workoutPlans) {
      if (plan.client_id && clientMap[plan.client_id]) {
        await base44.asServiceRole.entities.WorkoutPlan.update(plan.id, {
          client_id: clientMap[plan.client_id]
        });
        updatedWorkouts++;
      }
    }

    // Update meal plans
    const mealPlans = await base44.asServiceRole.entities.MealPlan.list();
    let updatedMeals = 0;
    
    for (const plan of mealPlans) {
      if (plan.client_id && clientMap[plan.client_id]) {
        await base44.asServiceRole.entities.MealPlan.update(plan.id, {
          client_id: clientMap[plan.client_id]
        });
        updatedMeals++;
      }
    }

    return Response.json({ 
      success: true,
      updatedWorkouts,
      updatedMeals,
      clientMap
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});