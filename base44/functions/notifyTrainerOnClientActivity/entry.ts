import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (req.method !== 'POST') {
            return Response.json({ error: 'Method not allowed' }, { status: 405 });
        }
        
        const payload = await req.json();
        const { event, data, old_data } = payload;
        
        if (!event || !data) {
             return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }

        let trainerId = data.trainer_id;
        let title = '';
        let message = '';
        let url = '/Clients'; // default fallback

        // Helper to fetch client name
        const getClientName = async (clientId) => {
            if (!clientId) return 'A client';
            try {
                const clientRecord = await base44.asServiceRole.entities.Client.get(clientId);
                return clientRecord?.full_name || 'A client';
            } catch (e) {
                return 'A client';
            }
        };

        if (event.type === 'create' && event.entity_name === 'WorkoutLog') {
            if (!trainerId) {
                // Try to find trainer from client
                try {
                    const client = await base44.asServiceRole.entities.Client.get(data.client_id);
                    trainerId = client?.trainer_id;
                } catch(e) {}
            }
            if (!trainerId) return Response.json({ success: true, reason: 'No trainer_id found' });
            
            const clientName = await getClientName(data.client_id);
            title = 'Workout Completed! 💪';
            message = `${clientName} just completed a workout.`;
            url = '/Clients'; // Or /Progress
            
        } else if (event.type === 'create' && event.entity_name === 'ProgressLog') {
            if (!trainerId) {
                try {
                    const client = await base44.asServiceRole.entities.Client.get(data.client_id);
                    trainerId = client?.trainer_id;
                } catch(e) {}
            }
            if (!trainerId) return Response.json({ success: true, reason: 'No trainer_id found' });
            
            const clientName = await getClientName(data.client_id);
            title = 'New Progress Logged 📈';
            message = `${clientName} has updated their progress.`;
            url = '/Clients';

        } else if (event.type === 'create' && event.entity_name === 'Client') {
            trainerId = data.trainer_id;
            if (!trainerId) return Response.json({ success: true, reason: 'No trainer_id found' });
            
            title = 'New Client Signup! 🎉';
            message = `${data.full_name} has joined as your client.`;
            url = '/Clients';

        } else if (event.type === 'update' && event.entity_name === 'Contract') {
            if (old_data?.status !== 'signed' && data.status === 'signed') {
                trainerId = data.trainer_id;
                if (!trainerId) return Response.json({ success: true, reason: 'No trainer_id found' });
                
                const clientName = data.client_name || await getClientName(data.client_id);
                title = 'Contract Signed 📝';
                message = `${clientName} has signed their contract.`;
                url = '/Contracts';
            } else {
                // Not a signing event
                return Response.json({ success: true });
            }
        } else if (event.type === 'create' && event.entity_name === 'Lead') {
            trainerId = data.trainer_id;
            if (!trainerId) return Response.json({ success: true, reason: 'No trainer_id found' });
            
            title = 'New Lead! 🎯';
            message = `${data.full_name} has requested more information.`;
            url = '/CRM';

        } else if (event.type === 'create' && event.entity_name === 'Payment') {
            trainerId = data.trainer_id;
            if (!trainerId) return Response.json({ success: true, reason: 'No trainer_id found' });
            
            const clientName = data.client_name || await getClientName(data.client_id);
            title = 'Payment Received 💰';
            message = `You received $${data.amount} from ${clientName}.`;
            url = '/Invoices';

        } else {
            return Response.json({ success: true });
        }

        if (trainerId) {
            await base44.asServiceRole.functions.invoke('webPush', {
                action: 'send',
                targetUserId: trainerId,
                title,
                message,
                url,
            });
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error("notifyTrainerOnClientActivity error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});