import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all packages using user's auth (respects RLS: is_active=true or created_by user)
    const allPackages = await base44.entities.Package.list();
    const activePackages = allPackages.filter(pkg => pkg.is_active === true);
    
    return Response.json({ packages: activePackages });
  } catch (error) {
    console.error('Failed to fetch packages:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});