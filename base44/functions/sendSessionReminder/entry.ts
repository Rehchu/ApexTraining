import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0];

    // Get all sessions for tomorrow
    const sessions = await base44.asServiceRole.entities.Session.filter({ 
      date: tomorrowDateString,
      status: 'scheduled'
    });

    const notifications = [];

    for (const session of sessions) {
      // Get trainer info
      const trainer = await base44.asServiceRole.entities.User.get(session.trainer_id);
      
      // Send email to trainer
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: trainer.email,
        from_name: "Apex Coach",
        subject: "Session Reminder for Tomorrow",
        body: `Hi ${trainer.full_name},\n\nThis is a reminder that you have a session scheduled for tomorrow (${tomorrowDateString}) at ${session.start_time} with ${session.client_name}.\n\nSession Type: ${session.type}\n\nBest regards,\nApex Coach`
      });

      // Create in-app notification
      notifications.push({
        user_id: session.trainer_id,
        type: 'session_reminder',
        title: 'Session Tomorrow',
        message: `${session.client_name} at ${session.start_time}`,
        link: '/Schedule'
      });
    }

    // Create all notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({ 
      success: true, 
      reminders_sent: sessions.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});