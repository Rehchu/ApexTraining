import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Get the client that was just created
    const clientId = body.event.entity_id;
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    
    if (!client || !client.email) {
      return Response.json({ success: true, message: 'No email found' });
    }
    
    // Find user with matching email
    const users = await base44.asServiceRole.entities.User.filter({ email: client.email });
    
    if (users.length > 0) {
      const userId = users[0].id;
      // Update client with the user_id
      await base44.asServiceRole.entities.Client.update(clientId, { user_id: userId });
      return Response.json({ success: true, message: `Assigned user_id ${userId}` });
    }
    
    return Response.json({ success: true, message: 'No matching user found' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});