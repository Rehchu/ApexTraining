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

        // We only care about create events for Messages
        if (event.type === 'create' && event.entity_name === 'Message') {
            const senderId = data.sender_id;
            const receiverId = data.receiver_id;
            const senderName = data.sender_name || 'Someone';

            // Send push notification to the receiver
            await base44.asServiceRole.functions.invoke('webPush', {
                action: 'send',
                targetUserId: receiverId,
                title: `New Message from ${senderName}`,
                message: data.content || 'You received a new message',
                url: '/Messages',
            });
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error("notifyOnNewMessage error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});