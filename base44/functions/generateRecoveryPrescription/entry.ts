import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let client_id, date;
        if (req.method === 'POST') {
            const body = await req.json();
            client_id = body.client_id;
            date = body.date;
        }

        if (!client_id || !date) {
            return Response.json({ error: "Missing client_id or date" }, { status: 400 });
        }

        // Fetch logs
        const sleepLogs = await base44.asServiceRole.entities.SleepLog.filter({ client_id, date });
        const stressLogs = await base44.asServiceRole.entities.StressLog.filter({ client_id, date });
        const recentWorkouts = await base44.asServiceRole.entities.WorkoutLog.filter({ client_id }, "-date", 3); // last 3 workouts

        let contextText = `Generate a personalized recovery prescription for a fitness client.\n\n`;
        
        if (sleepLogs.length > 0) {
            contextText += `Last night's sleep: ${sleepLogs[0].hours_slept} hours, Quality rating: ${sleepLogs[0].quality_rating}/5.\n`;
        }
        if (stressLogs.length > 0) {
            contextText += `Current stress level: ${stressLogs[0].stress_level}/10. Stressors: ${stressLogs[0].stressors || "None noted"}.\n`;
        }
        if (recentWorkouts.length > 0) {
            contextText += `Recent workouts included: ${recentWorkouts.map(w => w.total_volume_load ? "High Volume" : "Session logged").join(", ")}.\n`;
        }

        contextText += `\nBased on this readiness data, provide a 3-point recovery protocol (e.g., active recovery, meditation, hydration focus). Be encouraging and specific. Keep it under 100 words.`;

        const prescription = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: contextText });

        // Save this prescription (we can re-use JournalEntry or create a new entity, let's just return it for now or save as a Notification/Message)
        // For simplicity, we'll save it as a ClientNote or return it to be displayed.
        // Let's create a ClientNote as a "Recovery Prescription"
        await base44.asServiceRole.entities.ClientNote.create({
            client_id: client_id,
            trainer_id: "AI_SYSTEM",
            note: `Recovery Prescription for ${date}:\n${prescription}`,
            tags: ["AI", "Recovery"]
        });

        return Response.json({ success: true, prescription });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});