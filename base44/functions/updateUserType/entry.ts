import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { email, user_type } = await req.json();

        if (!email || !user_type) {
            return Response.json({ error: 'Email and user_type required' }, { status: 400 });
        }

        // Get the user
        const users = await base44.asServiceRole.entities.User.filter({ email });
        
        if (!users || users.length === 0) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        const targetUser = users[0];
        
        // Update the user's data field - flatten nested data structure and remove old data
         const currentData = targetUser.data || {};
         const cleanData = { 
             ...currentData,
             user_type,
             data: undefined // Remove nested data object
         };

         // Remove undefined values
         Object.keys(cleanData).forEach(key => cleanData[key] === undefined && delete cleanData[key]);

         await base44.asServiceRole.entities.User.update(targetUser.id, {
             data: cleanData
         });

        return Response.json({ 
            success: true, 
            email,
            user_type,
            message: `Updated user type to ${user_type}`
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});