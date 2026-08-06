import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { key } = await req.json();

        if (!key) {
            return Response.json({ error: 'Beta key required' }, { status: 400 });
        }

        // Find the beta key (case insensitive search if possible, or normalize)
        // Assuming keys are stored uppercase
        const normalizedKey = key.toUpperCase();
        
        // Check if key exists and is unassigned
        // Note: Filtering by key might need exact match if database supports it, 
        // otherwise fetch and filter in memory if keys are few. 
        // Assuming list() returns all keys if filter not supported fully or use filter if supported.
        const keys = await base44.asServiceRole.entities.BetaKey.filter({ key: normalizedKey });
        
        if (!keys || keys.length === 0) {
            return Response.json({ error: 'Invalid beta key' }, { status: 404 });
        }

        const betaKeyRecord = keys[0];

        if (betaKeyRecord.status === 'assigned') {
            return Response.json({ error: 'Beta key already used' }, { status: 400 });
        }

        // Claim the key
        await base44.asServiceRole.entities.BetaKey.update(betaKeyRecord.id, {
            status: 'assigned',
            trainer_id: user.id,
            trainer_email: user.email
        });

        // Update user to trainer
        // We need to update user_type in data, and also role if possible (role might be restricted)
        // Let's update data.user_type = 'trainer'
        // Also update the role to 'trainer' if the system allows (admin/trainer roles usually controlled by platform)
        // The instructions say "role (default values are 'admin' and 'user', but you can freely change...)"
        
        // We will update the role to 'trainer' as well if possible, or just rely on user_type
        // The dashboard checks both.
        
        // Fetch current user data to merge
        const userData = user.data || {};
        
        await base44.asServiceRole.entities.User.update(user.id, {
            role: 'trainer',
            data: { ...userData, user_type: 'trainer', beta_key_used: true }
        });

        return Response.json({ success: true });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});