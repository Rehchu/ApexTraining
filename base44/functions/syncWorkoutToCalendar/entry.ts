import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workoutPlan, clientEmail, scheduledDate, startTime } = await req.json();

    if (!workoutPlan || !clientEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get access token for Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not authorized' }, { status: 403 });
    }

    // Create calendar event
    const [hours, minutes] = (startTime || '09:00').split(':').map(Number);
    const eventDate = new Date(scheduledDate || new Date());
    eventDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(eventDate);
    endDate.setHours(eventDate.getHours() + 1); // Default 1 hour duration

    const exerciseList = workoutPlan.exercises?.map(ex => 
      `${ex.name}: ${ex.sets}x${ex.reps}${ex.rest_seconds ? ` (${ex.rest_seconds}s rest)` : ''}`
    ).join('\n') || 'Workout session';

    const event = {
      summary: `💪 ${workoutPlan.name}`,
      description: `AI-Powered Workout\n\n${exerciseList}\n\n🎙️ Use voice commands to log your exercises and get real-time coaching feedback.`,
      start: {
        dateTime: eventDate.toISOString(),
        timeZone: 'America/Chicago'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Chicago'
      },
      attendees: [
        {
          email: clientEmail,
          responseStatus: 'accepted'
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'notification', minutes: 1440 }, // 1 day before
          { method: 'notification', minutes: 60 }    // 1 hour before
        ]
      },
      colorId: '1' // Blue color
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ 
        error: 'Failed to create calendar event', 
        details: data 
      }, { status: response.status });
    }

    return Response.json({ 
      success: true, 
      eventId: data.id,
      eventLink: data.htmlLink
    });
  } catch (error) {
    console.error('Error syncing to calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});