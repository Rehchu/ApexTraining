import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // This can be triggered in the background, we might want to use asServiceRole if called via automation
        // but for now let's assume it's called by the client after saving an entry
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch un-summarized entries
        const entries = await base44.asServiceRole.entities.JournalEntry.filter({ 
            client_id: user.id, 
            trainer_summary: { $exists: false } 
        });

        if (entries.length === 0) {
             return Response.json({ success: true, processed: 0 });
        }

        for (const entry of entries) {
            const promptText = `
            Analyze this client journal entry:
            "${entry.content}"
            
            1. Provide a very brief 1-sentence summary for their personal trainer.
            2. Determine the overall sentiment (positive, neutral, negative, or mixed).
            `;

            try {
                const parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: promptText,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            summary: { type: "string" },
                            sentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] }
                        },
                        required: ["summary", "sentiment"]
                    }
                });
                
                await base44.asServiceRole.entities.JournalEntry.update(entry.id, {
                    trainer_summary: parsed.summary,
                    sentiment: parsed.sentiment.toLowerCase()
                });
            } catch (e) {
                console.error("Failed to summarize entry", entry.id, e);
            }
        }

        return Response.json({ success: true, processed: entries.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});