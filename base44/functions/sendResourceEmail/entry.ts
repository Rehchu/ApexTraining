import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resourceId, clientId } = await req.json();
    
    // Get Resource
    const resource = await base44.asServiceRole.entities.Resource.get(resourceId);
    if (!resource || resource.trainer_id !== user.id) {
        throw new Error('Resource not found or access denied');
    }

    // Get Client
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    if (!client || client.trainer_id !== user.id) {
        throw new Error('Client not found or access denied');
    }

    // 1. Send Email to Client
    const emailBody = `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #10b981;">New Document from ${user.full_name}</h2>
            <p>Hi ${client.full_name},</p>
            <p>Your trainer has sent you a document to review/fill out: <strong>${resource.title}</strong></p>
            
            <div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; white-space: pre-wrap;">
                ${resource.content}
            </div>
            
            ${resource.file_urls && resource.file_urls.length > 0 ? `
                <p><strong>Attachments:</strong></p>
                <ul>
                    ${resource.file_urls.map(url => `<li><a href="${url}" style="color: #10b981;">Download Attachment</a></li>`).join('')}
                </ul>
            ` : ''}

            <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
                You can print this email or copy the text to fill it out and return it to your trainer.
            </p>
        </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.email,
        subject: `Document from your trainer: ${resource.title}`,
        body: emailBody,
        from_name: user.full_name
    });

    // 2. Add In-App Message (if client has an app account)
    if (client.user_id) {
        const conversationId = [user.id, client.user_id].sort().join("-");
        
        let messageContent = `📋 Document Sent: **${resource.title}**\n\n`;
        messageContent += `I've sent a copy of this form to your email (${client.email}) for you to fill out/review.\n\n`;
        messageContent += `*Preview:*\n${resource.content}`;
        
        await base44.asServiceRole.entities.Message.create({
            conversation_id: conversationId,
            sender_id: user.id,
            sender_name: user.full_name,
            receiver_id: client.user_id,
            receiver_name: client.full_name,
            content: messageContent,
            timestamp: new Date().toISOString(),
            read: false
        });

        await base44.asServiceRole.entities.Notification.create({
            user_id: client.user_id,
            type: 'message',
            title: 'New document received',
            message: `${user.full_name} sent you: ${resource.title}`,
            link: '/Messages'
        });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});