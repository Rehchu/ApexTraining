import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all clients
    const clients = await base44.asServiceRole.entities.Client.list(null, 1000);
    
    // Get all users
    const users = await base44.asServiceRole.entities.User.list(null, 1000);
    
    // Create email to user ID map
    const emailToUserId = new Map();
    users.forEach(u => {
      if (u.email) {
        emailToUserId.set(u.email.toLowerCase(), u.id);
      }
    });

    let updated = 0;
    let skipped = 0;

    // Update clients with matching user_id
    for (const client of clients) {
      if (!client.email) {
        skipped++;
        continue;
      }

      const userId = emailToUserId.get(client.email.toLowerCase());
      if (userId && !client.user_id) {
        await base44.asServiceRole.entities.Client.update(client.id, { user_id: userId });
        updated++;
      } else if (userId && client.user_id === userId) {
        skipped++;
      } else if (!userId) {
        skipped++;
      }
    }

    return Response.json({ 
      message: `Successfully assigned user IDs to ${updated} clients. ${skipped} clients skipped.`,
      updated,
      skipped,
      total: clients.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});