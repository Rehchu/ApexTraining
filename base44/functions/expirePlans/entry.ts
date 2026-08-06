import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This is a system scheduled task, but just to be safe we can use service role
        
        const activeWorkouts = await base44.asServiceRole.entities.WorkoutPlan.filter({ status: 'active' });
        const activeMeals = await base44.asServiceRole.entities.MealPlan.filter({ status: 'active' });
        
        const now = new Date();
        let updatedCount = 0;

        for (const plan of activeWorkouts) {
            if (plan.duration_weeks && plan.created_date) {
                const created = new Date(plan.created_date);
                const expiryDate = new Date(created.getTime() + plan.duration_weeks * 7 * 24 * 60 * 60 * 1000);
                if (now > expiryDate) {
                    await base44.asServiceRole.entities.WorkoutPlan.update(plan.id, { status: 'completed' });
                    updatedCount++;
                }
            }
        }

        for (const plan of activeMeals) {
            if (plan.duration_days && plan.created_date) {
                const created = new Date(plan.created_date);
                const expiryDate = new Date(created.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
                if (now > expiryDate) {
                    await base44.asServiceRole.entities.MealPlan.update(plan.id, { status: 'completed' });
                    updatedCount++;
                }
            }
        }

        return Response.json({ success: true, updatedCount });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});