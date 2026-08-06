import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const emailsToFix = [
            'ckerik2001@gmail.com',
            'rehchu@outlook.com',
            '4qxpsm7j2q@privaterelay.appleid.com',
            'lilcharlie06@yahoo.com'
        ];

        const results = [];

        for (const email of emailsToFix) {
            const users = await base44.asServiceRole.entities.User.filter({ email });
            if (!users || users.length === 0) {
                results.push({ email, status: 'not found' });
                continue;
            }

            const u = users[0];
            // Fix the nested data object — set user_type to 'independent' at ALL levels
            const newData = {
                ...(u.data || {}),
                user_type: 'independent',
                role: 'user',
                data: {
                    ...((u.data?.data) || {}),
                    user_type: 'independent'
                }
            };

            await base44.asServiceRole.entities.User.update(u.id, {
                user_type: 'independent',
                data: newData
            });

            results.push({ email, id: u.id, status: 'fixed' });
        }

        return Response.json({ success: true, results });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});