import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get all clients without user_id
    const clients = await base44.asServiceRole.entities.Client.list();
    const clientsWithoutUserId = clients.filter(c => !c.user_id);
    
    // Get all users
    const users = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    users.forEach(u => {
      userMap[u.email] = u.id;
    });
    
    // Assign user IDs
    let assigned = 0;
    let skipped = 0;
    
    for (const client of clientsWithoutUserId) {
      if (client.email && userMap[client.email]) {
        await base44.asServiceRole.entities.Client.update(client.id, {
          user_id: userMap[client.email]
        });
        assigned++;
      } else {
        skipped++;
      }
    }
    
    return Response.json({ 
      success: true, 
      assigned, 
      skipped,
      message: `Assigned ${assigned} clients, skipped ${skipped}`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});