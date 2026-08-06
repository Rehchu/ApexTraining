import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (req.method !== 'POST') {
            return Response.json({ error: 'Method not allowed' }, { status: 405 });
        }
        
        const payload = await req.json();
        const { event, data } = payload;
        
        if (!event || !data) {
             return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // We care about create events for WorkoutPlan and MealPlan
        if (event.type === 'create') {
            const clientId = data.client_id;
            const planName = data.name || 'a new plan';
            let title = 'New Plan Assigned';
            let message = `You have been assigned: ${planName}`;
            let url = '/ClientDashboard';

            if (event.entity_name === 'WorkoutPlan') {
                title = 'New Workout Plan';
                url = '/ClientWorkouts';
            } else if (event.entity_name === 'MealPlan') {
                title = 'New Meal Plan';
                url = '/ClientMeals';
            } else if (event.entity_name === 'FitnessProgram') {
                 title = 'New Fitness Program';
                 url = '/ClientFitnessJourney';
                 message = `You have been assigned: a new program`; // FitnessProgram doesn't always have a name field
                 if (data.client_user_id) {
                     // FitnessProgram uses client_user_id
                     await base44.asServiceRole.functions.invoke('webPush', {
                        action: 'send',
                        targetUserId: data.client_user_id,
                        title,
                        message,
                        url,
                    });
                    return Response.json({ success: true });
                 }
            }
            
            // For WorkoutPlan and MealPlan, we need to find the user_id from the Client entity
            if (clientId) {
                // The client_id in WorkoutPlan/MealPlan might be the Client entity ID, or the user ID directly.
                // Let's try to fetch the client record.
                let targetUserId = clientId;
                try {
                    const clientRecord = await base44.asServiceRole.entities.Client.get(clientId);
                    if (clientRecord && clientRecord.user_id) {
                        targetUserId = clientRecord.user_id;
                    }
                } catch (e) {
                    // It might already be a user ID, or it doesn't exist
                }

                await base44.asServiceRole.functions.invoke('webPush', {
                    action: 'send',
                    targetUserId,
                    title,
                    message,
                    url,
                });
            }
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error("notifyOnNewPlan error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});