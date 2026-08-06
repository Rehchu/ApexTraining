import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const promptText = `Generate a single, thought-provoking journaling prompt for a fitness client. The prompt should encourage them to reflect on their mindset, progress, struggles, or goals. Make it inspiring and concise.`;

        const responseText = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: promptText });

        return Response.json({ prompt: responseText.trim().replace(/^"|"$/g, '') });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});