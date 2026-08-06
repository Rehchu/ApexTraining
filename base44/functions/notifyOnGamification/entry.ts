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

        if (event.type === 'create') {
            const clientId = data.client_id;
            let title = '';
            let message = '';
            let url = '/ClientFitnessJourney';

            if (event.entity_name === 'Achievement') {
                title = 'New Achievement Unlocked! 🏆';
                message = `You earned: ${data.title}`;
            } else if (event.entity_name === 'LootDrop') {
                title = 'New Loot Drop Received! 🎁';
                message = data.contents?.message || 'Your trainer sent you a reward!';
            } else if (event.entity_name === 'Quest') {
                title = 'New Quest Assigned! ⚔️';
                message = `Quest: ${data.title}`;
            } else {
                return Response.json({ success: true });
            }

            if (clientId) {
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
        console.error("notifyOnGamification error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});