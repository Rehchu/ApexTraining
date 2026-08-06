import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { userId } = await req.json();

        if (!userId) {
            return Response.json({ error: 'userId is required' }, { status: 400 });
        }

        // Use service role to fetch user by ID
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        
        if (users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        return Response.json(users[0]);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});