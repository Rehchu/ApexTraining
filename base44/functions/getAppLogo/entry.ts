import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Use service role to get the first admin's logo (bypassing RLS)
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, null, 1);
        
        const adminLogoUrl = admins?.[0]?.data?.business_logo_url || admins?.[0]?.business_logo_url || null;
        
        return Response.json({ logoUrl: adminLogoUrl });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});