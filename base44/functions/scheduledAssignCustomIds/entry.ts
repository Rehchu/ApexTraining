import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all users
    const users = await base44.asServiceRole.entities.User.filter({});
    
    let assigned = 0;
    for (const u of users) {
      if (!u.data?.custom_id) {
        const isTrainer = u.data?.user_type === 'trainer' || u.role === 'trainer' || u.role === 'admin';
        const prefix = isTrainer ? 'TRAIN' : 'CLIEN';
        const custom_id = `${prefix}-${String(Math.floor(1000 + Math.random() * 9000))}`;
        
        await base44.asServiceRole.entities.User.update(u.id, { custom_id });
        assigned++;
      }
    }
    
    return Response.json({ success: true, message: `Assigned custom IDs to ${assigned} users` });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});