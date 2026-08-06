import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { email } = await req.json();

        if (email) {
            // Fix specific user
            const users = await base44.asServiceRole.entities.User.filter({ email });
            if (users.length === 0) {
                return Response.json({ error: 'User not found' }, { status: 404 });
            }

            const targetUser = users[0];
            const clientRecords = await base44.asServiceRole.entities.Client.filter({ email });
            const correctType = clientRecords.length > 0 ? 'client' : 'trainer';

            await base44.asServiceRole.entities.User.update(targetUser.id, {
                user_type: correctType
            });

            // Update Client record with user_id if needed
            if (correctType === 'client' && clientRecords[0].user_id !== targetUser.id) {
                await base44.asServiceRole.entities.Client.update(clientRecords[0].id, {
                    user_id: targetUser.id
                });
            }

            return Response.json({
                success: true,
                email,
                user_type: correctType,
                message: `Fixed user type to ${correctType}`
            });
        } else {
            // Fix all users
            const allUsers = await base44.asServiceRole.entities.User.list();
            const fixed = [];

            for (const u of allUsers) {
                const clientRecords = await base44.asServiceRole.entities.Client.filter({ email: u.email });
                const correctType = clientRecords.length > 0 ? 'client' : 'trainer';

                if (u.user_type !== correctType) {
                    await base44.asServiceRole.entities.User.update(u.id, {
                        user_type: correctType
                    });

                    // Update Client record with user_id if needed
                    if (correctType === 'client' && clientRecords[0].user_id !== u.id) {
                        await base44.asServiceRole.entities.Client.update(clientRecords[0].id, {
                            user_id: u.id
                        });
                    }

                    fixed.push({ email: u.email, new_type: correctType });
                }
            }

            return Response.json({
                success: true,
                fixed_count: fixed.length,
                fixed_users: fixed
            });
        }
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});