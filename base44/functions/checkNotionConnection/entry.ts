import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const connectorId = "6a0e1cf33504602a4eab84c9";
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);
    
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28'
      }
    });
    
    if (!response.ok) {
        return Response.json({ connected: false });
    }
    
    const data = await response.json();
    return Response.json({ connected: true, bot: data });
  } catch (error) {
    // Expected to fail if user is not connected
    return Response.json({ connected: false }, { status: 200 });
  }
});