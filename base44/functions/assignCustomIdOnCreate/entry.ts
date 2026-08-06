import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { event } = body;
    
    if (!event || !event.entity_id || !event.entity_name) {
       return Response.json({ success: false, message: 'No event data' });
    }

    const recordId = event.entity_id;
    let record;
    try {
        record = await base44.asServiceRole.entities[event.entity_name].get(recordId);
    } catch(err) {
        return Response.json({ success: false, message: 'Record not found or error fetching' });
    }

    if (!record) {
       return Response.json({ success: false, message: 'No entity data found' });
    }
    
    if (event.entity_name === 'User') {
      if (record.data && record.data.custom_id) {
         return Response.json({ success: true, message: 'Already has custom_id' });
      }

      const role = record.role;
      const userType = record.data?.user_type;
      
      const isTrainer = userType === 'trainer' || role === 'trainer' || role === 'admin';
      const prefix = isTrainer ? 'TRAIN' : 'CLIEN';
      const custom_id = `${prefix}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      
      await base44.asServiceRole.entities.User.update(recordId, { custom_id });
      return Response.json({ success: true, custom_id });
    }
    
    if (event.entity_name === 'Client') {
      if (record.data && record.data.custom_id) {
         return Response.json({ success: true, message: 'Already has custom_id' });
      }
      const custom_id = `CLIEN-${String(Math.floor(1000 + Math.random() * 9000))}`;
      await base44.asServiceRole.entities.Client.update(recordId, { custom_id });
      
      // Update corresponding User record if it exists
      if (record.email) {
         const users = await base44.asServiceRole.entities.User.filter({ email: record.email });
         if (users.length > 0) {
            const userRecord = users[0];
            if (!userRecord.data || !userRecord.data.custom_id) {
               await base44.asServiceRole.entities.User.update(userRecord.id, { custom_id });
            }
         }
      }
      return Response.json({ success: true, custom_id });
    }
    
    return Response.json({ success: true, message: 'Skipped' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});