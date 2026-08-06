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

        // We care about create events for Session
        if (event.type === 'create' && event.entity_name === 'Session') {
            const clientId = data.client_id;
            const trainerId = data.trainer_id;
            const sessionDate = new Date(data.start_time).toLocaleString();

            let targetUserId = clientId;
            
            try {
                // The client_id in Session might be the Client entity ID. Let's try to fetch the client record.
                const clientRecord = await base44.asServiceRole.entities.Client.get(clientId);
                if (clientRecord && clientRecord.user_id) {
                    targetUserId = clientRecord.user_id;
                }
            } catch(e) {
                // If we can't find it, it might already be the user_id or something else
            }

            // Send to client
            if (targetUserId) {
                await base44.asServiceRole.functions.invoke('webPush', {
                    action: 'send',
                    targetUserId: targetUserId,
                    title: 'New Session Scheduled',
                    message: `You have a new session scheduled for ${sessionDate}`,
                    url: '/ClientSchedule',
                });
            }
            
            // Send to trainer
            if (trainerId) {
                 await base44.asServiceRole.functions.invoke('webPush', {
                    action: 'send',
                    targetUserId: trainerId,
                    title: 'New Session Scheduled',
                    message: `You have a new session scheduled for ${sessionDate}`,
                    url: '/Schedule',
                });
            }
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error("notifyOnNewSession error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});